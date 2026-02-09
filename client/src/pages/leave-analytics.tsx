import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Inbox } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";

export default function LeaveAnalytics() {
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
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-analytics-title">
            Leave Analytics
          </h1>
        </div>
        <p className="text-muted-foreground">
          View leave usage statistics and trends across the organization
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No analytics data yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">Leave usage statistics and trends will appear here once leave data is available.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
