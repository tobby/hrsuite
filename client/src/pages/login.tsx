import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Shield, Users, User, Briefcase } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

const DEV_ACCOUNTS = [
  { email: "admin@test.com", password: "password123", role: "Admin", icon: Shield, color: "text-red-500" },
  { email: "manager@test.com", password: "password123", role: "Manager", icon: Users, color: "text-blue-500" },
  { email: "employee@test.com", password: "password123", role: "Employee", icon: User, color: "text-green-500" },
  { email: "contract@test.com", password: "password123", role: "Contract", icon: Briefcase, color: "text-orange-500" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const error = params.get("error");
    if (!error) return;

    const messages: Record<string, string> = {
      no_account: "No account found with this email. Please contact your administrator.",
      account_deactivated: "Your account has been deactivated.",
      google_auth_failed: "Google authentication failed. Please try again.",
      server_error: "An unexpected error occurred. Please try again.",
      invalid_state: "Authentication error. Please try again.",
    };
    toast({
      title: "Sign in failed",
      description: messages[error] || "An error occurred during sign in.",
      variant: "destructive",
    });
    // Clean up the URL
    window.history.replaceState({}, "", "/login");
  }, [search, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (error: any) {
      const message = error?.message || "Login failed";
      let description = "Please check your credentials and try again.";
      if (message.includes("Google sign-in")) {
        description = "This account uses Google sign-in. Please use the \"Sign in with Google\" button, or set a password in Settings.";
      } else if (message.includes("401")) {
        description = "Invalid email or password.";
      } else if (message.includes("403")) {
        description = "Your account has been deactivated.";
      }
      toast({ title: "Login failed", description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setLoadingRole(account.role);
    try {
      await login(account.email, account.password);
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Quick login failed",
        description: "Test accounts may not be seeded yet. Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-app-title">HRFlow</h1>
          <p className="text-muted-foreground mt-1">HR Management Platform</p>
        </div>
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your email and password to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignInButton context="login" label="Sign in with Google" />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                New company?{" "}
                <a
                  href="/setup"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={(e) => { e.preventDefault(); setLocation("/setup"); }}
                  data-testid="link-setup"
                >
                  Create your organization
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {import.meta.env.DEV && (
          <Card className="mt-4 border-dashed border-amber-500/50">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Dev Test Accounts</CardTitle>
              <CardDescription className="text-xs">Quick login as any role (password: password123)</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-2">
                {DEV_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <Button
                      key={account.role}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2"
                      disabled={loadingRole !== null}
                      onClick={() => handleQuickLogin(account)}
                      data-testid={`button-dev-login-${account.role.toLowerCase()}`}
                    >
                      {loadingRole === account.role ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${account.color}`} />
                      )}
                      <span className="text-xs">{account.role}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
