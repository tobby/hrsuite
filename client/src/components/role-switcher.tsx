import { useRole, UserRole, demoUsers } from "@/lib/role-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Shield, Crown, ChevronDown, FileCheck } from "lucide-react";

const roleConfig: Record<UserRole, { label: string; icon: typeof User; color: string }> = {
  employee: { 
    label: "Employee", 
    icon: User, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  manager: { 
    label: "Manager", 
    icon: Shield, 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" 
  },
  admin: { 
    label: "Admin", 
    icon: Crown, 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
  },
  contract: {
    label: "Contract",
    icon: FileCheck,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
};

export function RoleSwitcher() {
  const { role, setRole, currentUser } = useRole();
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-role-switcher">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm font-medium" data-testid="text-current-user">
              {currentUser.firstName}
            </span>
            <Badge variant="secondary" className={`text-xs ${config.color}`} data-testid="badge-current-role">
              <RoleIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Demo Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(roleConfig) as UserRole[]).map((roleKey) => {
          const cfg = roleConfig[roleKey];
          const user = demoUsers[roleKey];
          const Icon = cfg.icon;
          const isActive = role === roleKey;
          
          return (
            <DropdownMenuItem
              key={roleKey}
              onClick={() => setRole(roleKey)}
              className={`flex items-center gap-3 p-3 cursor-pointer ${isActive ? "bg-muted" : ""}`}
              data-testid={`menu-item-role-${roleKey}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`text-xs ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium" data-testid={`text-role-user-${roleKey}`}>
                    {user.firstName} {user.lastName}
                  </span>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>{cfg.label}</span>
                  <span>•</span>
                  <span>{user.position}</span>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Switch roles to see different views and permissions
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
