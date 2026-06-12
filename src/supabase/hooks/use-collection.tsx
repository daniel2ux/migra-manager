'use client';

import { useState, useEffect } from 'react';
import type { CollectionReference, Query } from '@/supabase/query-builder';
import { subscribeCollection } from '@/supabase/query-builder';
import { toCamelRow } from '@/supabase/field-map';
import { errorEmitter } from '@/supabase/error-emitter';
import { FirestorePermissionError } from '@/supabase/errors';
import { useSupabase } from '@/supabase/provider';

export type WithId<T> = T & { id: string; __path: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCollection<T = Record<string, unknown>>(
  memoizedTargetRefOrQuery:
    | ((CollectionReference | Query<CollectionReference>) & { __memo?: boolean })
    | null
    | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedTargetRefOrQuery);
  const [error, setError] = useState<Error | null>(null);
  const { isUserLoading } = useSupabase();

  const pathKey = memoizedTargetRefOrQuery
    ? '_constraints' in memoizedTargetRefOrQuery
      ? `${memoizedTargetRefOrQuery.path}:${JSON.stringify(memoizedTargetRefOrQuery._constraints)}`
      : memoizedTargetRefOrQuery.path
    : null;

  useEffect(() => {
    if (isUserLoading) return;

    if (!memoizedTargetRefOrQuery || !pathKey) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const isQuery = '_constraints' in memoizedTargetRefOrQuery;
    const colRef = isQuery
      ? (memoizedTargetRefOrQuery as Query<CollectionReference>)._ref
      : (memoizedTargetRefOrQuery as CollectionReference);
    const constraints = isQuery
      ? (memoizedTargetRefOrQuery as Query<CollectionReference>)._constraints
      : [];

    const unsub = subscribeCollection(
      colRef._target,
      constraints,
      (rows) => {
        const mapped = rows.map((row) => {
          const id = String((row as Record<string, unknown>).id ?? '');
          const camel = toCamelRow(row as Record<string, unknown>) as WithId<T>;
          return { ...camel, id, __path: `${colRef.path}/${id}` };
        });
        setData(mapped);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        if ((err as { code?: string }).code === '42501' || err.message.includes('policy')) {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: colRef.path,
          });
          setError(contextualError);
          setData(null);
          errorEmitter.emit('permission-error', contextualError);
        } else {
          setError(err);
          setData(null);
        }
        setIsLoading(false);
      },
    );

    return () => unsub();
  }, [pathKey, isUserLoading, memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
