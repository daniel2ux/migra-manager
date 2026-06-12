'use client';

import { useEffect } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, type FirestoreError } from 'firebase/firestore';
import { useFirestore, useUser } from '@/supabase';

function ignorePresenceError(error: unknown) {
  const code = (error as FirestoreError)?.code;
  if (code === 'permission-denied') return;
  console.warn('[usePresence]', error);
}

/**
 * Registra e mantém a presença do usuário na coleção `sessions` do Firestore.
 * Deve ser chamado em um componente raiz (ex: layout ou DashboardShell).
 *
 * Estrutura do documento sessions/{uid}:
 *   uid, userName, userEmail, userRole, loginAt, lastSeen, isOnline
 */
export function usePresence(userProfile?: {
  name?: string;
  email?: string;
  role?: string;
}) {
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!db || !user) return;

    const sessionRef = doc(db, 'sessions', user.uid);
    const loginAt = new Date().toISOString();

    const writePresence = () => {
      const userAgent = window.navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Browser';

      return setDoc(
        sessionRef,
        {
          uid: user.uid,
          userName: userProfile?.name ?? user.displayName ?? user.email ?? 'Usuário',
          userEmail: user.email ?? '',
          userRole: userProfile?.role ?? 'user',
          loginAt,
          lastSeen: serverTimestamp(),
          isOnline: true,
          device: isMobile ? 'Mobile' : 'Desktop',
          browser: browser,
          userAgent: userAgent,
        },
        { merge: true }
      );
    };

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
