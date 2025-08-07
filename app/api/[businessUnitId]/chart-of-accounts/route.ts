import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prismadb from '@/lib/db';

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
    const { accountCode, name, accountTypeId, balance } = body;

    if (!accountCode) return new NextResponse("Account code is required", { status: 400 });
    if (!name) return new NextResponse("Account name is required", { status: 400 });
    if (!accountTypeId) return new NextResponse("Account type is required", { status: 400 });

    // Check if account code already exists
    const existingAccount = await prismadb.glAccount.findUnique({
      where: { accountCode }
    });

    if (existingAccount) {
      return new NextResponse("Account code already exists", { status: 409 });
    }

    const glAccount = await prismadb.glAccount.create({
      data: {
        accountCode,
        name,
        accountTypeId,
        businessUnitId,
        balance: balance || 0,
      },
      include: {
        accountType: true,
        _count: {
          select: { journalLines: true }
        }
      }
    });

    return NextResponse.json(glAccount);
  } catch (error) {
    console.log('[CHART_OF_ACCOUNTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ businessUnitId: string }> }
) {
  try {
    const { businessUnitId } = await context.params;

    const accounts = await prismadb.glAccount.findMany({
      where: { businessUnitId },
      include: {
        accountType: true,
        _count: {
          select: { journalLines: true }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.log('[CHART_OF_ACCOUNTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}