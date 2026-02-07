import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRole, UserRole, canEditOrgSettings } from "@/lib/role-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Building2,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  Briefcase,
  UserPlus,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  { title: "Employees", url: "/employees", icon: Users, testId: "nav-employees", roles: ["employee", "manager", "admin"] },
  { title: "Departments", url: "/departments", icon: Building2, testId: "nav-departments", roles: ["admin"] },
];

const settingsNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, testId: "nav-settings", roles: ["employee", "manager", "admin"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { role, currentUser } = useRole();
  const department = getDepartmentById(currentUser.departmentId);
  const [leaveExpanded, setLeaveExpanded] = useState(location.startsWith("/leave"));
  const [appraisalsExpanded, setAppraisalsExpanded] = useState(location.startsWith("/appraisals"));
  const [recruitmentExpanded, setRecruitmentExpanded] = useState(location.startsWith("/recruitment"));

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location === url;
  };

  const isLeaveActive = location.startsWith("/leave");
  const isAppraisalsActive = location.startsWith("/appraisals");
  const isRecruitmentActive = location.startsWith("/recruitment");
  const showLeaveSubItems = canEditOrgSettings(role);
  const showAppraisalsSubItems = canEditOrgSettings(role);
  const showRecruitment = canEditOrgSettings(role);

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
              {showLeaveSubItems ? (
                <Collapsible open={leaveExpanded} onOpenChange={setLeaveExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isLeaveActive}
                        data-testid="nav-leave-management"
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span>Leave Management</span>
                        {leaveExpanded ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/leave"}
                          >
                            <Link href="/leave" data-testid="nav-leave-requests">
                              <CalendarDays className="h-3 w-3" />
                              <span>Requests</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/leave/analytics"}
                          >
                            <Link href="/leave/analytics" data-testid="nav-leave-analytics">
                              <BarChart3 className="h-3 w-3" />
                              <span>Analytics</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/leave/settings"}
                          >
                            <Link href="/leave/settings" data-testid="nav-leave-settings">
                              <Settings className="h-3 w-3" />
                              <span>Settings</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isLeaveActive}
                  >
                    <Link href="/leave" data-testid="nav-leave-management">
                      <CalendarDays className="h-4 w-4" />
                      <span>Leave Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {showAppraisalsSubItems ? (
                <Collapsible open={appraisalsExpanded} onOpenChange={setAppraisalsExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isAppraisalsActive}
                        data-testid="nav-appraisals-management"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Appraisals</span>
                        {appraisalsExpanded ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/appraisals"}
                          >
                            <Link href="/appraisals" data-testid="nav-my-appraisals">
                              <ClipboardCheck className="h-3 w-3" />
                              <span>My Appraisals</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/appraisals/templates"}
                          >
                            <Link href="/appraisals/templates" data-testid="nav-appraisal-templates">
                              <FileText className="h-3 w-3" />
                              <span>Templates</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/appraisals/cycles"}
                          >
                            <Link href="/appraisals/cycles" data-testid="nav-appraisal-cycles">
                              <Calendar className="h-3 w-3" />
                              <span>Cycles</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isAppraisalsActive}
                  >
                    <Link href="/appraisals" data-testid="nav-appraisals">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Appraisals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {showRecruitment && (
                <Collapsible open={recruitmentExpanded} onOpenChange={setRecruitmentExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isRecruitmentActive}
                        data-testid="nav-recruitment-management"
                      >
                        <Briefcase className="h-4 w-4" />
                        <span>Recruitment</span>
                        {recruitmentExpanded ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/recruitment/jobs"}
                          >
                            <Link href="/recruitment/jobs" data-testid="nav-recruitment-jobs">
                              <Briefcase className="h-3 w-3" />
                              <span>Jobs</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/recruitment/candidates"}
                          >
                            <Link href="/recruitment/candidates" data-testid="nav-recruitment-candidates">
                              <UserPlus className="h-3 w-3" />
                              <span>Candidates</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/recruitment/settings"}
                          >
                            <Link href="/recruitment/settings" data-testid="nav-recruitment-settings">
                              <Settings className="h-3 w-3" />
                              <span>Settings</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
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
