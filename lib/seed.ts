// prisma/seed.ts (Updated for Schema Change & Large Data Volume)

import { PrismaClient, BusinessUnit, Roles, UoM, MenuItem, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to get a random item from an array
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper function to generate a random date in the past year
const getRandomDateInPastYear = (): Date => {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - Math.floor(Math.random() * 365));
  return pastDate;
};

async function main() {
  console.log('Start seeding ...');

  // --- 1. CLEAN UP THE DATABASE ---
  console.log('Cleaning up existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.table.deleteMany();
  await prisma.posTerminal.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.userBusinessUnit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.businessUnit.deleteMany();
  await prisma.roles.deleteMany();
  await prisma.uoM.deleteMany();
  await prisma.supplier.deleteMany();
  
  // --- 2. CREATE INDEPENDENT & CORE DATA ---
  
  await prisma.roles.createMany({
    data: [
      { role: 'Administrator' }, { role: 'Manager' },
      { role: 'Cashier' }, { role: 'Server' }, { role: 'Kitchen Staff' },
    ],
  });
  const roles = await prisma.roles.findMany();
  console.log(`${roles.length} roles created.`);

  await prisma.uoM.createMany({
    data: [{ name: 'Piece', symbol: 'pc' }, { name: 'Gram', symbol: 'g' }],
  });
  const uoms = await prisma.uoM.findMany();
  console.log(`${uoms.length} UoMs created.`);
  
  await prisma.supplier.create({ data: { name: 'General Food Supplies Co.' } });
  console.log(`Supplier created.`);

  // --- 3. CREATE BUSINESS UNITS ---
  const businessUnitNames = [
    'Dolores Tropicana Resort', 'Dolores Lake Resort',
    'Anchor Hotel', 'Dolores Farm Resort',
  ];
  const businessUnits: BusinessUnit[] = [];
  for (const name of businessUnitNames) {
    businessUnits.push(await prisma.businessUnit.create({ data: { name } }));
  }
  console.log(`${businessUnits.length} business units created.`);
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  // --- 4. CREATE USERS AND ASSIGNMENTS ---
  const adminRole = roles.find(r => r.role === 'Administrator')!;
  const superAdmin = await prisma.user.create({
    data: { name: 'Super Admin', username: 'admin@dolores.com', password: hashedPassword, isActive: true }
  });
  for (const bu of businessUnits) {
    await prisma.userBusinessUnit.create({
      data: { userId: superAdmin.id, businessUnitId: bu.id, roleId: adminRole.id }
    });
  }
  console.log(`Super Admin created and assigned to all ${businessUnits.length} units.`);

  // --- 5. CREATE DATA FOR EACH BUSINESS UNIT ---
  for (const bu of businessUnits) {
    console.log(`Seeding data for "${bu.name}"...`);
    
    // Create Manager and Cashier for this BU
    const managerRole = roles.find(r => r.role === 'Manager')!;
    const cashierRole = roles.find(r => r.role === 'Cashier')!;
    const manager = await prisma.user.create({ data: { name: `${bu.name} Manager`, username: `manager_${bu.id.slice(0, 4)}@dolores.com`, password: hashedPassword, isActive: true } });
    await prisma.userBusinessUnit.create({ data: { userId: manager.id, businessUnitId: bu.id, roleId: managerRole.id } });
    const cashier = await prisma.user.create({ data: { name: `${bu.name} Cashier`, username: `cashier_${bu.id.slice(0, 4)}@dolores.com`, password: hashedPassword, isActive: true } });
    await prisma.userBusinessUnit.create({ data: { userId: cashier.id, businessUnitId: bu.id, roleId: cashierRole.id } });
    console.log(`  - Created Manager and Cashier.`);

    // Create Infrastructure
    const terminal = await prisma.posTerminal.create({ data: { name: 'Main Counter', businessUnitId: bu.id } });
    const tables = [];
    for (let i = 1; i <= 5; i++) {
        tables.push(await prisma.table.create({ data: { name: `Table ${i}`, businessUnitId: bu.id } }));
    }

    // Create a more diverse menu
    const pieceUom = uoms.find(u => u.name === 'Piece')!;
    const mainCoursesCat = await prisma.menuCategory.create({ data: { name: 'Main Courses', businessUnitId: bu.id } });
    const drinksCat = await prisma.menuCategory.create({ data: { name: 'Drinks', businessUnitId: bu.id } });
    const sidesCat = await prisma.menuCategory.create({ data: { name: 'Sides', businessUnitId: bu.id } });

    const burgerPatty = await prisma.inventoryItem.create({ data: { name: 'Beef Patty', uomId: pieceUom.id, businessUnitId: bu.id } });
    const fries = await prisma.inventoryItem.create({ data: { name: 'Fries Portion', uomId: pieceUom.id, businessUnitId: bu.id } });
    const soda = await prisma.inventoryItem.create({ data: { name: 'Soda Can', uomId: pieceUom.id, businessUnitId: bu.id } });
    await prisma.inventoryStock.createMany({
        data: [
            { inventoryItemId: burgerPatty.id, businessUnitId: bu.id, quantityOnHand: 500 },
            { inventoryItemId: fries.id, businessUnitId: bu.id, quantityOnHand: 300 },
            { inventoryItemId: soda.id, businessUnitId: bu.id, quantityOnHand: 1000 },
        ]
    });
    
    // CORRECTED: Added `businessUnitId` to MenuItem creation
    const burger = await prisma.menuItem.create({ data: { name: 'Classic Burger', price: 250, categoryId: mainCoursesCat.id, businessUnitId: bu.id } });
    const friesItem = await prisma.menuItem.create({ data: { name: 'French Fries', price: 120, categoryId: sidesCat.id, businessUnitId: bu.id } });
    const coke = await prisma.menuItem.create({ data: { name: 'Coke', price: 80, categoryId: drinksCat.id, businessUnitId: bu.id } });
    const menuItemsForBU = [burger, friesItem, coke];
    console.log(`  - Created menu with ${menuItemsForBU.length} items.`);

    // --- 6. GENERATE A LARGE NUMBER OF RANDOM ORDERS FOR THIS BU ---
    const orderCount = 30 + Math.floor(Math.random() * 20); // 30-50 orders per BU
    for (let i = 0; i < orderCount; i++) {
      const orderItemsToCreate = [];
      let subTotal = 0;
      const itemCount = 1 + Math.floor(Math.random() * 3); // 1-3 items per order

      for (let j = 0; j < itemCount; j++) {
        const randomMenuItem = getRandomItem(menuItemsForBU);
        orderItemsToCreate.push({
          menuItemId: randomMenuItem.id,
          quantity: 1,
          priceAtSale: randomMenuItem.price,
        });
        subTotal += randomMenuItem.price;
      }

      const tax = subTotal * 0.12;
      const totalAmount = subTotal + tax;

      await prisma.order.create({
        data: {
          businessUnitId: bu.id,
          userId: cashier.id,
          terminalId: terminal.id,
          tableId: getRandomItem(tables).id,
          isPaid: true,
          status: 'PAID',
          createdAt: getRandomDateInPastYear(),
          subTotal,
          tax,
          totalAmount,
          items: { create: orderItemsToCreate }
        }
      });
    }
    console.log(`  - Created ${orderCount} random paid orders.`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });