'use client';

import { useState, useEffect } from 'react';
import type { DocumentReference } from '@/supabase/query-builder';
import { subscribeDoc } from '@/supabase/query-builder';
import { toCamelRow } from '@/supabase/field-map';
import { errorEmitter } from '@/supabase/error-emitter';
import { FirestorePermissionError } from '@/supabase/errors';
import { useSupabase } from '@/supabase/provider';
import type { WithId } from './types';

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDoc<T = Record<string, unknown>>(
  memoizedDocRef: DocumentReference | null | undefined,
): UseDocResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedDocRef);
  const [error, setError] = useState<Error | null>(null);
  const refPath = memoizedDocRef?.path ?? null;
  const { isUserLoading } = useSupabase();

  useEffect(() => {
    if (isUserLoading) return;
    if (!memoizedDocRef || !refPath) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsub = subscribeDoc(
      memoizedDocRef,
      (row) => {
        if (!row) {
          setData(null);
        } else {
          const camel = toCamelRow(row) as WithId<T>;
          setData({ ...camel, id: String(row.id ?? memoizedDocRef.id), __path: refPath });
        }
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        if ((err as { code?: string }).code === '42501' || err.message.includes('policy')) {
          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
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
  }, [refPath, isUserLoading, memoizedDocRef]);

  return { data, isLoading, error };
}
