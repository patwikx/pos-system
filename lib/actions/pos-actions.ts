"use server";

import { revalidatePath } from "next/cache";
import prismadb from "@/lib/db";
import { OrderWithDetails } from "@/app/(dashboard)/[businessUnitId]/(routes)/pos/components/order-cart";
import { auth } from "@/auth";

export async function createOrUpdateOrder(orderData: OrderWithDetails) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new Error("Unauthenticated");
        }

        // Use a transaction to ensure all operations succeed or fail together
        const savedOrder = await prismadb.$transaction(async (tx) => {
            // If the ID is temporary, it's a new order
            if (orderData.id.startsWith('temp_')) {
                // Create the Order
                const newOrder = await tx.order.create({
                    data: {
                        businessUnitId: orderData.businessUnitId,
                        tableId: orderData.tableId === 'walk-in' ? null : orderData.tableId,
                        userId: orderData.userId,
                        terminalId: orderData.terminalId,
                        status: orderData.status,
                        orderType: orderData.orderType,
                        subTotal: orderData.subTotal,
                        discountValue: orderData.discountValue,
                        tax: orderData.tax,
                        totalAmount: orderData.totalAmount,
                        shiftId: orderData.shiftId,
                        // Create the OrderItems at the same time
                        items: {
                            create: orderData.items.map(item => ({
                                menuItemId: item.menuItemId,
                                quantity: item.quantity,
                                priceAtSale: item.priceAtSale,
                                notes: item.notes,
                                kdsStatus: item.kdsStatus,
                                // Connect modifiers if they exist
                                modifiers: {
                                    connect: item.modifiers.map(m => ({ id: m.id }))
                                }
                            }))
                        }
                    },
                    // Include all the details we need to send back to the client
                    include: {
                        items: { include: { menuItem: true, modifiers: true, voidedByUser: true } },
                        user: true, table: true, discount: true, businessPartner: true,
                        payments: true, shift: { include: { user: true, terminal: true } }, 
                      
                    }
                });

                // If it's not a walk-in, update the table status
                if (newOrder.tableId) {
                    await tx.table.update({
                        where: { id: newOrder.tableId },
                        data: { status: 'OCCUPIED' }
                    });
                }
                return newOrder;
            } else {
                // This is an existing order, so we update it
                const updatedOrder = await tx.order.update({
                    where: { id: orderData.id },
                    data: {
                        status: orderData.status,
                        // You can add more fields to update here as needed
                    },
                    include: {
                        items: { include: { menuItem: true, modifiers: true, voidedByUser: true } },
                        user: true, table: true, discount: true, businessPartner: true,
                        payments: true, shift: { include: { user: true, terminal: true } },
                       
                    }
                });
                return updatedOrder;
            }
        });

        // Revalidate the path to ensure the UI shows the latest data
        revalidatePath(`/${orderData.businessUnitId}/pos`);

        // Return the saved order (with its real database ID) to the client
        return { success: true, order: savedOrder };

    } catch (error) {
        console.error("Failed to save order:", error);
        return { error: "Failed to save the order. Please try again." };
    }
}