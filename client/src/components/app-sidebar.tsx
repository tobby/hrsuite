import { Link, useLocation } from "wouter";
import { useRole, UserRole } from "@/lib/role-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Building2,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { getDepartmentById } from "@/lib/demo-data";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  testId: string;
  roles: UserRole[];
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, testId: "nav-dashboard", roles: ["employee", "manager", "admin"] },
  { title: "Employees", url: "/employees", icon: Users, testId: "nav-employees", roles: ["manager", "admin"] },
  { title: "Departments", url: "/departments", icon: Building2, testId: "nav-departments", roles: ["manager", "admin"] },
];

const hrNavItems: NavItem[] = [
  { title: "Leave Management", url: "/leave", icon: CalendarDays, testId: "nav-leave-management", roles: ["employee", "manager", "admin"] },
  { title: "Performance", url: "/performance", icon: ClipboardCheck, testId: "nav-performance", roles: ["employee", "manager", "admin"] },
];

const settingsNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, testId: "nav-settings", roles: ["employee", "manager", "admin"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { role, currentUser } = useRole();
  const department = getDepartmentById(currentUser.departmentId);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const filterByRole = (items: NavItem[]) => items.filter(item => item.roles.includes(role));

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    employee: { label: "Employee", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    manager: { label: "Manager", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    admin: { label: "Admin", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
            HR
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">HRFlow</span>
            <span className="text-xs text-muted-foreground">HR Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(mainNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>HR Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(hrNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(settingsNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2 rounded-md p-3 bg-sidebar-accent/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" data-testid="text-sidebar-user">
              {currentUser.firstName} {currentUser.lastName}
            </span>
            <Badge variant="secondary" className={`text-xs ${roleLabels[role].color}`} data-testid="badge-sidebar-role">
              {roleLabels[role].label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground" data-testid="text-sidebar-department">
            {department?.name}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
