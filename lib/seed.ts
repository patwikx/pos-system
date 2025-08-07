import { PrismaClient, BusinessUnit, Roles, UoM, GlAccount, AccountType, InventoryLocation, BusinessPartner, User, DocumentType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper functions
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomDateInPast = (days: number): Date => {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - Math.floor(Math.random() * days));
  return pastDate;
};
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
}

async function main() {
  console.log('🚀 Start seeding ...');

  // --- 1. CLEAN UP THE DATABASE ---
  console.log('🧹 Cleaning up existing data in the correct order...');
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.aPInvoiceItem.deleteMany();
  await prisma.aPInvoice.deleteMany();
  await prisma.aRInvoiceItem.deleteMany();
  await prisma.aRInvoice.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.salesQuotationItem.deleteMany();
  await prisma.salesQuotation.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.receivingItem.deleteMany();
  await prisma.receiving.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.purchaseRequestItem.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.numberingSeries.deleteMany();
  await prisma.businessPartner.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.glAccount.deleteMany();
  await prisma.accountType.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryLocation.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.userBusinessUnit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.roles.deleteMany();
  await prisma.businessUnit.deleteMany();
  await prisma.uoM.deleteMany();
  
  // --- 2. CREATE INDEPENDENT & CORE DATA ---
  console.log('🌱 Seeding core data...');
  
  const accountTypes = await prisma.accountType.createManyAndReturn({
    data: [ { name: 'ASSET' }, { name: 'LIABILITY' }, { name: 'EQUITY' }, { name: 'REVENUE' }, { name: 'EXPENSE' } ],
  });

  const roles = await prisma.roles.createManyAndReturn({
    data: [ { role: 'Administrator' }, { role: 'Manager' }, { role: 'Sales' }, { role: 'Purchasing' } ],
  });

  const uoms = await prisma.uoM.createManyAndReturn({
    data: [ { name: 'Piece', symbol: 'pc' }, { name: 'Box', symbol: 'box' }, { name: 'Kilogram', symbol: 'kg' } ],
  });
  
  // --- 3. CREATE BUSINESS UNITS & USERS ---
  const businessUnitNames = [ 'Dolores Tropicana Resort', 'Dolores Lake Resort' ];
  const businessUnits: BusinessUnit[] = [];
  for (const name of businessUnitNames) {
    businessUnits.push(await prisma.businessUnit.create({ data: { name } }));
  }
  console.log(`🏢 ${businessUnits.length} business units created.`);
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminRole = roles.find(r => r.role === 'Administrator')!;
  const superAdmin = await prisma.user.create({ data: { name: 'Super Admin', username: 'admin', password: hashedPassword, isActive: true } });
  for (const bu of businessUnits) {
    await prisma.userBusinessUnit.create({ data: { userId: superAdmin.id, businessUnitId: bu.id, roleId: adminRole.id } });
  }
  console.log(`👑 Super Admin created and assigned to all units.`);

  // --- 4. SEED DETAILED DATA FOR EACH BUSINESS UNIT ---
  for (const bu of businessUnits) {
    console.log(`\n--- 🏨 Seeding data for "${bu.name}" ---`);
    
    // Users
    const salesUser = await prisma.user.create({ data: { name: `${bu.name} Sales`, username: `sales_${bu.id.slice(0,4)}`, password: hashedPassword, isActive: true } });
    const purchasingUser = await prisma.user.create({ data: { name: `${bu.name} Purchasing`, username: `purchasing_${bu.id.slice(0,4)}`, password: hashedPassword, isActive: true } });
    await prisma.userBusinessUnit.createMany({ data: [
        { userId: salesUser.id, businessUnitId: bu.id, roleId: roles.find(r=>r.role==='Sales')!.id },
        { userId: purchasingUser.id, businessUnitId: bu.id, roleId: roles.find(r=>r.role==='Purchasing')!.id }
    ]});

    // Document Numbering
    for (const docType of Object.values(DocumentType)) {
        await prisma.numberingSeries.create({ data: {
            name: `${docType} - ${bu.name}`,
            prefix: `${docType.slice(0,2)}-`,
            nextNumber: 1,
            documentType: docType,
            businessUnitId: bu.id
        }});
    }

    // Business Partners
    const customers = await Promise.all([...Array(25)].map((_, i) => prisma.businessPartner.create({ data: {
        bpCode: `C${bu.id.slice(0,4)}${i.toString().padStart(4, '0')}`, name: `Customer ${i+1} (${bu.name.split(' ')[0]})`, type: 'CUSTOMER', businessUnitId: bu.id
    }})));
    const vendors = await Promise.all([...Array(10)].map((_, i) => prisma.businessPartner.create({ data: {
        bpCode: `V${bu.id.slice(0,4)}${i.toString().padStart(4, '0')}`, name: `Vendor ${i+1} (${bu.name.split(' ')[0]})`, type: 'VENDOR', businessUnitId: bu.id
    }})));

    // Inventory
    const mainWarehouse = await prisma.inventoryLocation.create({ data: { name: 'Main Warehouse', businessUnitId: bu.id }});
    const officeSupplies = await prisma.inventoryItem.create({ data: { name: 'A4 Bond Paper', businessUnitId: bu.id }});

    // Chart of Accounts
    const cogsAccount = await prisma.glAccount.create({ data: { accountCode: `5000-${bu.id.slice(0,4)}`, name: 'Cost of Goods Sold', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'EXPENSE')!.id }});
    const salesAccount = await prisma.glAccount.create({ data: { accountCode: `4000-${bu.id.slice(0,4)}`, name: 'Sales Revenue', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'REVENUE')!.id }});

    // --- SIMULATE 50 FULL PURCHASING CYCLES ---
    for (let i = 0; i < 50; i++) {
        const prDate = getRandomDateInPast(365);
        const poDate = addDays(prDate, 2);
        const deliveryDate = addDays(poDate, 7);
        const invoiceDate = addDays(deliveryDate, 1);

        // 1. Purchase Request
        const pr = await prisma.purchaseRequest.create({ 
            data: {
                prNumber: `PR-${bu.id.slice(0,4)}-${1001+i}`, businessUnitId: bu.id, requestorId: purchasingUser.id, status: 'APPROVED', approverId: superAdmin.id, approvalDate: prDate,
                items: { create: [{ description: 'Office Supplies - Paper', requestedQuantity: randomInt(5, 20), uomId: uoms.find(u=>u.symbol==='box')!.id }]}
            },
            // FIX: Include the created items in the return object
            include: {
                items: true
            }
        });

        // 2. Purchase Order
        const po = await prisma.purchaseOrder.create({ 
            data: {
                poNumber: `PO-${bu.id.slice(0,4)}-${2001+i}`, purchaseRequestId: pr.id, businessUnitId: bu.id, bpCode: getRandomItem(vendors).bpCode, ownerId: purchasingUser.id,
                postingDate: poDate, deliveryDate: deliveryDate, documentDate: poDate, totalAmount: 1000, status: 'OPEN',
                items: { create: [{ 
                    description: 'Office Supplies - Paper', 
                    inventoryItemId: officeSupplies.id, 
                    quantity: pr.items[0].requestedQuantity, 
                    unitPrice: randomInt(50, 70), 
                    lineTotal: pr.items[0].requestedQuantity * 55,
                    openQuantity: pr.items[0].requestedQuantity,
                    glAccountId: cogsAccount.id
                }]}
            },
            // FIX: Include the created items in the return object
            include: {
                items: true
            }
        });

        // 3. Goods Receipt PO (Receiving)
        await prisma.receiving.create({ data: {
            docNum: `RCV-${bu.id.slice(0,4)}-${3001+i}`, basePurchaseOrderId: po.id, businessUnitId: bu.id, receivedById: purchasingUser.id,
            postingDate: deliveryDate, documentDate: deliveryDate,
            items: { create: [{ inventoryItemId: officeSupplies.id, quantity: po.items[0].quantity }]}
        }});

        // 4. A/P Invoice
        await prisma.aPInvoice.create({ data: {
            docNum: `AP-${bu.id.slice(0,4)}-${4001+i}`, basePurchaseOrderId: po.id, businessUnitId: bu.id, bpCode: po.bpCode,
            postingDate: invoiceDate, dueDate: addDays(invoiceDate, 30), documentDate: invoiceDate, totalAmount: po.totalAmount, status: 'OPEN',
            items: { create: [{
                description: po.items[0].description,
                quantity: po.items[0].quantity,
                unitPrice: po.items[0].unitPrice,
                lineTotal: po.items[0].lineTotal,
                glAccountId: cogsAccount.id
            }]}
        }});
    }
    console.log(`   - 🧾 Simulated 50 full purchasing cycles.`);
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
