'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/supabase';

const LOCK_COLLECTION = 'editLocks';

class LockConflictError extends Error {
  readonly lockedByName: string;
  constructor(lockedByName: string) {
    super('LOCKED_BY_OTHER');
    this.lockedByName = lockedByName;
  }
}
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface EditLockData {
  userId?: string;
  userName?: string;
  userEmail?: string;
  lockedAt?: { toMillis?: () => number } | string | number;
}

function getLockedAtMs(lockedAt: EditLockData['lockedAt']): number {
  if (!lockedAt) return 0;
  if (typeof lockedAt === 'object' && typeof lockedAt.toMillis === 'function') {
    return lockedAt.toMillis();
  }
  if (typeof lockedAt === 'string') return new Date(lockedAt).getTime();
  if (typeof lockedAt === 'number') return lockedAt;
  return 0;
}

export interface EditLockState {
  /** True when the currently-watched resource is locked by another user */
  isLockedByOther: boolean;
  lockedByName: string | null;
}

export interface AcquireResult {
  acquired: boolean;
  lockedByName?: string;
}

function sanitize(id: string) {
  return id.replace(/\//g, '_');
}

/**
 * Manages edit-presence locks stored in Firestore `editLocks` collection.
 *
 * @param watchResourceId  Resource to watch in real-time (pass the currently open
 *                         resource ID so the dialog can react if someone else tries
 *                         to edit the same record). Pass null when idle.
 * @param userId           Current user UID.
 * @param userName         Current user display name shown to other users.
 */
export function useEditLock(
  watchResourceId: string | null,
  userId: string | null,
  userName: string | null,
  userEmail: string | null = null
) {
  const db = useFirestore();
  const [state, setState] = useState<EditLockState>({
    isLockedByOther: false,
    lockedByName: null,
  });

  const heldLockIds = useRef<Set<string>>(new Set());
  const keepaliveRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ── Real-time listener for the currently watched resource ──────────────────
  useEffect(() => {
    if (!db || !watchResourceId || !userId) {
      setState({ isLockedByOther: false, lockedByName: null });
      return;
    }

    const lockRef = doc(db, LOCK_COLLECTION, sanitize(watchResourceId));

    const unsub = onSnapshot(
      lockRef,
      (snap) => {
        if (!snap.exists()) {
          setState({ isLockedByOther: false, lockedByName: null });
          return;
        }
        const data = snap.data() as EditLockData | undefined;
        if (!data) {
          setState({ isLockedByOther: false, lockedByName: null });
          return;
        }
        const lockedAt = getLockedAtMs(data.lockedAt);
        const isExpired = Date.now() - lockedAt > LOCK_TTL_MS;

        if (isExpired || data.userId === userId) {
          setState({ isLockedByOther: false, lockedByName: null });
        } else {
          setState({ isLockedByOther: true, lockedByName: data.userName || data.userEmail || 'Outro usuário' });
        }
      },
      (err) => {
        console.warn('[useEditLock] listener error:', err);
        setState({ isLockedByOther: false, lockedByName: null });
      },
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- db e setState estáveis; omitidos de propósito
  }, [watchResourceId, userId]);

  /**
   * Acquire a lock for a resource.
   * @param resourceId  Resource identifier (e.g. 'masterObjects/123')
   * @param force       If true, breaks any existing lock by another user.
   */
  const acquireLock = useCallback(
    async (resourceId: string, force = false): Promise<AcquireResult> => {
      if (!db || !userId || !userName) return { acquired: false };

      const lockRef = doc(db, LOCK_COLLECTION, sanitize(resourceId));

      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(lockRef);
          if (snap.exists()) {
            const data = snap.data() as EditLockData | undefined;
            if (!data) return;
            const lockedAt = getLockedAtMs(data.lockedAt);
            const isExpired = Date.now() - lockedAt > LOCK_TTL_MS;
            
            if (!isExpired && data.userId !== userId && !force) {
              let blockerName = data.userName || data.userEmail;
              
              // Fallback: search in users collection if name is missing
              if (!blockerName && data.userId) {
                try {
                  const userSnap = await tx.get(doc(db, 'users', data.userId));
                  if (userSnap.exists()) {
                    const userData = userSnap.data() as { name?: string; email?: string } | undefined;
                    blockerName = userData?.name || userData?.email || 'Outro usuário';
                  }
                } catch {
                  // Ignore fetch error, use default
                }
              }
              
              throw new LockConflictError(blockerName || 'Outro usuário');
            }
          }
          tx.set(lockRef, { 
            userId, 
            userName,
            userEmail,
            lockedAt: Timestamp.now(), 
            resourceId,
            updatedAt: serverTimestamp()
          });
        });

        heldLockIds.current.add(resourceId);

        // Keepalive: refresh lock every 90 s while editing
        const interval = setInterval(() => {
          setDoc(lockRef, { 
            userId, 
            userName,
            userEmail,
            lockedAt: Timestamp.now(), 
            resourceId,
            updatedAt: serverTimestamp()
          }).catch(() => {});
        }, 300_000);
        keepaliveRefs.current.set(resourceId, interval);

        return { acquired: true };
      } catch (err) {
        if (err instanceof LockConflictError) {
          return { acquired: false, lockedByName: err.lockedByName };
        }
        console.error('[acquireLock] Error:', err);
        return { acquired: false };
      }
    },
    [db, userId, userName, userEmail] // Added userEmail to deps
  );

  // ── Release ────────────────────────────────────────────────────────────────
  const releaseLock = useCallback(
    async (resourceId: string) => {
      if (!db || !heldLockIds.current.has(resourceId)) return;

      const interval = keepaliveRefs.current.get(resourceId);
      if (interval) {
        clearInterval(interval);
        keepaliveRefs.current.delete(resourceId);
      }

      const lockRef = doc(db, LOCK_COLLECTION, sanitize(resourceId));
      try { await deleteDoc(lockRef); } catch {}
      heldLockIds.current.delete(resourceId);
    },
     
    [db]
  );

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      /* eslint-disable react-hooks/exhaustive-deps -- .current no unmount: estado mais recente dos refs */
      const intervals = keepaliveRefs.current;
      const heldIds = heldLockIds.current;
      /* eslint-enable react-hooks/exhaustive-deps */
      intervals.forEach((interval) => clearInterval(interval));
      if (db) {
        heldIds.forEach((resourceId) => {
          deleteDoc(doc(db, LOCK_COLLECTION, sanitize(resourceId))).catch(() => {});
        });
      }
    };
  }, [db]);

  return { ...state, acquireLock, releaseLock };
}
