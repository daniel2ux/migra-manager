'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCompatDbPath, collectionPathToTarget, type TableTarget } from './path-mapper';
import { toCamelRow, toSnakeRow } from './field-map';

export type SupabaseDb = SupabaseClient;

export interface DocumentReference {
  path: string;
  id: string;
  parent: CollectionReference;
  _target: TableTarget;
}

export interface CollectionReference {
  path: string;
  id: string;
  parent: DocumentReference | null;
  _target: TableTarget;
  _segments: string[];
}

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  op?: string;
  value?: unknown;
  direction?: 'asc' | 'desc';
  count?: number;
}

export interface Query<T = CollectionReference> {
  _ref: T;
  _constraints: QueryConstraint[];
  path: string;
}

export interface QuerySnapshot<T = Record<string, unknown>> {
  docs: QueryDocumentSnapshot<T>[];
  empty: boolean;
  size: number;
}

export interface QueryDocumentSnapshot<T = Record<string, unknown>> {
  id: string;
  ref: DocumentReference;
  exists: () => boolean;
  data: () => T;
}

export interface DocumentSnapshot<T = Record<string, unknown>> {
  id: string;
  ref: DocumentReference;
  exists: () => boolean;
  data: () => T | undefined;
}

export interface WriteBatch {
  _ops: Array<() => Promise<void>>;
  set(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): WriteBatch;
  update(ref: DocumentReference, data: Record<string, unknown>): WriteBatch;
  delete(ref: DocumentReference): WriteBatch;
  commit(): Promise<void>;
}

export function createDbAdapter(client: SupabaseClient): SupabaseDb {
  return client;
}

export function doc(
  dbOrCol: SupabaseDb | CollectionReference,
  ...pathSegments: string[]
): DocumentReference {
  if (pathSegments.length === 0 && typeof dbOrCol === 'object' && '_segments' in dbOrCol) {
    const col = dbOrCol as CollectionReference;
    const newId = crypto.randomUUID();
    return {
      path: `${col.path}/${newId}`,
      id: newId,
      parent: col,
      _target: { ...col._target, id: newId },
    };
  }

  const _db = dbOrCol as SupabaseDb;
  const path = pathSegments.join('/');
  const target = parseCompatDbPath(path);
  const id = pathSegments[pathSegments.length - 1]!;
  return {
    path,
    id,
    parent: collection(_db, ...pathSegments.slice(0, -1)),
    _target: target,
  };
}

export function collection(
  _db: SupabaseDb,
  ...pathSegments: string[]
): CollectionReference {
  const path = pathSegments.join('/');
  const target = collectionPathToTarget(pathSegments);
  const parentSegments = pathSegments.slice(0, -1);
  return {
    path,
    id: pathSegments[pathSegments.length - 1] ?? path,
    parent: parentSegments.length > 0 ? doc(_db, ...parentSegments) : null,
    _target: target,
    _segments: pathSegments,
  };
}

export function query<T extends CollectionReference>(
  ref: T,
  ...constraints: QueryConstraint[]
): Query<T> {
  return { _ref: ref, _constraints: constraints, path: ref.path };
}

export function where(field: string, op: string, value: unknown): QueryConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): QueryConstraint {
  return { type: 'limit', count };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export function arrayUnion<T>(...items: T[]): { __arrayUnion: T[] } {
  return { __arrayUnion: items };
}

export function arrayRemove<T>(...items: T[]): { __arrayRemove: T[] } {
  return { __arrayRemove: items };
}

function resolveSnakeColumn(field: string): string {
  const snake = toSnakeRow({ [field]: true });
  return Object.keys(snake)[0] ?? field;
}

function applyFilters(
  q: any,
  target: TableTarget,
  constraints: QueryConstraint[],
) {
  for (const f of target.filters) {
    q = q.eq(f.column, f.value);
  }
  for (const c of constraints) {
    if (c.type === 'where' && c.field) {
      const col = resolveSnakeColumn(c.field);
      if (c.op === 'array-contains') {
        q = q.contains(col, [c.value]);
      } else if (c.op === '==') {
        if (c.value === null || c.value === undefined) {
          q = q.is(col, null);
        } else {
          q = q.eq(col, c.value);
        }
      } else if (c.op === 'in') {
        q = q.in(col, c.value as string[]);
      }
    } else if (c.type === 'orderBy') {
      const col = resolveSnakeColumn(c.field!);
      q = q.order(col, { ascending: c.direction !== 'desc' });
    } else if (c.type === 'limit' && c.count) {
      q = q.limit(c.count);
    }
  }
  return q;
}

function rowToDoc(ref: DocumentReference, row: Record<string, unknown>): QueryDocumentSnapshot {
  const camel = toCamelRow(row);
  return {
    id: String(row.id ?? ref.id),
    ref,
    exists: () => true,
    data: () => camel,
  };
}

export async function getDocs<T extends CollectionReference | Query<CollectionReference>>(
  refOrQuery: T,
): Promise<QuerySnapshot> {
  const client = getClient();
  const isQuery = '_constraints' in refOrQuery;
  const colRef = isQuery ? (refOrQuery as Query<CollectionReference>)._ref : (refOrQuery as CollectionReference);
  const constraints = isQuery ? (refOrQuery as Query<CollectionReference>)._constraints : [];
  const target = colRef._target;

  let q = client.from(target.table).select('*');
  q = applyFilters(q, target, constraints);

  const { data, error } = await q;
  if (error) throw Object.assign(new Error(error.message), { code: error.code });

  const docs = (data ?? []).map((row) => {
    const id = String((row as Record<string, unknown>).id ?? '');
    const docRef = doc(client, ...colRef._segments, id);
    return rowToDoc(docRef, row as Record<string, unknown>);
  });

  return { docs, empty: docs.length === 0, size: docs.length };
}

export async function getDoc(docRef: DocumentReference): Promise<DocumentSnapshot> {
  const client = getClient();
  const target = docRef._target;

  if (target.key) {
    const { data, error } = await client.from(target.table).select('*').eq('key', target.key).maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    if (!data) return { id: target.key, ref: docRef, exists: () => false, data: () => undefined };
    const camel = toCamelRow(data as Record<string, unknown>);
    if (target.table === 'app_config') {
      return { id: target.key, ref: docRef, exists: () => true, data: () => ({ ...(data as Record<string, unknown>).value as object, ...camel }) };
    }
    return { id: target.key, ref: docRef, exists: () => true, data: () => camel };
  }

  let q = client.from(target.table).select('*');
  for (const f of target.filters) {
    q = q.eq(f.column, f.value);
  }
  if (target.id) {
    q = q.eq('id', target.id);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  if (!data) return { id: docRef.id, ref: docRef, exists: () => false, data: () => undefined };
  return { id: docRef.id, ref: docRef, exists: () => true, data: () => toCamelRow(data as Record<string, unknown>) };
}

async function writeDoc(
  docRef: DocumentReference,
  data: Record<string, unknown>,
  options?: { merge?: boolean },
) {
  const client = getClient();
  const target = docRef._target;
  let payload = toSnakeRow(resolveSpecialFields(data));

  if (target.table === 'app_config' && target.key) {
    const { error } = await client.from('app_config').upsert({
      key: target.key,
      value: payload,
      updated_at: new Date().toISOString(),
    });
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    return;
  }

  if (target.id) payload.id = target.id;
  for (const f of target.filters) {
    payload[f.column] = f.value;
  }

  if (target.table === 'sessions') {
    payload.updated_at = new Date().toISOString();
    const { error } = await client.from('sessions').upsert(payload, { onConflict: 'user_id' });
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    return;
  }

  if (options?.merge && target.id) {
    const updatePayload = { ...payload };
    delete updatePayload.id;
    let q = client.from(target.table).update(updatePayload).eq('id', target.id);
    for (const f of target.filters) q = q.eq(f.column, f.value);
    const { data, error } = await q.select('id').maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    if (!data) {
      const { error: upsertError } = await client.from(target.table).upsert(payload);
      if (upsertError) throw Object.assign(new Error(upsertError.message), { code: upsertError.code });
    }
    return;
  }

  const { error } = await client.from(target.table).upsert(payload);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

function resolveSpecialFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && '__arrayUnion' in (v as object)) {
      out[k] = v;
    } else if (v && typeof v === 'object' && '__arrayRemove' in (v as object)) {
      out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function setDoc(
  docRef: DocumentReference,
  data: Record<string, unknown>,
  options?: { merge?: boolean },
) {
  await writeDoc(docRef, data, options);
}

export async function updateDoc(docRef: DocumentReference, data: Record<string, unknown>) {
  const client = getClient();
  const target = docRef._target;
  const resolved = resolveSpecialFields(data);
  const snake = toSnakeRow(resolved);

  for (const [k, v] of Object.entries(resolved)) {
    if (v && typeof v === 'object' && '__arrayUnion' in (v as object)) {
      const col = (toSnakeRow({ [k]: v }) as Record<string, unknown>)[k] as string;
      const { data: existing } = await getDoc(docRef);
      const current = (existing?.() as Record<string, unknown>)?.[k] ?? [];
      snake[col] = [...(Array.isArray(current) ? current : []), ...(v as { __arrayUnion: unknown[] }).__arrayUnion];
    }
    if (v && typeof v === 'object' && '__arrayRemove' in (v as object)) {
      const col = (toSnakeRow({ [k]: v }) as Record<string, unknown>)[k] as string;
      const { data: existing } = await getDoc(docRef);
      const current = (existing?.() as Record<string, unknown>)?.[k] ?? [];
      const removeSet = new Set((v as { __arrayRemove: unknown[] }).__arrayRemove.map(String));
      snake[col] = (Array.isArray(current) ? current : []).filter((x) => !removeSet.has(String(x)));
    }
  }

  let q = client.from(target.table).update(snake);
  for (const f of target.filters) q = q.eq(f.column, f.value);
  if (target.id) q = q.eq('id', target.id);
  if (target.key) q = q.eq('key', target.key);

  const { error } = await q;
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

export async function deleteDoc(docRef: DocumentReference) {
  const client = getClient();
  const target = docRef._target;
  let q = client.from(target.table).delete();
  for (const f of target.filters) q = q.eq(f.column, f.value);
  if (target.id) q = q.eq('id', target.id);
  if (target.key) q = q.eq('key', target.key);
  const { error } = await q;
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

export async function addDoc(colRef: CollectionReference, data: Record<string, unknown>) {
  const client = getClient();
  const target = colRef._target;
  const payload = toSnakeRow(resolveSpecialFields(data));
  for (const f of target.filters) {
    payload[f.column] = f.value;
  }
  const { data: row, error } = await client.from(target.table).insert(payload).select().single();
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return doc(client, ...colRef._segments, String((row as Record<string, unknown>).id));
}

export function writeBatch(_db: SupabaseDb): WriteBatch {
  const ops: Array<() => Promise<void>> = [];
  const batch: WriteBatch = {
    _ops: ops,
    set(ref, data, options) {
      ops.push(() => setDoc(ref, data, options));
      return batch;
    },
    update(ref, data) {
      ops.push(() => updateDoc(ref, data));
      return batch;
    },
    delete(ref) {
      ops.push(() => deleteDoc(ref));
      return batch;
    },
    async commit() {
      await Promise.all(ops.map((op) => op()));
    },
  };
  return batch;
}

export async function runTransaction<T>(
  _db: SupabaseDb,
  fn: (tx: { get: typeof getDoc; set: typeof setDoc; update: typeof updateDoc; delete: typeof deleteDoc }) => Promise<T>,
): Promise<T> {
  return fn({ get: getDoc, set: setDoc, update: updateDoc, delete: deleteDoc });
}

let _client: SupabaseClient | null = null;

export function setQueryClient(client: SupabaseClient) {
  _client = client;
}

function getClient(): SupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized');
  return _client;
}

let realtimeSubCounter = 0;

function uniqueChannelName(prefix: string): string {
  realtimeSubCounter += 1;
  return `${prefix}:${realtimeSubCounter}:${crypto.randomUUID()}`;
}

export function subscribeCollection(
  target: TableTarget,
  constraints: QueryConstraint[],
  onData: (rows: Record<string, unknown>[]) => void,
  onError: (err: Error) => void,
): { unsubscribe: () => void; refetch: () => void } {
  const client = getClient();

  const fetchData = async () => {
    try {
      let q = client.from(target.table).select('*');
      q = applyFilters(q, target, constraints);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      onData((data ?? []) as Record<string, unknown>[]);
    } catch (e) {
      onError(e as Error);
    }
  };

  const channel = client
    .channel(uniqueChannelName(`rt:col:${target.table}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: target.table }, () => {
      void fetchData();
    })
    .subscribe();

  void fetchData();

  return {
    unsubscribe: () => {
      void client.removeChannel(channel);
    },
    refetch: () => {
      void fetchData();
    },
  };
}

export function subscribeDoc(
  docRef: DocumentReference,
  onData: (row: Record<string, unknown> | null) => void,
  onError: (err: Error) => void,
): () => void {
  const client = getClient();
  const target = docRef._target;

  const fetchData = async () => {
    try {
      const snap = await getDoc(docRef);
      onData(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    } catch (e) {
      onError(e as Error);
    }
  };

  const changeFilter = target.id ? { filter: `id=eq.${target.id}` } : {};
  const channel = client
    .channel(uniqueChannelName(`rt:doc:${docRef.path}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: target.table, ...changeFilter },
      () => {
        void fetchData();
      },
    )
    .subscribe();

  void fetchData();

  return () => {
    void client.removeChannel(channel);
  };
}
