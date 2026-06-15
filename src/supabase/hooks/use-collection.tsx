'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CollectionReference, Query } from '@/supabase/query-builder';
import { subscribeCollection } from '@/supabase/query-builder';
import { toCamelRow } from '@/supabase/field-map';
import { errorEmitter } from '@/supabase/error-emitter';
import { SupabasePermissionError } from '@/supabase/errors';
import { useSupabase } from '@/supabase/provider';
import type { WithId } from './types';

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
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
  const softRefetchRef = useRef<(() => void) | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const refetch = useCallback(() => {
    void softRefetchRef.current?.();
  }, []);
  const { isUserLoading } = useSupabase();

  const pathKey = memoizedTargetRefOrQuery
    ? '_constraints' in memoizedTargetRefOrQuery
      ? `${memoizedTargetRefOrQuery.path}:${JSON.stringify(memoizedTargetRefOrQuery._constraints)}`
      : memoizedTargetRefOrQuery.path
    : null;

  const targetRef = useRef(memoizedTargetRefOrQuery);

  useEffect(() => {
    targetRef.current = memoizedTargetRefOrQuery;
  }, [memoizedTargetRefOrQuery]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [pathKey]);

  useEffect(() => {
    if (isUserLoading) return;

    const memoizedTargetRefOrQuery = targetRef.current;

    if (!memoizedTargetRefOrQuery || !pathKey) {
      setData(null);
      setIsLoading(false);
      setError(null);
      hasLoadedOnceRef.current = false;
      softRefetchRef.current = null;
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const isQuery = '_constraints' in memoizedTargetRefOrQuery;
    const colRef = isQuery
      ? (memoizedTargetRefOrQuery as Query<CollectionReference>)._ref
      : (memoizedTargetRefOrQuery as CollectionReference);
    const constraints = isQuery
      ? (memoizedTargetRefOrQuery as Query<CollectionReference>)._constraints
      : [];

    let cancelled = false;

    const { unsubscribe, refetch: refetchSubscription } = subscribeCollection(
      colRef._target,
      constraints,
      (rows) => {
        if (cancelled) return;
        const mapped = rows.map((row) => {
          const id = String((row as Record<string, unknown>).id ?? '');
          const camel = toCamelRow(row as Record<string, unknown>) as WithId<T>;
          return { ...camel, id, __path: `${colRef.path}/${id}` };
        });
        setData(mapped);
        setError(null);
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      },
      (err) => {
        if (cancelled) return;
        if ((err as { code?: string }).code === '42501' || err.message.includes('policy')) {
          const contextualError = new SupabasePermissionError({
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

    softRefetchRef.current = refetchSubscription;

    return () => {
      cancelled = true;
      softRefetchRef.current = null;
      unsubscribe();
    };
  }, [pathKey, isUserLoading]);

  return { data, isLoading, error, refetch };
}
