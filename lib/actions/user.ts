"use server"

import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/schemas"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"
import type { Role } from "@prisma/client" // Import Role type

export async function createUser(formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as Role, // Fixed role type casting
      restaurantId: formData.get("restaurantId") as string,
    }

    const validatedData = createUserSchema.parse(data)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { error: "User with this email already exists" }
    }

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        passwordHash: await hash("defaultpassword", 12),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityName: "User",
        entityId: user.id,
        action: "CREATE",
        newData: user,
      },
    })

    revalidatePath("/management/users")
    return { success: true, user }
  } catch (error) {
    console.error("Error creating user:", error)
    return { error: "Failed to create user" }
  }
}

export async function getUsers(restaurantId: string) {
  try {
    const users = await prisma.user.findMany({
      where: { restaurantId },
      include: { restaurant: true },
    })

    return users
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}
