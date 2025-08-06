import { PrismaClient, BusinessUnit, Roles, UoM, MenuItem, User, GlAccount, AccountType, InventoryLocation, PosTerminal, Table, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper functions remain the same
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomDateInPastYear = (): Date => {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - Math.floor(Math.random() * 365));
  return pastDate;
};

async function main() {
  console.log('🚀 Start seeding ...');

  // --- 1. CLEAN UP THE DATABASE ---
  console.log('🧹 Cleaning up existing data...');
  // Add new models to the cleanup list
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.orderItem.deleteMany();
  // ... (the rest of your cleanup list remains the same)
  await prisma.recipeItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shift.deleteMany();
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
  console.log('🌱 Seeding core data...');
  
  await prisma.roles.createMany({
    data: [ { role: 'Administrator' }, { role: 'Manager' }, { role: 'Cashier' } ],
  });
  const roles = await prisma.roles.findMany();

  await prisma.uoM.createMany({
    data: [ { name: 'Piece', symbol: 'pc' }, { name: 'Gram', symbol: 'g' } ],
  });
  const uoms = await prisma.uoM.findMany();
  
  await prisma.supplier.create({ data: { name: 'Global Food & Beverage Supplies' } });

  // --- NEW: Create Payment Methods ---
  await prisma.paymentMethod.createMany({
      data: [
          { name: 'Cash', isActive: true },
          { name: 'Credit Card', isActive: true },
          { name: 'GCash', isActive: true },
      ]
  });
  const paymentMethods = await prisma.paymentMethod.findMany();
  console.log(`💳 ${paymentMethods.length} payment methods created.`);

  // --- 3. CREATE BUSINESS UNITS & USERS ---
  const businessUnitNames = [ 'Dolores Tropicana Resort', 'Dolores Lake Resort', 'Anchor Hotel', 'Dolores Farm Resort' ];
  const businessUnits: BusinessUnit[] = [];
  for (const name of businessUnitNames) {
    businessUnits.push(await prisma.businessUnit.create({ data: { name } }));
  }
  console.log(`🏢 ${businessUnits.length} business units created.`);
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminRole = roles.find(r => r.role === 'Administrator')!;
  const superAdmin = await prisma.user.create({ data: { name: 'Super Admin', username: 'admin@dolores.com', password: hashedPassword, isActive: true } });
  for (const bu of businessUnits) {
    await prisma.userBusinessUnit.create({ data: { userId: superAdmin.id, businessUnitId: bu.id, roleId: adminRole.id } });
  }
  console.log(`👑 Super Admin created and assigned to all ${businessUnits.length} units.`);

  // --- 4. SEED DETAILED DATA FOR EACH BUSINESS UNIT ---
  for (const bu of businessUnits) {
    console.log(`\n--- 🏨 Seeding data for "${bu.name}" ---`);
    
    // Create Users & Assignments
    const managerRole = roles.find(r => r.role === 'Manager')!;
    const cashierRole = roles.find(r => r.role === 'Cashier')!;
    const manager = await prisma.user.create({ data: { name: `${bu.name} Manager`, username: `manager_${bu.id.slice(0, 4)}@dolores.com`, password: hashedPassword, isActive: true } });
    await prisma.userBusinessUnit.create({ data: { userId: manager.id, businessUnitId: bu.id, roleId: managerRole.id } });
    const cashier = await prisma.user.create({ data: { name: `${bu.name} Cashier`, username: `cashier_${bu.id.slice(0, 4)}@dolores.com`, password: hashedPassword, isActive: true } });
    await prisma.userBusinessUnit.create({ data: { userId: cashier.id, businessUnitId: bu.id, roleId: cashierRole.id } });
    
    // Create Infrastructure
    const terminal = await prisma.posTerminal.create({ data: { name: 'Main Counter', businessUnitId: bu.id } });
    const tables = await Promise.all([...Array(5)].map((_, i) => prisma.table.create({ data: { name: `Table ${i + 1}`, businessUnitId: bu.id } })));

    // Create Menu
    const pieceUom = uoms.find(u => u.name === 'Piece')!;
    const mainCoursesCat = await prisma.menuCategory.create({ data: { name: 'Main Courses', businessUnitId: bu.id } });
    const burger = await prisma.menuItem.create({ data: { name: 'Classic Burger', price: 250, categoryId: mainCoursesCat.id, businessUnitId: bu.id } });
    const menuItemsForBU = [burger];

    // --- 5. SIMULATE ORDERS WITH THE NEW PAYMENT STRUCTURE ---
    const orderCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < orderCount; i++) {
      const subTotal = burger.price;
      const tax = subTotal * 0.12;
      const totalAmount = subTotal + tax;
      
      const shift = await prisma.shift.create({
        data: { businessUnitId: bu.id, userId: cashier.id, terminalId: terminal.id, startingCash: 5000 }
      });

      // --- REFACTORED: Create Order with associated Payment record ---
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
          amountPaid: totalAmount, // The amount paid matches the total
          items: { 
            create: [{ 
                menuItemId: burger.id, 
                quantity: 1, 
                priceAtSale: burger.price 
            }] 
          },
          // Create a corresponding Payment record for this Order
          payments: {
            create: {
                amount: totalAmount,
                paymentMethodId: getRandomItem(paymentMethods).id, // Link to a random payment method
                processedByUserId: cashier.id,
                shiftId: shift.id,
            }
          }
        }
      });
    }
    console.log(`  - 💰 Simulated ${orderCount} random paid orders with payment records.`);
  }

  console.log('\n✅ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });