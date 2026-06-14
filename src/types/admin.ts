
export type SessionAction = 'logout' | 'block' | 'block-logout' | 'delete' | 'unlock';

export interface ActionRequest {
  targetUid: string;
  action: SessionAction;
  callerToken: string;
}

export type UserRole = 'master' | 'admin' | 'especialista' | 'membro';

export interface ChangeRoleRequest {
  targetUid: string;
  newRole: UserRole;
  reason: string;
  callerToken: string;
  accessProfileId?: string | null;
}
