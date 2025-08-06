"use server"

import { prisma } from "@/lib/prisma"
import { createTransactionSchema, refundTransactionSchema, splitPaymentSchema } from "@/lib/validations/schemas"
import { revalidatePath } from "next/cache"
import { OrderStatus, TableStatus } from "@prisma/client"
import { auth } from "@/auth"
import type { Prisma } from "@prisma/client"

interface TransactionData {
  [key: string]: unknown // Add index signature for JSON compatibility
  id: string
  orderId: string
  totalAmount: number
  taxAmount: number
  discountAmount: number
  tipAmount: number
  paymentMethod: string
  cashReceived?: number
  changeGiven?: number
  processedAt: Date
  serverId: string
  tableNumber?: number
  items: Array<{
    name: string
    quantity: number
    price: number
    modifiers: string[]
    notes: string | null
  }>
  discount: {
    name: string
    type: string
    value: number
  } | null
}

export async function createTransaction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const data = {
      orderId: formData.get("orderId") as string,
      totalAmount: Number.parseFloat(formData.get("totalAmount") as string),
      taxAmount: Number.parseFloat(formData.get("taxAmount") as string) || 0,
      discountAmount: Number.parseFloat(formData.get("discountAmount") as string) || 0,
      paymentMethod: formData.get("paymentMethod") as string,
      tipAmount: formData.get("tipAmount") ? Number.parseFloat(formData.get("tipAmount") as string) : undefined,
      tipPercentage: formData.get("tipPercentage")
        ? Number.parseFloat(formData.get("tipPercentage") as string)
        : undefined,
      cashReceived: formData.get("cashReceived")
        ? Number.parseFloat(formData.get("cashReceived") as string)
        : undefined,
      changeGiven: formData.get("changeGiven") ? Number.parseFloat(formData.get("changeGiven") as string) : undefined,
    }

    const validatedData = createTransactionSchema.parse(data)

    const result = await prisma.$transaction(async (tx) => {
      // Get order details
      const order = await tx.order.findUnique({
        where: { id: validatedData.orderId },
        include: {
          orderItems: {
            include: {
              menuItem: {
                include: { product: true },
              },
              appliedModifiers: {
                include: { modifier: true },
              },
            },
          },
          discount: true,
          tableSession: {
            include: {
              table: true, // Include the table relation
            },
          },
        },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: validatedData.orderId,
          amount: validatedData.totalAmount,
          method: validatedData.paymentMethod,
          processedAt: new Date(),
        },
      })

      // Create tip record if provided
      let tip = null
      if (validatedData.tipAmount && validatedData.tipPercentage) {
        tip = await tx.tip.create({
          data: {
            orderId: validatedData.orderId,
            amount: validatedData.tipAmount,
            tipPercentage: validatedData.tipPercentage,
          },
        })
      }

      // Update order status
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: {
          status: OrderStatus.CLOSED,
          updatedAt: new Date(),
        },
      })

      // Update table session and status
      if (order.tableSession) {
        await tx.tableSession.update({
          where: { id: order.tableSession.id },
          data: { endTime: new Date() },
        })

        await tx.table.update({
          where: { id: order.tableSession.tableId },
          data: { status: TableStatus.BILL_PRINTED },
        })
      }

      // Generate transaction record for reporting with proper typing
      const transaction: TransactionData = {
        id: payment.id,
        orderId: order.id,
        totalAmount: validatedData.totalAmount,
        taxAmount: validatedData.taxAmount,
        discountAmount: validatedData.discountAmount,
        tipAmount: validatedData.tipAmount || 0,
        paymentMethod: validatedData.paymentMethod,
        cashReceived: validatedData.cashReceived,
        changeGiven: validatedData.changeGiven,
        processedAt: payment.processedAt,
        serverId: order.serverId,
        tableNumber: order.tableSession?.table?.tableNumber,
        items: order.orderItems.map((item) => ({
          name: item.menuItem.product.name,
          quantity: item.quantity,
          price: item.price.toNumber(),
          modifiers: item.appliedModifiers.map((am) => am.modifier.name),
          notes: item.notes,
        })),
        discount: order.discount
          ? {
              name: order.discount.name,
              type: order.discount.type,
              value: order.discount.value.toNumber(),
            }
          : null,
      }

      // Create audit log with proper JSON typing
      await tx.auditLog.create({
        data: {
          entityName: "Transaction",
          entityId: payment.id,
          action: "CREATE",
          newData: transaction as Prisma.InputJsonValue,
          userId: session.user.id,
        },
      })

      return { payment, tip, transaction, order }
    })

    revalidatePath("/pos")
    return { success: true, ...result }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { error: "Failed to process transaction" }
  }
}

