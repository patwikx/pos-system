"use server"

import auth from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateInventorySchema } from "@/lib/validations/schemas"
import { revalidatePath } from "next/cache"


export async function getInventoryItems(restaurantId: string) {
  try {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      include: {
        product: true,
      },
      orderBy: { product: { name: "asc" } },
    })

    return inventoryItems
  } catch (error) {
    console.error("Error fetching inventory items:", error)
    return []
  }
}

export async function updateInventoryItem(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "MANAGER") {
      return { error: "Unauthorized" }
    }

    const data = {
      inventoryItemId: formData.get("inventoryItemId") as string,
      currentStock: Number.parseInt(formData.get("currentStock") as string),
      minStockThreshold: Number.parseInt(formData.get("minStockThreshold") as string),
    }

    const validatedData = updateInventorySchema.parse(data)

    const oldItem = await prisma.inventoryItem.findUnique({
      where: { id: validatedData.inventoryItemId },
    })

    const inventoryItem = await prisma.inventoryItem.update({
      where: { id: validatedData.inventoryItemId },
      data: {
        currentStock: validatedData.currentStock,
        minStockThreshold: validatedData.minStockThreshold,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityName: "InventoryItem",
        entityId: inventoryItem.id,
        action: "UPDATE",
        oldData: oldItem,
        newData: inventoryItem,
        userId: session.user.id,
      },
    })

    revalidatePath("/management/inventory")
    return { success: true, inventoryItem }
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return { error: "Failed to update inventory item" }
  }
}

export async function getLowStockItems(restaurantId: string) {
  try {
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        restaurantId,
        currentStock: {
          lte: prisma.inventoryItem.fields.minStockThreshold,
        },
      },
      include: {
        product: true,
      },
      orderBy: { currentStock: "asc" },
    })

    return lowStockItems
  } catch (error) {
    console.error("Error fetching low stock items:", error)
    return []
  }
}
