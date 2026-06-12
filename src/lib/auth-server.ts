import { verifyCallerRole } from '@/lib/admin-auth';

export async function verifyAdminOrMaster(token: string) {
  return verifyCallerRole(token, ['admin', 'master']);
}
