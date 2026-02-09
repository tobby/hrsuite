import { ClipboardCheck, Inbox } from "lucide-react";
import { useRole } from "@/lib/role-context";

export default function Appraisals() {
  const { currentUser } = useRole();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-appraisals-title">
            My Appraisals
          </h1>
        </div>
        <p className="text-muted-foreground">
          View and complete your performance reviews
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No appraisals yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          When performance review cycles are created and you are assigned reviews, they will appear here.
        </p>
      </div>
    </div>
  );
}
