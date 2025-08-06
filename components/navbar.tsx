// components/navbar.tsx (Corrected with consistent types)

import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import prismadb from "@/lib/db";
import BusinessUnitSwitcher from "./business-unit-switcher"; // 1. Import the lean type
import Headerx from "./header";
import { BusinessUnitItem } from "@/lib/types";

const Navbar = async () => {
    const session = await auth();

    if (!session?.user) {
      redirect('/auth/sign-in');
    }

    // 2. Declare the variable with the lean, consistent type
    let businessUnits: BusinessUnitItem[] = [];

    const isAdmin = session.user.assignments.some(
        (assignment) => assignment.role.role === 'Administrator'
    );

    if (isAdmin) {
        // --- Admin Case: Fetch ONLY the id and name ---
        // 3. Use `select` to fetch just the data needed. This is more efficient
        //    and ensures the data shape matches `BusinessUnitItem`.
        businessUnits = await prismadb.businessUnit.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            }
        });
    } else {
        // --- Regular User Case: This now perfectly matches the `BusinessUnitItem[]` type ---
        businessUnits = session.user.assignments.map((assignment) => assignment.businessUnit);
    }

    return ( 
        <div className="border-b">
            <div className="flex h-16 items-center px-4">
                <BusinessUnitSwitcher items={businessUnits} />
                <MainNav className="mx-6" />
                <div className="ml-auto flex items-center space-x-4">
                    <ThemeToggle />
                    <Headerx /> 
                </div>
            </div>
        </div>
    );
};
 
export default Navbar;