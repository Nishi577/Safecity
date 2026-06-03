import { Shield, User, Eye, Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_EMAIL_DOMAINS } from "@/lib/roleValidation";
import type { AppRole } from "@/lib/roleValidation";

interface RoleSelectorProps {
  value: AppRole;
  onChange: (role: AppRole) => void;
}

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  citizen: User,
  field_police: Shield,
  higher_officer: Eye,
  admin: Settings,
};

const RoleSelector = ({ value, onChange }: RoleSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label>Select your role</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as AppRole)} className="grid gap-3">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => {
          const Icon = ROLE_ICONS[role];
          const domain = ROLE_EMAIL_DOMAINS[role];
          
          return (
            <label
              key={role}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                value === role 
                  ? 'border-accent bg-accent/5' 
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <RadioGroupItem value={role} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${value === role ? 'text-accent' : 'text-muted-foreground'}`} />
                  <span className="font-medium">{ROLE_LABELS[role]}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[role]}</p>
                
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default RoleSelector;
