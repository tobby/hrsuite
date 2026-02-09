import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link, useParams } from "wouter";

export default function AppraisalResults() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/appraisals">
          <Button variant="ghost" size="icon" data-testid="button-back-appraisals">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-results-title">
            Appraisal Results
          </h1>
          <p className="text-muted-foreground">View performance review results</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No results yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Appraisal results will appear here once review cycles are completed and feedback is submitted.
        </p>
      </div>
    </div>
  );
}
