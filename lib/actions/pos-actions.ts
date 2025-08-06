"use server"

import { prisma } from "@/lib/prisma"
import {
  createOrderSchema,
  addOrderItemSchema,
  updateOrderItemStatusSchema,
  processPaymentSchema,
} from "@/lib/validations/schemas"
import { revalidatePath } from "next/cache"

import { OrderStatus, TableStatus, OrderItemStatus } from "@prisma/client"
import auth from "@/auth"

export async function getTables(restaurantId: string) {
  try {
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      include: {
        tableSessions: {
          where: { endTime: null },
          include: {
            order: {
              include: {
                server: true,
                orderItems: {
                  include: {
                    menuItem: {
                      include: { product: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { tableNumber: "asc" },
    })

    return tables
  } catch (error) {
    console.error("Error fetching tables:", error)
    return []
  }
}

export async function createOrder(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const data = {
      tableId: formData.get("tableId") as string,
      customerId: (formData.get("customerId") as string) || undefined,
      restaurantId: formData.get("restaurantId") as string,
    }

    const validatedData = createOrderSchema.parse(data)

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          restaurantId: validatedData.restaurantId,
          serverId: session.user.id,
          customerId: validatedData.customerId,
          status: OrderStatus.PENDING,
        },
      })

      // Create table session
      await tx.tableSession.create({
        data: {
          tableId: validatedData.tableId,
          orderId: order.id,
        },
      })

      // Update table status
      await tx.table.update({
        where: { id: validatedData.tableId },
        data: { status: TableStatus.OCCUPIED },
      })

      return order
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityName: "Order",
        entityId: result.id,
        action: "CREATE",
        newData: result,
        userId: session.user.id,
      },
    })

    revalidatePath("/pos")
    return { success: true, order: result }
  } catch (error) {
    console.error("Error creating order:", error)
    return { error: "Failed to create order" }
  }
}

export async function addOrderItem(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const data = {
      orderId: formData.get("orderId") as string,
      menuItemId: formData.get("menuItemId") as string,
      quantity: Number.parseInt(formData.get("quantity") as string),
      notes: (formData.get("notes") as string) || undefined,
      modifierIds: formData.getAll("modifierIds") as string[],
    }

    const validatedData = addOrderItemSchema.parse(data)

    // Get menu item with price
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: validatedData.menuItemId },
      include: {
        modifierGroups: {
          include: { modifiers: true },
        },
      },
    })

    if (!menuItem) {
      return { error: "Menu item not found" }
    }

    // Calculate price with modifiers
    let totalPrice = menuItem.price
    if (validatedData.modifierIds) {
      const modifiers = await prisma.modifier.findMany({
        where: { id: { in: validatedData.modifierIds } },
      })
      totalPrice = modifiers.reduce((sum, mod) => sum + mod.priceAdjustment, totalPrice)
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create order item
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: validatedData.orderId,
          menuItemId: validatedData.menuItemId,
          quantity: validatedData.quantity,
          price: totalPrice,
          notes: validatedData.notes,
          status: OrderItemStatus.RECEIVED,
        },
      })

      // Add applied modifiers
      if (validatedData.modifierIds && validatedData.modifierIds.length > 0) {
        await tx.appliedModifier.createMany({
          data: validatedData.modifierIds.map((modifierId) => ({
            orderItemId: orderItem.id,
            modifierId,
          })),
        })
      }

      // Update order total
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: validatedData.orderId },
      })

      const newTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      await tx.order.update({
        where: { id: validatedData.orderId },
        data: { totalAmount: newTotal },
      })

      return orderItem
    })

    revalidatePath("/pos")
    return { success: true, orderItem: result }
  } catch (error) {
    console.error("Error adding order item:", error)
    return { error: "Failed to add order item" }
  }
}

export async function updateOrderItemStatus(formData: FormData) {
  try {
    const data = {
      orderItemId: formData.get("orderItemId") as string,
      status: formData.get("status") as OrderItemStatus,
    }

    const validatedData = updateOrderItemStatusSchema.parse(data)

    const orderItem = await prisma.orderItem.update({
      where: { id: validatedData.orderItemId },
      data: { status: validatedData.status },
    })

    revalidatePath("/kds/kitchen-display")
    return { success: true, orderItem }
  } catch (error) {
    console.error("Error updating order item status:", error)
    return { error: "Failed to update order item status" }
  }
}

export async function sendOrderToKitchen(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    await prisma.$transaction(async (tx) => {
      // Update all order items to SENT_TO_KITCHEN
      await tx.orderItem.updateMany({
        where: {
          orderId,
          status: OrderItemStatus.RECEIVED,
        },
        data: { status: OrderItemStatus.PREPARING },
      })

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SENT_TO_KITCHEN },
      })
    })

    revalidatePath("/pos")
    revalidatePath("/kds/kitchen-display")
    return { success: true }
  } catch (error) {
    console.error("Error sending order to kitchen:", error)
    return { error: "Failed to send order to kitchen" }
  }
}

export async function processPayment(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const data = {
      orderId: formData.get("orderId") as string,
      amount: Number.parseFloat(formData.get("amount") as string),
      method: formData.get("method") as string,
      tipAmount: formData.get("tipAmount") ? Number.parseFloat(formData.get("tipAmount") as string) : undefined,
      tipPercentage: formData.get("tipPercentage")
        ? Number.parseFloat(formData.get("tipPercentage") as string)
        : undefined,
    }

    const validatedData = processPaymentSchema.parse(data)

    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: validatedData.orderId,
          amount: validatedData.amount,
          method: validatedData.method,
        },
      })

      // Create tip record if provided
      if (validatedData.tipAmount && validatedData.tipPercentage) {
        await tx.tip.create({
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
        data: { status: OrderStatus.CLOSED },
      })

      // Get table session and update table status
      const tableSession = await tx.tableSession.findUnique({
        where: { orderId: validatedData.orderId },
      })

      if (tableSession) {
        await tx.tableSession.update({
          where: { id: tableSession.id },
          data: { endTime: new Date() },
        })

        await tx.table.update({
          where: { id: tableSession.tableId },
          data: { status: TableStatus.CLEANING },
        })
      }

      return payment
    })

    revalidatePath("/pos")
    return { success: true, payment: result }
  } catch (error) {
    console.error("Error processing payment:", error)
    return { error: "Failed to process payment" }
  }
}

export async function getOrdersByStatus(restaurantId: string, status?: OrderStatus) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status }),
      },
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
        server: true,
        customer: true,
        discount: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return orders
  } catch (error) {
    console.error("Error fetching orders:", error)
    return []
  }
}

export async function getKitchenDisplayItems(restaurantId: string) {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          restaurantId,
          status: { in: [OrderStatus.SENT_TO_KITCHEN] },
        },
        status: { in: [OrderItemStatus.PREPARING, OrderItemStatus.READY] },
      },
      include: {
        menuItem: {
          include: { product: true },
        },
        appliedModifiers: {
          include: { modifier: true },
        },
        order: {
          include: {
            tableSession: {
              include: { table: true },
            },
          },
        },
      },
      orderBy: { order: { createdAt: "asc" } },
    })

    return orderItems
  } catch (error) {
    console.error("Error fetching kitchen display items:", error)
    return []
  }
}
