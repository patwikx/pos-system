"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { 
    ChevronDown, Home, ShoppingCart, Settings, User, Menu,
    BookOpen, Box, Truck, Tag, Users, Table, Computer,
    BookCheck
} from 'lucide-react';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useCurrentUser } from "@/lib/current-user";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const params = useParams();
  const user = useCurrentUser();

  // --- NEW LOGIC: Determine user's role for the CURRENT business unit ---
  const currentAssignment = user?.assignments.find(
    (a) => a.businessUnitId === params.businessUnitId
  );
  const userRole = currentAssignment?.role.role; // e.g., "Manager", "Administrator", "Cashier"
  
  // Define roles that have administrative/management privileges
  const hasManagementAccess = userRole === 'Administrator' || userRole === 'Manager';

  // --- UPDATED ROUTES BASED ON RESTAURANT SCHEMA ---

  const mainRoutes = [
    {
      href: `/${params.businessUnitId}`,
      label: 'Overview',
      icon: Home,
      active: pathname === `/${params.businessUnitId}`,
    },
    {
      href: `/${params.businessUnitId}/orders`,
      label: 'Orders',
      icon: ShoppingCart,
      active: pathname === `/${params.businessUnitId}/orders`,
    },
    // You could add a direct link to a POS interface here as well
  ];

  const managementRoutes = [
    {
      href: `/${params.businessUnitId}/menu-items`,
      label: 'Menu Items',
      icon: BookOpen,
      description: "Manage dishes and drinks.",
      active: pathname === `/${params.businessUnitId}/menu-items`,
    },
    {
      href: `/${params.businessUnitId}/menu-categories`,
      label: 'Menu Categories',
      icon: BookCheck,
      description: "Group your menu items.",
      active: pathname === `/${params.businessUnitId}/categories`,
    },
    {
      href: `/${params.businessUnitId}/inventory`,
      label: 'Inventory Items',
      icon: Box,
      description: "Manage raw ingredients.",
      active: pathname === `/${params.businessUnitId}/inventory`,
    },
    {
        href: `/${params.businessUnitId}/purchase-orders`,
        label: 'Purchase Orders',
        icon: Truck,
        description: "Manage stock purchases.",
        active: pathname === `/${params.businessUnitId}/purchase-orders`,
    },
    {
        href: `/${params.businessUnitId}/suppliers`,
        label: 'Suppliers',
        icon: Users,
        description: "Manage your suppliers.",
        active: pathname === `/${params.businessUnitId}/suppliers`,
    },
    {
        href: `/${params.businessUnitId}/discounts`,
        label: 'Discounts',
        icon: Tag,
        description: "Manage discounts and promos.",
        active: pathname === `/${params.businessUnitId}/discounts`,
    },
  ];

  const settingsRoutes = [
    // Conditionally add routes only if user has management access
    ...(hasManagementAccess ? [{
      href: `/${params.businessUnitId}/tables`,
      label: 'Tables',
      icon: Table,
      description: "Manage restaurant tables.",
      active: pathname === `/${params.businessUnitId}/tables`,
    }] : []),
    ...(hasManagementAccess ? [{
        href: `/${params.businessUnitId}/terminals`,
        label: 'POS Terminals',
        icon: Computer,
        description: "Manage POS terminals.",
        active: pathname === `/${params.businessUnitId}/terminals`,
    }] : []),
    ...(hasManagementAccess ? [{
      href: `/${params.businessUnitId}/settings`,
      label: 'Business Unit Settings',
      icon: Settings,
      description: "Manage business unit settings.",
      active: pathname === `/${params.businessUnitId}/settings`,
    }] : []),
    // User Management might be exclusive to the Administrator
    ...(userRole === 'Administrator' ? [{
        href: `/${params.businessUnitId}/user-management`,
        label: 'User Management',
        icon: User,
        description: "Manage user accounts.",
        active: pathname === `/${params.businessUnitId}/user-management`,
    }] : []),
  ];

  // State for dropdowns and mobile menu
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const allRoutes = [...mainRoutes, ...managementRoutes, ...settingsRoutes];

  // Function to close mobile menu on navigation
  const handleLinkClick = () => setIsMobileMenuOpen(false);

  return (
    <nav
      className={cn("flex items-center space-x-1 lg:space-x-2", className)}
      {...props}
    >
      {/* --- DESKTOP NAVIGATION --- */}
      <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
        {mainRoutes.map((route) => (
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

        {/* Management Dropdown */}
        <DropdownMenu open={isManagementOpen} onOpenChange={setIsManagementOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center px-3 py-2 text-sm font-medium">
              Management
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${isManagementOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {managementRoutes.map((route) => (
              <DropdownMenuItem key={route.href} asChild>
                <Link href={route.href}>
                  <route.icon className="mr-2 h-4 w-4" />
                  <span>{route.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Dropdown (only shows if there are routes to display) */}
        {settingsRoutes.length > 0 && (
            <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center px-3 py-2 text-sm font-medium">
                        Settings
                        <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                    {settingsRoutes.map((route) => (
                    <DropdownMenuItem key={route.href} asChild>
                        <Link href={route.href}>
                        <route.icon className="mr-2 h-4 w-4" />
                        <span>{route.label}</span>
                        </Link>
                    </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
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
                    {allRoutes.map((route) => (
                      <Link key={route.href} href={route.href} onClick={handleLinkClick}>
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
            </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  )
}