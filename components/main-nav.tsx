"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react"; // Import the type for icons
import { 
    ChevronDown, Home, ShoppingCart, Settings, User, Menu,
    BookOpen, Box, Truck, Tag, Users, Table, Computer,
    BookCheck, HandCoins, FileText, Landmark, Banknote, CalendarClock,
    ClipboardPenLine
} from 'lucide-react';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { useCurrentUser } from "@/lib/current-user";

// --- FIX 1: Define a clear type for our route objects ---
type Route = {
    href: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
    description?: string;
};

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const params = useParams();
  const user = useCurrentUser();

  const currentAssignment = user?.assignments.find(
    (a) => a.businessUnitId === params.businessUnitId
  );
  const userRole = currentAssignment?.role.role;
  
  const hasManagementAccess = userRole === 'Administrator' || userRole === 'Manager';
  const hasAccountingAccess = userRole === 'Administrator' || userRole === 'Accountant' || userRole === 'Manager';

  // --- ROUTE DEFINITIONS BY MODULE ---

  const posRoutes: Route[] = [
   ...(hasAccountingAccess ? [ { href: `/${params.businessUnitId}`, label: 'Dashboard', icon: Home, active: pathname === `/${params.businessUnitId}`}] : []),
   ...(hasAccountingAccess ? [ { href: `/${params.businessUnitId}/orders`, label: 'Orders', icon: ShoppingCart, active: pathname.includes(`/orders`)},] : []),
  ];

  const inventoryRoutes: Route[] = [
    ...(hasAccountingAccess ? [ { href: `/${params.businessUnitId}/inventory`, label: 'Inventory Items', icon: Box, active: pathname.includes(`/inventory`)}, ] : []),
   ...(hasAccountingAccess ? [ { href: `/${params.businessUnitId}/stock-requisitions`, label: 'Stock Requisitions', icon: ClipboardPenLine, active: pathname.includes(`/stock-requisitions`)}, ] : []),
   ...(hasAccountingAccess ? [ { href: `/${params.businessUnitId}/purchase-request`, label: 'Purchase Requests', icon: BookCheck, active: pathname.includes(`/purchase-requests`)}, ] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/purchase-order`, label: 'Purchase Orders', icon: Truck, active: pathname.includes(`/purchase-orders`)}, ] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/suppliers`, label: 'Suppliers', icon: Users, active: pathname.includes(`/suppliers`)},  ] : []),
  ];
  
  const accountingRoutes: Route[] = [
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/journal-entry`, label: 'Journal Entries', icon: BookOpen, active: pathname.includes(`/journal-entry`)}] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/chart-of-accounts`, label: 'Chart of Accounts', icon: Landmark, active: pathname.includes(`/chart-of-accounts`)}] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/ap-invoice`, label: 'Vendor Bills (A/P)', icon: FileText, active: pathname.includes(`/ap-invoice`)}] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/ar-invoice`, label: 'Invoices (A/R)', icon: FileText, active: pathname.includes(`/ar-invoice`)}] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/bank-accounts`, label: 'Bank Accounts', icon: Banknote, active: pathname.includes(`/bank-accounts`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/business-partners`, label: 'Business Partners', icon: Users, active: pathname.includes(`/business-partners`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/reservations`, label: 'Reservations', icon: CalendarClock, active: pathname.includes(`/reservations`)}] : []),
  ];

  const systemSettingsRoutes: Route[] = [
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/menu-items`, label: 'Menu Items', icon: BookOpen, active: pathname.includes(`/menu-items`)}] : []),
    // Corrected path for menu-categories
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/menu-categories`, label: 'Menu Categories', icon: BookCheck, active: pathname.includes(`/menu-categories`)}] : []),
        ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/modifier-groups`, label: 'Modifier Groups', icon: HandCoins, active: pathname.includes(`/modifier-groups`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/modifier`, label: 'Modifiers', icon: HandCoins, active: pathname.includes(`/modifiers`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/discounts`, label: 'Discounts', icon: Tag, active: pathname.includes(`/discounts`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/tables`, label: 'Tables', icon: Table, active: pathname.includes(`/tables`)}] : []),
    ...(hasManagementAccess ? [{ href: `/${params.businessUnitId}/terminals`, label: 'POS Terminals', icon: Computer, active: pathname.includes(`/terminals`)}] : []),
    ...(hasAccountingAccess ? [{ href: `/${params.businessUnitId}/accounting-periods`, label: 'Accounting Periods', icon: CalendarClock, active: pathname.includes(`/accounting-periods`)}] : []),
    ...(userRole === 'Administrator' ? [{ href: `/${params.businessUnitId}/user-management`, label: 'User Management', icon: User, active: pathname.includes(`/user-management`)}] : []),
    ...(userRole === 'Administrator' ? [{ href: `/${params.businessUnitId}/settings`, label: 'Business Unit Settings', icon: Settings, active: pathname.includes(`/settings`)}] : []),
  ];

  const [openDropdown, setOpenDropdown] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- FIX 2: Corrected the variable names here ---
  const allNavGroups = [
    { title: "POS Functions", routes: posRoutes },
    { title: "Inventory", routes: inventoryRoutes },
    { title: "Accounting & CRM", routes: accountingRoutes },
    { title: "System Settings", routes: systemSettingsRoutes },
  ].filter(group => group.routes.length > 0);

  // Use the new `Route` type here
  const createDropdown = (name: string, routes: Route[]) => {
    if (routes.length === 0) return null;
    const isActive = routes.some(route => route.active);
    return (
      <DropdownMenu open={openDropdown === name} onOpenChange={(isOpen) => setOpenDropdown(isOpen ? name : '')}>
        <DropdownMenuTrigger asChild>
          <Button variant={isActive ? "secondary" : "ghost"} className="flex items-center px-3 py-2 text-sm font-medium">
            {name}
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${openDropdown === name ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {routes.map((route) => (
            <DropdownMenuItem key={route.href} asChild>
              <Link href={route.href} className={cn(route.active && "bg-secondary")}>
                <route.icon className="mr-2 h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <nav
      className={cn("flex items-center space-x-1 lg:space-x-2", className)}
      {...props}
    >
      {/* --- DESKTOP NAVIGATION --- */}
      <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
        {posRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
                'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                route.active 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            )}
          >
            <route.icon className="w-4 h-4 mr-2" />
            {route.label}
          </Link>
        ))}
        
        {createDropdown("Inventory", inventoryRoutes)}
        {createDropdown("Accounting & CRM", accountingRoutes)}
        {createDropdown("Settings", systemSettingsRoutes)}
      </div>

      {/* --- MOBILE NAVIGATION (SHEET) --- */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open mobile menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[300px]">
            <div className="flex items-center p-4 border-b">
                <Image src="/RDH.webp" alt="Logo" width={32} height={32} />
                <span className="font-semibold text-lg ml-2">POS Menu</span>
            </div>
            <ScrollArea className="h-[calc(100vh-65px)]">
                <div className="flex flex-col p-2 space-y-1">
                  {allNavGroups.map((group, index) => (
                    <div key={group.title}>
                      {index > 0 && <Separator className="my-2" />}
                      <h4 className="px-3 py-2 text-sm font-semibold text-muted-foreground">{group.title}</h4>
                      {group.routes.map((route) => (
                        <Link key={route.href} href={route.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <div className={cn(
                              'flex items-center p-3 rounded-md text-sm font-medium transition-colors',
                              route.active ? 'bg-secondary text-secondary-foreground' : 'text-foreground hover:bg-secondary'
                          )}>
                              <route.icon className="mr-3 h-5 w-5" />
                              {route.label}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
            </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  )
}