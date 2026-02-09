import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Inbox } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";

export default function LeaveSettings() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-settings-title">
            Leave Settings
          </h1>
        </div>
        <p className="text-muted-foreground">
          Configure leave types, company holidays, and employee balances
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-manage-leave-types">
          <CardHeader>
            <CardTitle className="text-lg">Leave Types</CardTitle>
            <CardDescription>Configure leave type allocations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No leave types yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Leave types and their allocations will appear here once configured.</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-manage-holidays">
          <CardHeader>
            <CardTitle className="text-lg">Company Holidays</CardTitle>
            <CardDescription>Manage company-wide holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No company holidays yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Company-wide holidays will appear here once added.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-manage-balances">
          <CardHeader>
            <CardTitle className="text-lg">Employee Leave Balances</CardTitle>
            <CardDescription>Adjust individual employee leave allocations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No employee balances yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Employee leave balance details will appear here once leave types and employees are configured.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
