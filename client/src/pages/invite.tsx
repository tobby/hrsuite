import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Invite() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: invite, isLoading: isValidating, error } = useQuery<{
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    companyName: string;
  }>({
    queryKey: [`/api/invite/${token}`],
    retry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", `/api/invite/${token}/accept`, { password });
      setIsAccepted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setTimeout(() => setLocation("/"), 2000);
    } catch (error: any) {
      const message = error?.message || "Failed to activate account";
      toast({ title: "Activation failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold">Invalid or expired invite</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This invite link is no longer valid. Please contact your administrator for a new one.
                </p>
              </div>
              <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-back-login">
                Go to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold">Account activated</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome to {invite.companyName}! Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-app-title">HRFlow</h1>
          <p className="text-muted-foreground mt-1">Activate your account</p>
        </div>
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome, {invite.firstName}!</CardTitle>
            <CardDescription>
              You've been invited to join {invite.companyName} as {invite.position}. Set a password to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invite.email} disabled data-testid="input-invite-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-activate">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
