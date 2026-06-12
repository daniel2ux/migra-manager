export * from '@/supabase/query-builder';
import { subscribeCollection, subscribeDoc, getDocs, getDoc, type CollectionReference, type DocumentReference, type Query } from '@/supabase/query-builder';
import { toCamelRow } from '@/supabase/field-map';

export type Firestore = import('@supabase/supabase-js').SupabaseClient;
export type FirestoreError = Error & { code?: string };
export type DocumentData = Record<string, unknown>;
export type DocumentReference = import('@/supabase/query-builder').DocumentReference;
export type CollectionReference = import('@/supabase/query-builder').CollectionReference;
export type Query<T = CollectionReference> = import('@/supabase/query-builder').Query<T>;
export type DocumentSnapshot<T = DocumentData> = import('@/supabase/query-builder').DocumentSnapshot<T>;
export type QuerySnapshot<T = DocumentData> = import('@/supabase/query-builder').QuerySnapshot<T>;
export type QueryDocumentSnapshot<T = DocumentData> = import('@/supabase/query-builder').QueryDocumentSnapshot<T>;

export class Timestamp {
  constructor(
    public seconds: number,
    public nanoseconds = 0,
  ) {}

  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
  }

  toMillis() {
    return this.seconds * 1000 + this.nanoseconds / 1e6;
  }

  static now() {
    const ms = Date.now();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }

  static fromDate(d: Date) {
    const ms = d.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
}

export function arrayRemove<T>(...items: T[]) {
  return { __arrayRemove: items };
}

export function arrayUnion<T>(...items: T[]) {
  return { __arrayUnion: items };
}

/** collectionGroup('migrationObjects') → query migration_objects table */
export function collectionGroup(_db: Firestore, segment: string): CollectionReference {
  const tableMap: Record<string, string> = {
    migrationObjects: 'migration_objects',
    mocks: 'mocks',
    comments: 'comments',
  };
  const table = tableMap[segment] ?? segment;
  return {
    path: segment,
    id: segment,
    parent: null,
    _target: { table, filters: [] },
    _segments: [segment],
  };
}

export function startAfter(_doc: QueryDocumentSnapshot): QueryConstraint {
  return { type: 'where', field: '__startAfter', op: '>', value: _doc.id };
}

type QueryConstraint = import('@/supabase/query-builder').QueryConstraint;

export async function getCountFromServer(ref: CollectionReference | Query<CollectionReference>) {
  const snap = await getDocs(ref);
  return { data: () => ({ count: snap.size }) };
}

export function onSnapshot(
  ref: DocumentReference,
  onNext: (snap: DocumentSnapshot) => void,
  onError?: (err: Error) => void,
): () => void;
export function onSnapshot(
  ref: CollectionReference | Query<CollectionReference>,
  onNext: (snap: QuerySnapshot) => void,
  onError?: (err: Error) => void,
): () => void;
export function onSnapshot(
  ref: DocumentReference | CollectionReference | Query<CollectionReference>,
  onNext: (snap: DocumentSnapshot | QuerySnapshot) => void,
  onError?: (err: Error) => void,
) {
  const isCollection = '_segments' in (ref as CollectionReference);
  const isQuery = '_constraints' in (ref as Query<CollectionReference>);

  if (!isCollection && !isQuery) {
    const docRef = ref as DocumentReference;
    return subscribeDoc(
      docRef,
      (row) => {
        onNext({
          id: docRef.id,
          ref: docRef,
          exists: () => row !== null,
          data: () => (row ? toCamelRow(row) : undefined),
        });
      },
      (err) => onError?.(err),
    );
  }

  const colRef = isQuery ? (ref as Query<CollectionReference>)._ref : (ref as CollectionReference);
  const constraints = isQuery ? (ref as Query<CollectionReference>)._constraints : [];

  return subscribeCollection(
    colRef._target,
    constraints,
    (rows) => {
      const docs = rows.map((row) => {
        const id = String((row as Record<string, unknown>).id ?? '');
        const docRef = { ...colRef, path: `${colRef.path}/${id}`, id } as DocumentReference;
        const camel = toCamelRow(row as Record<string, unknown>);
        return {
          id,
          ref: docRef,
          exists: () => true,
          data: () => camel,
        };
      });
      onNext({ docs, empty: docs.length === 0, size: docs.length });
    },
    (err) => onError?.(err),
  );
}
