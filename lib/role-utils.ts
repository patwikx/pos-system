import type { Role } from "@prisma/client"

export function getDefaultRoute(role: Role): string {
  switch (role) {
    case "MANAGER":
      return "/management"
    case "SERVER":
      return "/pos"
    case "HOST":
      return "/dashboard"
    default:
      return "/dashboard"
  }
}

export function hasAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

export function getAccessibleRoutes(role: Role): string[] {
  const routes: Record<Role, string[]> = {
    MANAGER: ["/dashboard", "/pos", "/kds", "/management"],
    SERVER: ["/dashboard", "/pos"],
    HOST: ["/dashboard"],
    // Add any other roles from your Prisma schema here
  }

  return routes[role] || ["/dashboard"]
}

// Alternative approach using a more explicit type-safe method
export function getAccessibleRoutesTypeSafe(role: Role): string[] {
  switch (role) {
    case "MANAGER":
      return ["/dashboard", "/pos", "/kds", "/management"]
    case "SERVER":
      return ["/dashboard", "/pos"]
    case "HOST":
      return ["/dashboard"]
    default:
      return ["/dashboard"]
  }
}

// Helper function to check if a route is accessible for a role
export function isRouteAccessible(role: Role, route: string): boolean {
  const accessibleRoutes = getAccessibleRoutes(role)
  return accessibleRoutes.some((accessibleRoute) => route.startsWith(accessibleRoute))
}

// Helper function to get role display name
export function getRoleDisplayName(role: Role): string {
  switch (role) {
    case "MANAGER":
      return "Manager"
    case "SERVER":
      return "Server"
    case "HOST":
      return "Host"
    default:
      return "User"
  }
}
