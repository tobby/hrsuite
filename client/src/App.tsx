import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleSwitcher } from "@/components/role-switcher";
import { RoleProvider } from "@/lib/role-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import Departments from "@/pages/departments";
import Leave from "@/pages/leave";
import LeaveAnalytics from "@/pages/leave-analytics";
import LeaveSettings from "@/pages/leave-settings";
import Settings from "@/pages/settings";
import Appraisals from "@/pages/appraisals";
import AppraisalReview from "@/pages/appraisal-review";
import AppraisalResults from "@/pages/appraisal-results";
import AppraisalTemplates from "@/pages/appraisal-templates";
import AppraisalCycles from "@/pages/appraisal-cycles";
import CycleProgress from "@/pages/cycle-progress";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/departments" component={Departments} />
      <Route path="/leave" component={Leave} />
      <Route path="/leave/analytics" component={LeaveAnalytics} />
      <Route path="/leave/settings" component={LeaveSettings} />
      <Route path="/appraisals" component={Appraisals} />
      <Route path="/appraisals/review/:id" component={AppraisalReview} />
      <Route path="/appraisals/results/:id" component={AppraisalResults} />
      <Route path="/appraisals/templates" component={AppraisalTemplates} />
      <Route path="/appraisals/cycles" component={AppraisalCycles} />
      <Route path="/appraisals/cycles/:id" component={CycleProgress} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <RoleSwitcher />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </RoleProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
