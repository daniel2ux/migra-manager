'use client';

import { Lock } from 'lucide-react';

interface EditLockAlertProps {
  lockedByName: string;
}

export function EditLockAlert({ lockedByName }: EditLockAlertProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800">
      <Lock className="w-4 h-4 shrink-0 text-amber-500" />
      <p className="text-[11px] font-bold uppercase tracking-widest leading-snug">
        <span className="text-amber-600">{lockedByName}</span> está editando estas informações no momento.
        Aguarde para continuar.
      </p>
    </div>
  );
}
