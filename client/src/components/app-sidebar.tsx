import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRole, UserRole, canEditOrgSettings, canAccessLeave } from "@/lib/role-context";
import { queryClient } from "@/lib/queryClient";
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
  HelpCircle,
  ClipboardList,
  PieChart,
  LogOut,
  Shield,
  User,
  Loader2,
  ArrowRightLeft,
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
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth-context";

const DEV_ACCOUNTS = [
  { email: "admin@test.com", password: "password123", role: "admin" as const, label: "Admin", icon: Shield, color: "text-red-500" },
  { email: "manager@test.com", password: "password123", role: "manager" as const, label: "Manager", icon: Users, color: "text-blue-500" },
  { email: "employee@test.com", password: "password123", role: "employee" as const, label: "Employee", icon: User, color: "text-green-500" },
  { email: "contract@test.com", password: "password123", role: "contract" as const, label: "Contract", icon: Briefcase, color: "text-orange-500" },
];

function DevRoleSwitcher({ currentRole, login }: { currentRole: UserRole; login: (email: string, password: string) => Promise<void> }) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSwitch = async (account: typeof DEV_ACCOUNTS[0]) => {
    if (account.role === currentRole || switching) return;
    setSwitching(account.role);
    try {
      await login(account.email, account.password);
      queryClient.invalidateQueries();
      setLocation("/");
    } catch (e) {
      console.error("Dev role switch failed:", e);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-amber-500/50 p-2 mb-2" data-testid="dev-role-switcher">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <ArrowRightLeft className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Switch Role</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {DEV_ACCOUNTS.map((account) => {
          const Icon = account.icon;
          const isActive = account.role === currentRole;
          return (
            <Button
              key={account.role}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={`justify-start gap-1.5 h-7 text-xs ${isActive ? "ring-1 ring-amber-500/50" : ""}`}
              disabled={switching !== null}
              onClick={() => handleSwitch(account)}
              data-testid={`button-switch-${account.role}`}
            >
              {switching === account.role ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className={`h-3 w-3 ${account.color}`} />
              )}
              {account.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  testId: string;
  roles: UserRole[];
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, testId: "nav-dashboard", roles: ["employee", "manager", "admin", "contract"] },
  { title: "Employees", url: "/employees", icon: Users, testId: "nav-employees", roles: ["employee", "manager", "admin", "contract"] },
  { title: "Departments", url: "/departments", icon: Building2, testId: "nav-departments", roles: ["admin"] },
];

const settingsNavItems: NavItem[] = [
  { title: "Reports", url: "/reports", icon: PieChart, testId: "nav-reports", roles: ["admin"] },
  { title: "Settings", url: "/settings", icon: Settings, testId: "nav-settings", roles: ["employee", "manager", "admin", "contract"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { role, currentUser } = useRole();
  const { login, logout } = useAuth();
  const getInitialExpanded = (): string | null => {
    if (location.startsWith("/leave")) return "leave";
    if (location.startsWith("/appraisals")) return "appraisals";
    if (location.startsWith("/recruitment")) return "recruitment";
    if (location.startsWith("/onboarding")) return "onboarding";
    return null;
  };
  const [expandedSection, setExpandedSection] = useState<string | null>(getInitialExpanded);
  const toggleSection = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location === url;
  };

  const isQueriesActive = location.startsWith("/queries");
  const isReportsActive = location === "/reports";

  const isLeaveActive = location.startsWith("/leave");
  const isAppraisalsActive = location.startsWith("/appraisals");
  const isRecruitmentActive = location.startsWith("/recruitment");
  const isOnboardingActive = location.startsWith("/onboarding") || location.startsWith("/my-tasks");
  const showLeave = canAccessLeave(role);
  const showLeaveSubItems = canEditOrgSettings(role);
  const showAppraisalsSubItems = canEditOrgSettings(role);
  const showRecruitment = canEditOrgSettings(role);
  const showOnboardingSubItems = canEditOrgSettings(role);

  const filterByRole = (items: NavItem[]) => items.filter(item => item.roles.includes(role));

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    employee: { label: "Employee", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    manager: { label: "Manager", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    admin: { label: "Admin", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    contract: { label: "Contract", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
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
          <SidebarGroupLabel>People Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showLeave && (showLeaveSubItems ? (
                <Collapsible open={expandedSection === "leave"} onOpenChange={() => toggleSection("leave")}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isLeaveActive}
                        data-testid="nav-leave-management"
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span>Leave Management</span>
                        {expandedSection === "leave" ? (
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
              ))}

              {showAppraisalsSubItems ? (
                <Collapsible open={expandedSection === "appraisals"} onOpenChange={() => toggleSection("appraisals")}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isAppraisalsActive}
                        data-testid="nav-appraisals-management"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Appraisals</span>
                        {expandedSection === "appraisals" ? (
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
                <Collapsible open={expandedSection === "recruitment"} onOpenChange={() => toggleSection("recruitment")}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isRecruitmentActive}
                        data-testid="nav-recruitment-management"
                      >
                        <Briefcase className="h-4 w-4" />
                        <span>Recruitment</span>
                        {expandedSection === "recruitment" ? (
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

              {showOnboardingSubItems ? (
                <Collapsible open={expandedSection === "onboarding"} onOpenChange={() => toggleSection("onboarding")}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isOnboardingActive}
                        data-testid="nav-task-management"
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span>Task Management</span>
                        {expandedSection === "onboarding" ? (
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
                            isActive={location === "/onboarding/tracker"}
                          >
                            <Link href="/onboarding/tracker" data-testid="nav-onboarding-tracker">
                              <Users className="h-3 w-3" />
                              <span>Tracker</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/onboarding/templates"}
                          >
                            <Link href="/onboarding/templates" data-testid="nav-onboarding-templates">
                              <FileText className="h-3 w-3" />
                              <span>Templates</span>
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
                    isActive={isOnboardingActive}
                  >
                    <Link href="/my-tasks" data-testid="nav-my-tasks">
                      <ClipboardList className="h-4 w-4" />
                      <span>My Tasks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isQueriesActive}
                >
                  <Link href="/queries" data-testid="nav-queries">
                    <HelpCircle className="h-4 w-4" />
                    <span>Queries & Warnings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
        {import.meta.env.DEV && <DevRoleSwitcher currentRole={role} login={login} />}
        <div className="flex flex-col gap-2 rounded-md p-3 bg-sidebar-accent/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate" data-testid="text-sidebar-user">
              {currentUser.firstName} {currentUser.lastName}
            </span>
            <Badge variant="secondary" className={`text-xs ${roleLabels[role].color}`} data-testid="badge-sidebar-role">
              {roleLabels[role].label}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate" data-testid="text-sidebar-position">
              {currentUser.position}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
