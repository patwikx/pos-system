import { 
    PrismaClient, 
    BusinessUnit, 
    Roles, 
    UoM, 
    AccountType, 
    User, 
    DocumentType, 
    BusinessPartner,
    GlAccount,
    InventoryItem,
    InventoryLocation,
    MenuCategory,
    MenuItem,
    ModifierGroup,
    PosTerminal,
    Table,
    PaymentMethod,
    Discount,
    PeriodStatus,
    Shift
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// --- HELPER FUNCTIONS ---
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
};
const createPastDate = (startYear = 2023) => {
    return faker.date.between({ from: new Date(startYear, 0, 1), to: new Date() });
};

async function getNextDocNum(docType: DocumentType, buId: string) {
    const series = await prisma.numberingSeries.findUniqueOrThrow({
        where: { documentType_businessUnitId: { documentType: docType, businessUnitId: buId } },
    });
    const docNum = `${series.prefix}${series.nextNumber}`;
    await prisma.numberingSeries.update({
        where: { id: series.id },
        data: { nextNumber: { increment: 1 } },
    });
    return docNum;
}

async function main() {
    console.log('🚀 Start seeding ...');

    // --- 1. CLEAN UP THE DATABASE ---
    console.log('🧹 Cleaning up existing data in dependency order...');

    await prisma.financialReportLine.deleteMany();
    await prisma.financialReport.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.order.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.table.deleteMany();
    await prisma.posTerminal.deleteMany();
    await prisma.journalEntryLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.deposit.deleteMany();
    await prisma.incomingPayment.deleteMany();
    await prisma.outgoingPayment.deleteMany();
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
    await prisma.receivingItem.deleteMany();
    await prisma.receiving.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseRequestItem.deleteMany();
    await prisma.purchaseRequest.deleteMany();
    await prisma.stockRequisitionItem.deleteMany();
    await prisma.stockRequisition.deleteMany();
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.modifier.deleteMany();
    await prisma.modifierGroup.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuCategory.deleteMany();
    await prisma.inventoryStock.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.inventoryLocation.deleteMany();
    await prisma.numberingSeries.deleteMany();
    await prisma.businessPartner.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.glAccount.deleteMany();
    await prisma.accountType.deleteMany();
    await prisma.userBusinessUnit.deleteMany();
    await prisma.user.deleteMany();
    await prisma.roles.deleteMany();
    await prisma.businessUnit.deleteMany();
    await prisma.uoM.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.accountingPeriod.deleteMany();
    
    // --- 2. CREATE INDEPENDENT & CORE DATA ---
    console.log('🌱 Seeding core data...');
    
    const accountTypes = await prisma.accountType.createManyAndReturn({
        data: [ { name: 'ASSET' }, { name: 'LIABILITY' }, { name: 'EQUITY' }, { name: 'REVENUE' }, { name: 'EXPENSE' } ],
    });

    const roles = await prisma.roles.createManyAndReturn({
        data: [ { role: 'Administrator' }, { role: 'Manager' }, { role: 'Cashier' }, { role: 'Sales' }, { role: 'Purchasing' }, { role: 'Accountant' } ],
    });

    const uoms = await prisma.uoM.createManyAndReturn({
        data: [ 
            { name: 'Piece', symbol: 'pc' }, { name: 'Box', symbol: 'box' }, { name: 'Kilogram', symbol: 'kg' },
            { name: 'Gram', symbol: 'g' }, { name: 'Liter', symbol: 'L' }, { name: 'Milliliter', symbol: 'ml' },
            { name: 'Pack', symbol: 'pack' }
        ],
    });

    const paymentMethods = await prisma.paymentMethod.createManyAndReturn({
        data: [
            { name: 'Cash' }, { name: 'Credit Card' }, { name: 'GCash' }, { name: 'Bank Transfer' }, { name: 'On Account' }
        ]
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
        const buUsers: Record<string, User> = {};
        const userRoles = ['Manager', 'Cashier', 'Sales', 'Purchasing', 'Accountant'];
        for(const roleName of userRoles) {
            const user = await prisma.user.create({
                data: {
                    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
                    username: `${roleName.toLowerCase()}_${bu.id.slice(0,4)}`,
                    password: hashedPassword,
                    isActive: true
                }
            });
            await prisma.userBusinessUnit.create({
                data: {
                    userId: user.id,
                    businessUnitId: bu.id,
                    roleId: roles.find(r => r.role === roleName)!.id
                }
            });
            buUsers[roleName.toLowerCase()] = user;
        }
        console.log(` 👨‍💼 ${Object.keys(buUsers).length} users created for ${bu.name}.`);

        // Document Numbering
        for (const docType of Object.values(DocumentType)) {
            await prisma.numberingSeries.create({ data: {
                name: `${docType} - ${bu.name.split(' ')[0]}`,
                // FIX: Make prefix unique per business unit to avoid duplicate doc numbers
                prefix: `${bu.id.slice(0, 4).toUpperCase()}-${docType.slice(0, 2)}-${new Date().getFullYear().toString().slice(-2)}-`,
                nextNumber: 1,
                documentType: docType,
                businessUnitId: bu.id
            }});
        }
        console.log(` 🔢 Document numbering series created.`);
        
        // Chart of Accounts
        const buAccts = {
            cash: await prisma.glAccount.create({ data: { accountCode: `11010-${bu.id.slice(0,4)}`, name: 'Cash on Hand', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'ASSET')!.id }}),
            bank: await prisma.glAccount.create({ data: { accountCode: `11020-${bu.id.slice(0,4)}`, name: 'Cash in Bank - BDO', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'ASSET')!.id }}),
            ar: await prisma.glAccount.create({ data: { accountCode: `12010-${bu.id.slice(0,4)}`, name: 'Accounts Receivable', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'ASSET')!.id }}),
            inventory: await prisma.glAccount.create({ data: { accountCode: `13010-${bu.id.slice(0,4)}`, name: 'Inventory - F&B', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'ASSET')!.id }}),
            ap: await prisma.glAccount.create({ data: { accountCode: `21010-${bu.id.slice(0,4)}`, name: 'Accounts Payable', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'LIABILITY')!.id }}),
            sales: await prisma.glAccount.create({ data: { accountCode: `41010-${bu.id.slice(0,4)}`, name: 'Sales Revenue - F&B', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'REVENUE')!.id }}),
            cogs: await prisma.glAccount.create({ data: { accountCode: `51010-${bu.id.slice(0,4)}`, name: 'Cost of Goods Sold', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'EXPENSE')!.id }}),
            rent: await prisma.glAccount.create({ data: { accountCode: `61010-${bu.id.slice(0,4)}`, name: 'Rent Expense', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'EXPENSE')!.id }}),
            salaries: await prisma.glAccount.create({ data: { accountCode: `62010-${bu.id.slice(0,4)}`, name: 'Salaries & Wages', businessUnitId: bu.id, accountTypeId: accountTypes.find(at => at.name === 'EXPENSE')!.id }}),
        };
        console.log(` 🧾 Chart of Accounts created.`);

        // Bank Accounts
        await prisma.bankAccount.create({ data: { name: 'BDO Savings', bankName: 'Banco de Oro', accountNumber: faker.finance.accountNumber(), glAccountId: buAccts.bank.id, businessUnitId: bu.id }});

        // Business Partners
        const customers: BusinessPartner[] = [];
        for (let i = 0; i < 50; i++) {
            customers.push(await prisma.businessPartner.create({ data: {
                bpCode: `C-${bu.id.slice(0,4)}-${i.toString().padStart(4, '0')}`, name: faker.company.name(), type: 'CUSTOMER', businessUnitId: bu.id, phone: faker.phone.number(), email: faker.internet.email()
            }}));
        }
        const vendors: BusinessPartner[] = [];
        for (let i = 0; i < 20; i++) {
            vendors.push(await prisma.businessPartner.create({ data: {
                bpCode: `V-${bu.id.slice(0,4)}-${i.toString().padStart(4, '0')}`, name: faker.company.name(), type: 'VENDOR', businessUnitId: bu.id, phone: faker.phone.number(), email: faker.internet.email()
            }}));
        }
        console.log(` 🤝 ${customers.length} customers and ${vendors.length} vendors created.`);

        // Inventory
        const mainWarehouse = await prisma.inventoryLocation.create({ data: { name: 'Main Warehouse', businessUnitId: bu.id }});
        const kitchen = await prisma.inventoryLocation.create({ data: { name: 'Kitchen Stock', businessUnitId: bu.id }});
        
        const invItems: InventoryItem[] = [];
        const itemNames = ['Chicken Thigh', 'Pork Belly', 'Rice', 'Onions', 'Garlic', 'Soy Sauce', 'Vinegar', 'Coke', 'Sprite', 'Bottled Water'];
        for(const name of itemNames) {
            invItems.push(await prisma.inventoryItem.create({ data: { name, businessUnitId: bu.id, uomId: getRandomItem(uoms).id }}));
        }
        console.log(` 📦 ${invItems.length} inventory items created.`);
        
        // POS Setup
        const mainTerminal = await prisma.posTerminal.create({ data: { name: 'Cashier 1', businessUnitId: bu.id }});
        const tables: Table[] = [];
        for (let i = 1; i <= 20; i++) {
            tables.push(await prisma.table.create({ data: { name: `Table ${i}`, businessUnitId: bu.id }}));
        }
        
        const mainCourses = await prisma.menuCategory.create({ data: { name: 'Main Courses', businessUnitId: bu.id }});
        const drinks = await prisma.menuCategory.create({ data: { name: 'Drinks', businessUnitId: bu.id }});
        
        const adobo = await prisma.menuItem.create({ data: { name: 'Chicken Pork Adobo', price: 250, businessUnitId: bu.id, categoryId: mainCourses.id }});
        const coke = await prisma.menuItem.create({ data: { name: 'Coke', price: 50, businessUnitId: bu.id, categoryId: drinks.id }});
        console.log(` 🍽️ Menu and POS setup created.`);

        // --- SIMULATE 150+ POS TRANSACTIONS ---
        console.log(` 🔄 Simulating 150 POS transactions...`);
        
        const cashierUser = buUsers['cashier'];
        const shift = await prisma.shift.create({
            data: {
                businessUnitId: bu.id,
                userId: cashierUser.id,
                terminalId: mainTerminal.id,
                startedAt: new Date(),
                startingCash: 10000,
            }
        });

        for (let i = 0; i < 150; i++) {
            const orderDate = createPastDate();
            const totalAmount = randomInt(300, 2500);
            
            await prisma.order.create({
                data: {
                    businessUnitId: bu.id,
                    tableId: getRandomItem(tables).id,
                    userId: cashierUser.id,
                    terminalId: mainTerminal.id,
                    status: 'PAID',
                    totalAmount,
                    amountPaid: totalAmount,
                    isPaid: true,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    items: {
                        create: [
                            { menuItemId: adobo.id, quantity: Math.floor(totalAmount / 250), priceAtSale: 250 },
                            { menuItemId: coke.id, quantity: 1, priceAtSale: 50 }
                        ]
                    },
                    payments: {
                        create: {
                            amount: totalAmount,
                            paymentMethodId: paymentMethods.find(p => p.name === 'Cash')!.id,
                            processedByUserId: cashierUser.id,
                            shiftId: shift.id,
                        }
                    }
                }
            });
        }
        console.log(`   - ✅ 150 POS transactions created.`);

        // --- SIMULATE 100+ FULL PURCHASING CYCLES ---
        console.log(` 🔄 Simulating 100 Purchasing cycles...`);
        for (let i = 0; i < 100; i++) {
            const prDate = createPastDate();
            const poDate = addDays(prDate, randomInt(1, 3));
            const deliveryDate = addDays(poDate, randomInt(5, 10));
            const invoiceDate = addDays(deliveryDate, randomInt(0, 2));
            const paymentDate = addDays(invoiceDate, randomInt(15, 30));
            const requestedItem = getRandomItem(invItems);
            const quantity = randomInt(5, 50);
            const unitPrice = randomInt(20, 100);
            const lineTotal = quantity * unitPrice;

            // 1. Purchase Request
            const pr = await prisma.purchaseRequest.create({ 
                data: {
                    prNumber: await getNextDocNum(DocumentType.PURCHASE_REQUEST, bu.id),
                    businessUnitId: bu.id,
                    requestorId: buUsers['purchasing'].id,
                    status: 'APPROVED',
                    approverId: buUsers['manager'].id,
                    approvalDate: prDate,
                    items: { create: [{ description: requestedItem.name, requestedQuantity: quantity, uomId: requestedItem.uomId }] }
                },
                include: { items: true }
            });

            // 2. Purchase Order
            const vendor = getRandomItem(vendors);
            const po = await prisma.purchaseOrder.create({ 
                data: {
                    poNumber: await getNextDocNum(DocumentType.PURCHASE_ORDER, bu.id),
                    purchaseRequestId: pr.id,
                    businessUnitId: bu.id,
                    bpCode: vendor.bpCode,
                    ownerId: buUsers['purchasing'].id,
                    postingDate: poDate,
                    deliveryDate: deliveryDate,
                    documentDate: poDate,
                    totalAmount: lineTotal,
                    status: 'CLOSED',
                    items: { create: [{ 
                        description: requestedItem.name, 
                        inventoryItemId: requestedItem.id, 
                        quantity: quantity, 
                        unitPrice: unitPrice, 
                        lineTotal: lineTotal,
                        openQuantity: 0,
                        glAccountId: buAccts.inventory.id
                    }]}
                },
                include: { items: true }
            });

            // 3. Goods Receipt PO (Receiving)
            await prisma.receiving.create({ data: {
                docNum: await getNextDocNum(DocumentType.GOODS_RECEIPT_PO, bu.id),
                basePurchaseOrderId: po.id,
                businessUnitId: bu.id,
                receivedById: buUsers['purchasing'].id,
                postingDate: deliveryDate,
                documentDate: deliveryDate,
                items: { create: [{ inventoryItemId: requestedItem.id, quantity: quantity }]}
            }});

            // 4. A/P Invoice
            const apInvoice = await prisma.aPInvoice.create({ data: {
                docNum: await getNextDocNum(DocumentType.AP_INVOICE, bu.id),
                basePurchaseOrderId: po.id,
                businessUnitId: bu.id,
                bpCode: po.bpCode,
                postingDate: invoiceDate,
                dueDate: addDays(invoiceDate, 30),
                documentDate: invoiceDate,
                totalAmount: lineTotal,
                status: 'CLOSED',
                amountPaid: lineTotal,
                items: { create: [{
                    description: po.items[0].description,
                    quantity: po.items[0].quantity,
                    unitPrice: po.items[0].unitPrice,
                    lineTotal: po.items[0].lineTotal,
                    glAccountId: buAccts.inventory.id
                }]}
            }});

            // 5. Outgoing Payment
            await prisma.outgoingPayment.create({
                data: {
                    docNum: await getNextDocNum(DocumentType.OUTGOING_PAYMENT, bu.id),
                    businessUnitId: bu.id,
                    bpCode: vendor.bpCode,
                    paymentDate: paymentDate,
                    amount: lineTotal,
                    bankAccountId: (await prisma.bankAccount.findFirst({where: {businessUnitId: bu.id}}))!.id,
                }
            })
        }
        console.log(`   - ✅ 100 Purchasing cycles created.`);
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
