
'use client';

import { useEffect, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const COOLDOWN_MS = 10_000;

export function FirebaseErrorListener() {
  const { user } = useUser();
  const { toast } = useToast();
  const lastShownAt = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const handleError = (error: FirestorePermissionError) => {
      const now = Date.now();
      if (now - lastShownAt.current < COOLDOWN_MS) {
        console.warn("Acesso negado (suprimido):", error.request.path, error.request.method);
        return;
      }

      lastShownAt.current = now;
      console.warn("Acesso negado detectado:", error.request.path, error.request.method);

      toast({
        variant: "destructive",
        title: "Restrição de Acesso",
        description: "Você tentou acessar uma informação que não está autorizada para seu perfil.",
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user, toast]);

  if (!user) return null;

  return null;
}
