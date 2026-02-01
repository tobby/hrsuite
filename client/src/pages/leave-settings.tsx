import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { 
  leaveTypes, 
  employees, 
  leaveBalances,
  companyHolidays,
} from "@/lib/demo-data";

export default function LeaveSettings() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-settings-title">
            Leave Settings
          </h1>
        </div>
        <p className="text-muted-foreground">
          Configure leave types, company holidays, and employee balances
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-manage-leave-types">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Leave Types</CardTitle>
              <CardDescription>Configure leave type allocations</CardDescription>
            </div>
            <Button size="sm" data-testid="button-add-leave-type">
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`leave-type-row-${type.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: type.color }} />
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{type.defaultDays} days</Badge>
                    <Button size="icon" variant="ghost" data-testid={`button-edit-leave-type-${type.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-leave-type-${type.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-manage-holidays">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Company Holidays</CardTitle>
              <CardDescription>Manage company-wide holidays for 2026</CardDescription>
            </div>
            <Button size="sm" data-testid="button-add-holiday">
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {companyHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`holiday-row-${holiday.id}`}
                >
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(holiday.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" data-testid={`button-edit-holiday-${holiday.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-holiday-${holiday.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-manage-balances">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Employee Leave Balances</CardTitle>
              <CardDescription>Adjust individual employee leave allocations</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {leaveTypes.slice(0, 4).map((type) => (
                      <TableHead key={type.id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name.split(" ")[0]}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.slice(0, 8).map((emp) => (
                    <TableRow key={emp.id} data-testid={`balance-row-${emp.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </TableCell>
                      {leaveTypes.slice(0, 4).map((type) => {
                        const balance = leaveBalances.find((b) => b.employeeId === emp.id && b.leaveTypeId === type.id);
                        return (
                          <TableCell key={type.id} className="text-center">
                            <Badge variant="secondary">
                              {balance?.remainingDays ?? type.defaultDays} / {balance?.totalDays ?? type.defaultDays}
                            </Badge>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button size="sm" variant="ghost" data-testid={`button-edit-balance-${emp.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