export async function createSplitPayment(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const orderId = formData.get("orderId") as string
    const paymentsData = JSON.parse(formData.get("payments") as string)

    const data = {
      orderId,
      payments: paymentsData,
    }

    const validatedData = splitPaymentSchema.parse(data)

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validatedData.orderId },
        include: {
          tableSession: {
            include: {
              table: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      const payments = []
      const tips = []
      let totalPaid = 0

      // Create multiple payment records
      for (const paymentData of validatedData.payments) {
        const payment = await tx.payment.create({
          data: {
            orderId: validatedData.orderId,
            amount: paymentData.amount,
            method: paymentData.method,
            processedAt: new Date(),
          },
        })
        payments.push(payment)
        totalPaid += paymentData.amount

        // Create tip if provided
        if (paymentData.tipAmount) {
          const tip = await tx.tip.create({
            data: {
              orderId: validatedData.orderId,
              amount: paymentData.tipAmount,
              tipPercentage: (paymentData.tipAmount / paymentData.amount) * 100,
            },
          })
          tips.push(tip)
        }
      }

      // Verify total payment matches order total
      if (Math.abs(totalPaid - order.totalAmount.toNumber()) > 0.01) {
        throw new Error("Payment total does not match order total")
      }

      // Update order status
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: { status: OrderStatus.CLOSED },
      })

      // Update table session and status
      if (order.tableSession) {
        await tx.tableSession.update({
          where: { id: order.tableSession.id },
          data: { endTime: new Date() },
        })

        await tx.table.update({
          where: { id: order.tableSession.tableId },
          data: { status: TableStatus.BILL_PRINTED },
        })
      }

      return { payments, tips, order }
    })

    revalidatePath("/pos")
    return { success: true, ...result }
  } catch (error) {
    console.error("Error creating split payment:", error)
    return { error: "Failed to process split payment" }
  }
}

export async function refundTransaction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "MANAGER") {
      return { error: "Unauthorized - Manager access required" }
    }

    const data = {
      transactionId: formData.get("transactionId") as string,
      refundAmount: Number.parseFloat(formData.get("refundAmount") as string),
      reason: formData.get("reason") as string,
    }

    const validatedData = refundTransactionSchema.parse(data)

    const result = await prisma.$transaction(async (tx) => {
      // Find original payment
      const originalPayment = await tx.payment.findUnique({
        where: { id: validatedData.transactionId },
        include: { order: true },
      })

      if (!originalPayment) {
        throw new Error("Original transaction not found")
      }

      if (validatedData.refundAmount > originalPayment.amount.toNumber()) {
        throw new Error("Refund amount cannot exceed original payment")
      }

      // Create refund payment record (negative amount)
      const refundPayment = await tx.payment.create({
        data: {
          orderId: originalPayment.orderId,
          amount: -validatedData.refundAmount,
          method: `REFUND_${originalPayment.method}`,
          processedAt: new Date(),
        },
      })

      // Create audit log for refund with proper JSON typing
      const refundData = {
        originalTransactionId: validatedData.transactionId,
        refundAmount: validatedData.refundAmount,
        reason: validatedData.reason,
        processedBy: session.user.id,
      }

      await tx.auditLog.create({
        data: {
          entityName: "Refund",
          entityId: refundPayment.id,
          action: "CREATE",
          newData: refundData as Prisma.InputJsonValue,
          userId: session.user.id,
        },
      })

      return { refundPayment, originalPayment }
    })

    revalidatePath("/management")
    return { success: true, ...result }
  } catch (error) {
    console.error("Error processing refund:", error)
    return { error: "Failed to process refund" }
  }
}

export async function getTransactionHistory(restaurantId: string, startDate?: Date, endDate?: Date) {
  try {
    // Define proper where clause type
    const whereClause: Prisma.PaymentWhereInput = {
      order: { restaurantId },
    }

    if (startDate && endDate) {
      whereClause.processedAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    const transactions = await prisma.payment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            server: true,
            customer: true,
            orderItems: {
              include: {
                menuItem: {
                  include: { product: true },
                },
              },
            },
            tableSession: {
              include: { table: true },
            },
            tips: true,
            discount: true,
          },
        },
      },
      orderBy: { processedAt: "desc" },
    })

    return transactions
  } catch (error) {
    console.error("Error fetching transaction history:", error)
    return []
  }
}

export async function getDailySalesReport(restaurantId: string, date: Date) {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const transactions = await prisma.payment.findMany({
      where: {
        order: { restaurantId },
        processedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        amount: { gt: 0 }, // Exclude refunds
      },
      include: {
        order: {
          include: {
            tips: true,
            discount: true,
            server: true,
          },
        },
      },
    })

    const totalSales = transactions.reduce((sum, t) => sum + t.amount.toNumber(), 0)
    const totalTips = transactions.reduce(
      (sum, t) => sum + t.order.tips.reduce((tipSum, tip) => tipSum + tip.amount.toNumber(), 0),
      0,
    )
    const totalDiscounts = transactions.reduce(
      (sum, t) => sum + (t.order.discount ? t.order.discount.value.toNumber() : 0),
      0,
    )

    const paymentMethods = transactions.reduce(
      (acc, t) => {
        acc[t.method] = (acc[t.method] || 0) + t.amount.toNumber()
        return acc
      },
      {} as Record<string, number>,
    )

    const serverSales = transactions.reduce(
      (acc, t) => {
        const serverName = t.order.server.name || "Unknown"
        acc[serverName] = (acc[serverName] || 0) + t.amount.toNumber()
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      date,
      totalTransactions: transactions.length,
      totalSales,
      totalTips,
      totalDiscounts,
      grossRevenue: totalSales + totalTips,
      paymentMethods,
      serverSales,
      transactions,
    }
  } catch (error) {
    console.error("Error generating daily sales report:", error)
    return null
  }
}
