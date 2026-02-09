import { Calendar, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link } from "wouter";

export default function AppraisalCycles() {
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Access restricted to administrators only</p>
        <Link href="/appraisals">
          <Button variant="ghost" className="mt-4">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-cycles-title">
              Appraisal Cycles
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage performance review cycles and participant assignments
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No appraisal cycles yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Create your first performance review cycle to start evaluating employee performance.
        </p>
      </div>
    </div>
  );
}
