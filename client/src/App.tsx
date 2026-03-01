import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleProvider, useRole } from "@/lib/role-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Invite from "@/pages/invite";
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
import RecruitmentJobs from "@/pages/recruitment-jobs";
import RecruitmentCandidates from "@/pages/recruitment-candidates";
import CandidateDetail from "@/pages/candidate-detail";
import RecruitmentSettings from "@/pages/recruitment-settings";
import Queries from "@/pages/queries";
import QueryDetail from "@/pages/query-detail";
import OnboardingTemplates from "@/pages/onboarding-templates";
import OnboardingTracker from "@/pages/onboarding-tracker";
import MyOnboarding from "@/pages/my-onboarding";
import CompetencyLibrary from "@/pages/competency-library";
import Reports from "@/pages/reports";
import Careers from "@/pages/careers";
import JobDetails from "@/pages/job-details";
import JobApplication from "@/pages/job-application";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/careers" component={Careers} />
      <Route path="/jobs/:id" component={JobDetails} />
      <Route path="/jobs/:id/apply" component={JobApplication} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ContractGuard({ component: Component }: { component: React.ComponentType }) {
  const { role } = useRole();
  if (role === "contract") {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function PrivateRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/departments" component={Departments} />
      <Route path="/leave">{() => <ContractGuard component={Leave} />}</Route>
      <Route path="/leave/analytics">{() => <ContractGuard component={LeaveAnalytics} />}</Route>
      <Route path="/leave/settings">{() => <ContractGuard component={LeaveSettings} />}</Route>
      <Route path="/appraisals" component={Appraisals} />
      <Route path="/appraisals/review/:id" component={AppraisalReview} />
      <Route path="/appraisals/results/:id" component={AppraisalResults} />
      <Route path="/appraisals/templates" component={AppraisalTemplates} />
      <Route path="/appraisals/competencies" component={CompetencyLibrary} />
      <Route path="/appraisals/cycles" component={AppraisalCycles} />
      <Route path="/appraisals/cycles/:id" component={CycleProgress} />
      <Route path="/recruitment/jobs" component={RecruitmentJobs} />
      <Route path="/recruitment/candidates" component={RecruitmentCandidates} />
      <Route path="/recruitment/candidates/:id" component={CandidateDetail} />
      <Route path="/recruitment/settings" component={RecruitmentSettings} />
      <Route path="/queries/:id" component={QueryDetail} />
      <Route path="/queries" component={Queries} />
      <Route path="/onboarding/templates" component={OnboardingTemplates} />
      <Route path="/onboarding/tracker" component={OnboardingTracker} />
      <Route path="/my-tasks" component={MyOnboarding} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <RoleProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <PrivateRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RoleProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = location.startsWith("/careers") || location.startsWith("/jobs/");
  if (isPublicRoute) {
    return <PublicRouter />;
  }

  const isAuthRoute = location === "/login" || location === "/setup" || location.startsWith("/invite/");
  if (isAuthRoute) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (isAuthenticated) {
      return <Redirect to="/" />;
    }
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/setup" component={Setup} />
        <Route path="/invite/:token" component={Invite} />
      </Switch>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
