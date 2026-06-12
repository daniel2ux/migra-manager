import { getSupabaseAdmin } from '@/supabase/admin';

export interface WhereConstraint {
  field: string;
  op: '==' | 'in' | 'array-contains';
  value: unknown;
}

export async function deleteBatch(
  table: string,
  constraints: WhereConstraint[],
  batchSize = 400,
): Promise<number> {
  const admin = getSupabaseAdmin();
  let deleted = 0;

  while (true) {
    let q = admin.from(table).select('id').limit(batchSize);
    for (const { field, op, value } of constraints) {
      if (op === '==') q = q.eq(field, value);
      else if (op === 'in') q = q.in(field, value as string[]);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;

    const ids = data.map((r) => (r as { id: string }).id);
    const { error: delError } = await admin.from(table).delete().in('id', ids);
    if (delError) throw delError;
    deleted += ids.length;
    if (ids.length < batchSize) break;
  }

  return deleted;
}
