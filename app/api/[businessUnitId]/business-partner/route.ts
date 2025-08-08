import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';
import { BusinessPartnerType } from '@prisma/client';

export async function POST(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { bpCode, name, type, phone, email, address, contactPerson, paymentTerms, creditLimit } = body;

    if (!bpCode) return new NextResponse("Business partner code is required", { status: 400 });
    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!type) return new NextResponse("Type is required", { status: 400 });

    // Check if BP code already exists
    const existingPartner = await prismadb.businessPartner.findUnique({
      where: { bpCode }
    });

    if (existingPartner) {
      return new NextResponse("Business partner code already exists", { status: 409 });
    }

    const businessPartner = await prismadb.businessPartner.create({
      data: {
        bpCode,
        name,
        type,
        phone,
        email,
        businessUnitId,
        loyaltyPoints: 0
      }
    });

    return NextResponse.json(businessPartner);
  } catch (error) {
    console.log('[BUSINESS_PARTNERS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    const type = searchParams.get('type') as BusinessPartnerType | null;
    const search = searchParams.get('search');

    const where: any = { businessUnitId };
    
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { bpCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const businessPartners = await prismadb.businessPartner.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(businessPartners);
  } catch (error) {
    console.log('[BUSINESS_PARTNERS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}