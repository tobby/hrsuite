import { FileText, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link } from "wouter";

export default function AppraisalTemplates() {
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center mb-4">
          Only administrators can manage appraisal templates.
        </p>
        <Link href="/appraisals">
          <Button variant="outline" data-testid="button-back-to-appraisals">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-templates-title">
              Review Templates
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and manage templates for performance reviews
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No templates yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Create review templates with rating scales and text questions to standardize your performance evaluation process.
        </p>
      </div>
    </div>
  );
}
