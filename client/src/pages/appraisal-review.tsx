import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox } from "lucide-react";
import { Link, useParams } from "wouter";

export default function AppraisalReview() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/appraisals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-review-title">
            Performance Review
          </h1>
          <p className="text-muted-foreground">Complete your assigned review</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No review found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          This review does not exist or has not been assigned yet.
        </p>
      </div>
    </div>
  );
}
