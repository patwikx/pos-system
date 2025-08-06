"use client"

import { Order, OrderItem, MenuItem, User, Table, PosTerminal } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatter } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Define a more detailed type for the order object prop
type OrderWithDetails = Order & {
    user: User | null;
    table: Table | null;
    terminal: PosTerminal | null;
    items: (OrderItem & {
        menuItem: MenuItem | null;
    })[];
}

interface OrderDetailsProps {
    order: OrderWithDetails | null;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order }) => {
    if (!order) {
        return <p>Order not found.</p>;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                    <CardDescription>Order ID: {order.id}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Server/Cashier</p>
                        <p className="text-muted-foreground">{order.user?.name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Table</p>
                        <p className="text-muted-foreground">{order.table?.name || 'Take-Out/Other'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">POS Terminal</p>
                        <p className="text-muted-foreground">{order.terminal?.name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Status</p>
                        <p><Badge variant="outline">{order.status}</Badge></p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Payment</p>
                        <p><Badge variant={order.isPaid ? "default" : "destructive"}>{order.isPaid ? "Paid" : "Unpaid"}</Badge></p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Items Ordered</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{item.menuItem?.name || 'Unknown Item'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {item.quantity} x {formatter.format(item.priceAtSale)}
                                    </p>
                                </div>
                                <p className="font-semibold">
                                    {formatter.format(item.quantity * item.priceAtSale)}
                                </p>
                            </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                            <span>Subtotal</span>
                            <span>{formatter.format(order.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Tax</span>
                            <span>{formatter.format(order.tax)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Discount</span>
                            <span>- {formatter.format(order.discountValue)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatter.format(order.totalAmount)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}