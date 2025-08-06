// components/navbar.tsx (Corrected Spacing)

import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import prismadb from "@/lib/db";
import { BusinessUnitItem } from "@/lib/types"; // Assuming you created this types file
import BusinessUnitSwitcher from "./business-unit-switcher";
import Headerx from "./header";


const Navbar = async () => {
    const session = await auth();

    if (!session?.user) {
      redirect('/auth/sign-in');
    }

    let businessUnits: BusinessUnitItem[] = [];

    const isAdmin = session.user.assignments.some(
        (assignment) => assignment.role.role === 'Administrator'
    );

    if (isAdmin) {
        businessUnits = await prismadb.businessUnit.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            }
        });
    } else {
        businessUnits = session.user.assignments.map((assignment) => assignment.businessUnit);
    }

    return ( 
        <div className="border-b">
            <div className="flex h-16 items-center px-4">
                {/* --- Group left and center items together --- */}
                <div className="flex items-center">
                    <BusinessUnitSwitcher items={businessUnits} />
                    <MainNav className="mx-6" />
                </div>

                {/* --- FIX: Changed space-x-4 to space-x-2 --- */}
                <div className="ml-auto flex items-center space-x-2">
                   {/*<ThemeToggle />*/} 
                    <Headerx /> 
                </div>
            </div>
        </div>
    );
};
 
export default Navbar;