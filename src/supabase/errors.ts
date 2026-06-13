'use client';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: unknown;
};

interface SecurityRuleRequest {
  auth: { uid: string } | null;
  method: SecurityRuleContext['operation'];
  path: string;
  resource?: { data: unknown };
}

export class SupabasePermissionError extends Error {
  public readonly request: SecurityRuleRequest;
  public code = 'permission-denied';

  constructor(context: SecurityRuleContext) {
    const requestObject: SecurityRuleRequest = {
      auth: null,
      method: context.operation,
      path: context.path,
      resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
    };
    super(`RLS policy denied: ${context.path}`);
    this.name = 'PostgrestError';
    this.request = requestObject;
  }
}
