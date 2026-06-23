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
  projectIds?: string[];
  projectOrder?: string[];
  primaryProjectId?: string;
  isMaster?: boolean;
  accessProfileId?: string | null;
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
  accessProfileId?: string | null;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  company: string;
  position: string;
  reason: string;
  accessProfileId?: string | null;
}

export interface ResetPasswordResult {
  name: string;
  email?: string;
  tempPassword: string;
  emailSent?: boolean;
  emailError?: string;
  messageId?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  master: "Master",
  admin: "Governança",
  especialista: "Especialista",
  membro: "Consultoria",
};
