import { PrismaClient, Role, OrderStatus, TableStatus, DiscountType, OrderItemStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // This is a good practice to ensure a clean slate for each run
  // NOTE: Be careful running this in a production environment!
  await prisma.auditLog.deleteMany();
  await prisma.scheduleShift.deleteMany();
  await prisma.voidedTransaction.deleteMany();
  await prisma.tip.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appliedModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.order.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  console.log('Seeding database with production-like data...');

  // --- 1. Create Restaurant and Users ---
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Tropicana Flagship Store',
      address: '123 Main St, Anytown, USA',
      contactNumber: '555-123-4567',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@tropicana.com',
      name: 'Jane Manager',
      role: Role.MANAGER,
      restaurantId: restaurant.id,
    },
  });

  const serverUser = await prisma.user.create({
    data: {
      email: 'server@tropicana.com',
      name: 'John Server',
      role: Role.SERVER,
      restaurantId: restaurant.id,
    },
  });

  const hostUser = await prisma.user.create({
    data: {
      email: 'host@tropicana.com',
      name: 'Sarah Host',
      role: Role.HOST,
      restaurantId: restaurant.id,
    },
  });

  console.log('Created restaurant and users.');

  // --- 2. Create Tables ---
  const tables = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.table.create({
        data: {
          tableNumber: i + 1,
          capacity: i < 5 ? 4 : 6,
          status: TableStatus.OPEN,
          restaurantId: restaurant.id,
        },
      })
    )
  );
  const tableOne = tables[0];
  const tableTwo = tables[1];
  const tableThree = tables[2];

  console.log('Created tables.');

  // --- 3. Create Menu Categories, Products, and Menu Items ---
  const appetizersCategory = await prisma.menuCategory.create({
    data: {
      name: 'Appetizers',
      restaurantId: restaurant.id,
    },
  });

  const entreesCategory = await prisma.menuCategory.create({
    data: {
      name: 'Entrees',
      restaurantId: restaurant.id,
    },
  });

  const calamariProduct = await prisma.product.create({
    data: {
      name: 'Fried Calamari',
      description: 'Served with spicy marinara sauce.',
      basePrice: new Decimal(12.50),
      restaurantId: restaurant.id,
    },
  });

  const steakFritesProduct = await prisma.product.create({
    data: {
      name: 'Steak Frites',
      description: '10oz New York Strip steak with truffle fries.',
      basePrice: new Decimal(25.00),
      restaurantId: restaurant.id,
    },
  });

  const chickenParmProduct = await prisma.product.create({
    data: {
      name: 'Chicken Parmesan',
      description: 'Breaded chicken breast with fresh mozzarella and linguine.',
      basePrice: new Decimal(18.00),
      restaurantId: restaurant.id,
    },
  });

  const calamariMenuItem = await prisma.menuItem.create({
    data: {
      price: new Decimal(12.50),
      productId: calamariProduct.id,
      categoryId: appetizersCategory.id,
    },
  });

  const steakFritesMenuItem = await prisma.menuItem.create({
    data: {
      price: new Decimal(25.00),
      productId: steakFritesProduct.id,
      categoryId: entreesCategory.id,
    },
  });
  
  const chickenParmMenuItem = await prisma.menuItem.create({
    data: {
      price: new Decimal(18.00),
      productId: chickenParmProduct.id,
      categoryId: entreesCategory.id,
    },
  });

  console.log('Created menu items.');

  // --- 4. Create Modifiers and Modifier Groups ---
  const sauceModifierGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Sauces',
      menuItems: { connect: { id: calamariMenuItem.id } },
      modifiers: {
        create: [
          { name: 'Marinara', priceAdjustment: new Decimal(0.00) },
          { name: 'Spicy Aioli', priceAdjustment: new Decimal(0.50) },
        ],
      },
    },
  });
  const spicyAioliModifier = await prisma.modifier.findFirst({ where: { name: 'Spicy Aioli' } });

  const tempModifierGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Cooking Temperature',
      isForced: true,
      menuItems: { connect: { id: steakFritesMenuItem.id } },
      modifiers: {
        create: [
          { name: 'Rare', priceAdjustment: new Decimal(0) },
          { name: 'Medium Rare', priceAdjustment: new Decimal(0) },
          { name: 'Medium', priceAdjustment: new Decimal(0) },
          { name: 'Well Done', priceAdjustment: new Decimal(0) },
        ],
      },
    },
  });
  const rareModifier = await prisma.modifier.findFirst({ where: { name: 'Rare' } });

  console.log('Created modifiers.');

  // --- 5. Create Inventory Items ---
  await prisma.inventoryItem.create({
    data: {
      currentStock: 100,
      minStockThreshold: 20,
      restaurantId: restaurant.id,
      productId: calamariProduct.id,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      currentStock: 50,
      minStockThreshold: 10,
      restaurantId: restaurant.id,
      productId: steakFritesProduct.id,
    },
  });

  console.log('Created inventory.');

  // --- 6. Create a complex order flow ---
  let loyaltyOrder; // Declare the variable in the outer scope
  if (tableOne && calamariMenuItem && spicyAioliModifier && steakFritesMenuItem && rareModifier) {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Loyalty',
        lastName: 'Customer',
        email: 'loyalty@example.com',
      },
    });

    // Order for loyalty customer at table one
    loyaltyOrder = await prisma.order.create({ // Assign to the outer scope variable
      data: {
        status: OrderStatus.PENDING,
        serverId: serverUser.id,
        restaurantId: restaurant.id,
        customerId: customer.id,
        tableSession: { create: { tableId: tableOne.id } },
        orderItems: {
          create: [
            {
              quantity: 2,
              price: steakFritesMenuItem.price,
              menuItemId: steakFritesMenuItem.id,
              notes: 'No salt on the fries.',
              appliedModifiers: { create: { modifierId: rareModifier.id } },
            },
            {
              quantity: 1,
              price: calamariMenuItem.price,
              menuItemId: calamariMenuItem.id,
              appliedModifiers: { create: { modifierId: spicyAioliModifier.id } },
            },
          ],
        },
      },
      include: {
        orderItems: {
          include: {
            appliedModifiers: true,
          },
        },
      },
    });

    // Simulate sending to kitchen
    await prisma.order.update({
      where: { id: loyaltyOrder.id },
      data: {
        status: OrderStatus.SENT_TO_KITCHEN,
      },
    });

    // Simulate item status updates
    await prisma.orderItem.update({
      where: { id: loyaltyOrder.orderItems[0].id },
      data: { status: OrderItemStatus.PREPARING },
    });

    await prisma.orderItem.update({
      where: { id: loyaltyOrder.orderItems[1].id },
      data: { status: OrderItemStatus.READY },
    });

    // Add a discount
    const happyHourDiscount = await prisma.discount.create({
      data: {
        name: 'Happy Hour Discount',
        type: DiscountType.PERCENTAGE,
        value: new Decimal(0.15),
      },
    });

    const orderWithDiscount = await prisma.order.update({
      where: { id: loyaltyOrder.id },
      data: {
        discountId: happyHourDiscount.id,
        totalAmount: new Decimal(50.00), // Manually calculate for a clean example
        status: OrderStatus.CLOSED,
      },
    });

    await prisma.payment.create({
      data: {
        amount: orderWithDiscount.totalAmount,
        method: 'Credit Card',
        orderId: orderWithDiscount.id,
      },
    });
    
    await prisma.tip.create({
        data: {
            amount: new Decimal(8.00),
            tipPercentage: new Decimal(0.16),
            orderId: orderWithDiscount.id,
        }
    });

    console.log('Created a complete order flow with discounts and payments.');
  }

  // --- 7. Create an order that gets voided ---
  if (tableTwo) {
    const orderToVoid = await prisma.order.create({
      data: {
        status: OrderStatus.CLOSED,
        serverId: serverUser.id,
        restaurantId: restaurant.id,
        totalAmount: new Decimal(45.00),
        tableSession: { create: { tableId: tableTwo.id } },
      },
    });

    await prisma.payment.create({
      data: {
        amount: new Decimal(45.00),
        method: 'Cash',
        orderId: orderToVoid.id,
      },
    });

    await prisma.voidedTransaction.create({
      data: {
        reason: 'Customer requested a full refund due to dissatisfaction with service.',
        orderId: orderToVoid.id,
        voidedById: managerUser.id,
      },
    });

    console.log('Created and voided a sample transaction.');
  }

  // --- 8. Create a few other sample records ---
  if (tableThree) {
    // Another order that's still pending
    await prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        serverId: serverUser.id,
        restaurantId: restaurant.id,
        tableSession: { create: { tableId: tableThree.id } },
        orderItems: {
          create: {
            quantity: 3,
            price: chickenParmMenuItem.price,
            menuItemId: chickenParmMenuItem.id,
          },
        },
      },
    });
  }
  
  // A schedule shift for the server
  await prisma.scheduleShift.create({
    data: {
      startTime: new Date('2025-08-05T17:00:00Z'),
      endTime: new Date('2025-08-05T23:00:00Z'),
      userId: serverUser.id,
      restaurantId: restaurant.id,
    },
  });

  // An audit log for a critical change
  // Now, loyaltyOrder is accessible here because it was declared in a higher scope.
  if (loyaltyOrder) {
    await prisma.auditLog.create({
      data: {
        entityName: 'Order',
        entityId: loyaltyOrder.id,
        action: 'UPDATE',
        oldData: { status: OrderStatus.PENDING },
        newData: { status: OrderStatus.SENT_TO_KITCHEN },
        userId: serverUser.id,
      },
    });
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });