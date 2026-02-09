import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox } from "lucide-react";
import { useRole, canApproveLeave, canViewAllRequests, canAccessLeave } from "@/lib/role-context";
import { useLocation } from "wouter";

export default function Leave() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState("my-requests");
  const [, navigate] = useLocation();

  if (!canAccessLeave(role)) {
    navigate("/");
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-title">
            Leave Management
          </h1>
          <p className="text-muted-foreground">
            Request time off and manage leave approvals
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">
            My Requests
          </TabsTrigger>
          {canApproveLeave(role) && (
            <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
              Pending Approvals
            </TabsTrigger>
          )}
          {canViewAllRequests(role) && (
            <TabsTrigger value="all-requests" data-testid="tab-all-requests">
              All Requests
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-requests">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No leave requests yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">Your leave requests will appear here once you submit them.</p>
          </div>
        </TabsContent>

        <TabsContent value="pending-approvals">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No pending approvals</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">Leave requests awaiting your approval will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="all-requests">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No leave requests yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">All organization leave requests will appear here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
