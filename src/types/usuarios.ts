export type UserRole = "master" | "admin" | "especialista" | "membro";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  status?: string;
  isDisabled?: boolean;
  phone?: string;
  company?: string;
  position?: string;
  department?: string;
  manager?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  isMaster?: boolean;
  migradorName?: string;
  fromEmail?: string;
  emailSignatures?: EmailSignature[];
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  imageUrl?: string;
}

export interface UserFormData {
  name: string;
  phone: string;
  company: string;
  position: string;
  department: string;
  manager: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  reason: string;
}

export interface ResetPasswordResult {
  name: string;
  tempPassword: string;
}

export const ROLE_COLORS: Record<UserRole, string> = {
  master: "bg-violet-600 text-white shadow-xs",
  admin: "bg-SkyBlue-500 text-white shadow-xs",
  especialista: "bg-slate-900 text-white shadow-xs",
  membro: "bg-slate-100 text-slate-500",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  master: "Master",
  admin: "Governança",
  especialista: "Especialista",
  membro: "Consultoria",
};

export const ROLE_BORDER_COLORS: Record<UserRole, string> = {
  master: "border-violet-500/20 bg-violet-500",
  admin: "border-SkyBlue-500/20 bg-SkyBlue-500",
  especialista: "border-emerald-500/20 bg-emerald-400",
  membro: "border-emerald-500/20 bg-emerald-400",
};
