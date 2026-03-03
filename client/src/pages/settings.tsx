import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  User,
  Building2,
  Save,
  Loader2,
} from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Department } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().default(""),
  dateOfBirth: z.string().optional().default(""),
  homeAddress: z.string().optional().default(""),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const { role, currentUser } = useRole();
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const department = departments.find(d => d.id === currentUser.departmentId);
  const { toast } = useToast();

  const { data: birthdayReminderDays } = useQuery<{ value: string }>({
    queryKey: ['/api/company-settings/birthday-reminder-days'],
    enabled: canEditOrgSettings(role),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      phone: currentUser.phone || "",
      dateOfBirth: (currentUser as any).dateOfBirth || "",
      homeAddress: (currentUser as any).homeAddress || "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const birthdayReminderMutation = useMutation({
    mutationFn: async (days: string) => {
      await apiRequest("PUT", "/api/company-settings/birthday-reminder-days", { value: days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings/birthday-reminder-days"] });
      toast({ title: "Setting Updated", description: "Birthday reminder days updated." });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          {canEditOrgSettings(role) && (
            <TabsTrigger value="organization" data-testid="tab-organization">
              <Building2 className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl" data-testid="avatar-user">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" data-testid="button-change-photo">
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              {currentUser.employeeId && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Employee ID:</Label>
                  <span className="font-mono text-sm font-medium" data-testid="text-my-employee-id">{currentUser.employeeId}</span>
                </div>
              )}

              <Separator />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled className="disabled:opacity-70 disabled:cursor-not-allowed" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date-of-birth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="homeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Address</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter your home address"
                            rows={3}
                            data-testid="input-home-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={profileMutation.isPending} data-testid="button-save-profile">
                      {profileMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {profileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>
                Your role and department information (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Position</Label>
                  <p className="font-medium" data-testid="text-position">{currentUser.position}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="font-medium" data-testid="text-department">{department?.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Hire Date</Label>
                  <p className="font-medium" data-testid="text-hire-date">
                    {currentUser.hireDate ? new Date(currentUser.hireDate).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Employee ID</Label>
                  <p className="font-medium font-mono text-sm" data-testid="text-employee-id">{currentUser.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Company-wide configuration (Admin only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    defaultValue="Acme Corporation"
                    disabled
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                  <Input 
                    id="fiscalYear" 
                    defaultValue="January"
                    disabled
                    data-testid="input-fiscal-year"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Contact your HR administrator to update organization settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Birthday Reminders</CardTitle>
              <CardDescription>
                Configure how many days before an employee's birthday you receive a reminder on the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="birthdayDays">Remind me</Label>
                <Select
                  value={birthdayReminderDays?.value || "3"}
                  onValueChange={(val) => birthdayReminderMutation.mutate(val)}
                  data-testid="select-birthday-reminder-days"
                >
                  <SelectTrigger className="w-[120px]" data-testid="select-birthday-reminder-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">before the birthday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Policy</CardTitle>
              <CardDescription>
                Default leave allocations (Admin only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-md border" data-testid="card-leave-policy-annual">
                  <p className="text-sm text-muted-foreground">Annual Leave</p>
                  <p className="text-2xl font-bold">20 days</p>
                </div>
                <div className="p-4 rounded-md border" data-testid="card-leave-policy-sick">
                  <p className="text-sm text-muted-foreground">Sick Leave</p>
                  <p className="text-2xl font-bold">10 days</p>
                </div>
                <div className="p-4 rounded-md border" data-testid="card-leave-policy-personal">
                  <p className="text-sm text-muted-foreground">Personal Leave</p>
                  <p className="text-2xl font-bold">5 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
