// Role-based email domain validation

export type AppRole = 'citizen' | 'field_police' | 'higher_officer' | 'admin';

export const ROLE_EMAIL_DOMAINS: Record<AppRole, string | null> = {
  citizen: null, // Any email allowed
  field_police: '@officer.com',
  higher_officer: '@higherofficer.com',
  admin: '@admincity.com',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  citizen: 'Citizen',
  field_police: 'Field Officer',
  higher_officer: 'Higher Officer',
  admin: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  citizen: 'Report incidents and track case progress',
  field_police: 'Execute assigned cases and submit daily updates',
  higher_officer: 'Review, prioritize, and assign cases',
  admin: 'Manage users, roles, and system configuration',
};

export function validateEmailForRole(email: string, role: AppRole): { valid: boolean; message?: string } {
  const requiredDomain = ROLE_EMAIL_DOMAINS[role];
  
  if (requiredDomain === null) {
    return { valid: true };
  }
  
  if (!email.toLowerCase().endsWith(requiredDomain.toLowerCase())) {
    return {
      valid: false,
      message: `${ROLE_LABELS[role]} accounts require an email ending with ${requiredDomain}`,
    };
  }
  
  return { valid: true };
}

export function getRoleFromEmail(email: string): AppRole | null {
  const lowerEmail = email.toLowerCase();
  
  if (lowerEmail.endsWith('@admincity.com')) return 'admin';
  if (lowerEmail.endsWith('@higherofficer.com')) return 'higher_officer';
  if (lowerEmail.endsWith('@officer.com')) return 'field_police';
  
  return 'citizen';
}
