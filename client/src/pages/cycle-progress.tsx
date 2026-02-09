import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link, useParams } from "wouter";

export default function CycleProgress() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground" data-testid="text-access-restricted">Access restricted to administrators only</p>
        <Link href="/appraisals">
          <Button variant="ghost" className="mt-4" data-testid="button-back-appraisals-error">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/appraisals/cycles">
          <Button variant="ghost" size="icon" data-testid="button-back-cycles">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-cycle-progress-title">
            Cycle Progress
          </h1>
          <p className="text-muted-foreground">Track review completion for this cycle</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No cycle data yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Cycle progress details will appear here once a review cycle is created and participants are assigned.
        </p>
      </div>
    </div>
  );
}
