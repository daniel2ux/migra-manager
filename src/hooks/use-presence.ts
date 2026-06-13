'use client';

import { useEffect } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, type CompatDbError } from '@/supabase/compat-db-shim';
import { useDb, useUser } from '@/supabase';

function ignorePresenceError(error: unknown) {
  const code = (error as CompatDbError)?.code;
  if (code === 'permission-denied') return;
  console.warn('[usePresence]', error);
}

/**
 * Registra e mantém a presença do usuário na coleção `sessions` do CompatDb.
 * Deve ser chamado em um componente raiz (ex: layout ou DashboardShell).
 *
 * Estrutura do documento sessions/{uid}:
 *   uid, userName, userEmail, userRole, loginAt, lastSeen, isOnline
 */
export function usePresence(_userProfile?: {
  name?: string;
  email?: string;
  role?: string;
}) {
  const db = useDb();
  const { user } = useUser();

  useEffect(() => {
    if (!db || !user) return;

    const sessionRef = doc(db, 'sessions', user.uid);

    const writePresence = () =>
      setDoc(
        sessionRef,
        {
          lastSeen: serverTimestamp(),
          isOnline: true,
          userAgent: window.navigator.userAgent,
        },
        { merge: true },
      );

    void writePresence().catch(ignorePresenceError);

    // Atualiza lastSeen periodicamente
    const interval = setInterval(
      () => {
        void setDoc(sessionRef, { lastSeen: serverTimestamp() }, { merge: true }).catch(
          ignorePresenceError,
        );
      },
      300_000,
    );

    const handleUnload = () => {
      void deleteDoc(sessionRef).catch(ignorePresenceError);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      void deleteDoc(sessionRef).catch(ignorePresenceError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omitir userProfile evita restart do intervalo
  }, [user?.uid, db]);
}
