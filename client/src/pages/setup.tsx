import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function Setup() {
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const error = params.get("error");
    if (!error) return;

    const messages: Record<string, string> = {
      company_name_required: "Please enter a company name before signing up with Google.",
      google_auth_failed: "Google authentication failed. Please try again.",
      server_error: "An unexpected error occurred. Please try again.",
    };
    toast({
      title: "Setup failed",
      description: messages[error] || "An error occurred.",
      variant: "destructive",
    });
    window.history.replaceState({}, "", "/setup");
  }, [search, toast]);

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
      await apiRequest("POST", "/api/setup", { companyName, firstName, lastName, email, password });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Organization created", description: "Welcome to HRFlow! Your organization has been set up." });
      setLocation("/");
    } catch (error: any) {
      const message = error?.message || "Setup failed";
      let description = "Something went wrong. Please try again.";
      if (message.includes("already exists")) {
        description = "An account with this email already exists.";
      }
      toast({ title: "Setup failed", description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-app-title">HRFlow</h1>
          <p className="text-muted-foreground mt-1">Set up your organization</p>
        </div>
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create your organization</CardTitle>
            <CardDescription>Set up your company and admin account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  data-testid="input-company-name"
                />
              </div>
              <GoogleSignInButton
                context="setup"
                companyName={companyName}
                label="Sign up with Google"
                disabled={!companyName.trim()}
              />
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
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
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-create-org">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create organization"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                onClick={(e) => { e.preventDefault(); setLocation("/login"); }}
                data-testid="link-login"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
