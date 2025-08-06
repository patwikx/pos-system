"use server"

import auth from "@/auth"
import { prisma } from "@/lib/prisma"
import { createMenuItemSchema } from "@/lib/validations/schemas"
import { revalidatePath } from "next/cache"


export async function getMenuCategories(restaurantId: string) {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        menuItems: {
          include: {
            product: true,
            modifierGroups: {
              include: { modifiers: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return categories
  } catch (error) {
    console.error("Error fetching menu categories:", error)
    return []
  }
}

export async function getMenuItems(restaurantId: string) {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        product: { restaurantId },
      },
      include: {
        product: true,
        category: true,
        modifierGroups: {
          include: { modifiers: true },
        },
      },
      orderBy: { product: { name: "asc" } },
    })

    return menuItems
  } catch (error) {
    console.error("Error fetching menu items:", error)
    return []
  }
}

export async function createMenuItem(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "MANAGER") {
      return { error: "Unauthorized" }
    }

    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      price: Number.parseFloat(formData.get("price") as string),
      categoryId: formData.get("categoryId") as string,
      restaurantId: formData.get("restaurantId") as string,
      modifierGroupIds: formData.getAll("modifierGroupIds") as string[],
    }

    const validatedData = createMenuItemSchema.parse(data)

    const result = await prisma.$transaction(async (tx) => {
      // Create product first
      const product = await tx.product.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          basePrice: validatedData.price,
          restaurantId: validatedData.restaurantId,
        },
      })

      // Create menu item
      const menuItem = await tx.menuItem.create({
        data: {
          price: validatedData.price,
          productId: product.id,
          categoryId: validatedData.categoryId,
        },
      })

      // Connect modifier groups if provided
      if (validatedData.modifierGroupIds && validatedData.modifierGroupIds.length > 0) {
        await tx.menuItem.update({
          where: { id: menuItem.id },
          data: {
            modifierGroups: {
              connect: validatedData.modifierGroupIds.map((id) => ({ id })),
            },
          },
        })
      }

      return { product, menuItem }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityName: "MenuItem",
        entityId: result.menuItem.id,
        action: "CREATE",
        newData: result,
        userId: session.user.id,
      },
    })

    revalidatePath("/management/menu")
    return { success: true, menuItem: result.menuItem }
  } catch (error) {
    console.error("Error creating menu item:", error)
    return { error: "Failed to create menu item" }
  }
}

export async function getModifierGroups(restaurantId: string) {
  try {
    const modifierGroups = await prisma.modifierGroup.findMany({
      include: {
        modifiers: true,
        menuItems: {
          include: {
            product: {
              where: { restaurantId },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return modifierGroups.filter((group) => group.menuItems.some((item) => item.product?.restaurantId === restaurantId))
  } catch (error) {
    console.error("Error fetching modifier groups:", error)
    return []
  }
}

export async function getDiscounts() {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { name: "asc" },
    })

    return discounts
  } catch (error) {
    console.error("Error fetching discounts:", error)
    return []
  }
}
