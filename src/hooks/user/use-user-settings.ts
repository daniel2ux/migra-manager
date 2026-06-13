"use client";

import { useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "@/supabase/compat-db-shim";
import { useDb } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import type { EmailSignature } from "@/types/usuarios";

interface UseUserSettingsProps {
  user: any;
}

export function useUserSettings({ user }: UseUserSettingsProps) {
  const db = useDb();
  const { toast } = useToast();

  const [isSavingMigrador, setIsSavingMigrador] = useState(false);
  const [isSavingFrom, setIsSavingFrom] = useState(false);
  const [isSavingSig, setIsSavingSig] = useState(false);

  // ── Migrador Name ────────────────────────────────────────────────────
  const handleSaveMigrador = async (migradorInput: string) => {
    if (!user || !db) return;

    setIsSavingMigrador(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        migradorName: migradorInput.trim().toUpperCase(),
      });
      toast({ description: "Migrador salvo." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar migrador." });
    } finally {
      setIsSavingMigrador(false);
    }
  };

  // ── From Email ────────────────────────────────────────────────────────
  const handleSaveFromEmail = async (fromEmailInput: string) => {
    if (!user || !db) return;

    setIsSavingFrom(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { fromEmail: fromEmailInput.trim() });
      toast({ description: "E-mail de origem salvo." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar e-mail de origem." });
    } finally {
      setIsSavingFrom(false);
    }
  };

  // ── Signatures ────────────────────────────────────────────────────────
  const handleAddSignature = async (
    newSigName: string,
    newSigContent: string,
    newSigImageUrl: string,
  ): Promise<boolean> => {
    if (!newSigName.trim() || (!newSigContent.trim() && !newSigImageUrl.trim()) || !user || !db) return false;

    setIsSavingSig(true);
    try {
      const sig: Record<string, any> = {
        id: crypto.randomUUID(),
        name: newSigName.trim(),
        content: newSigContent.trim(),
      };
      if (newSigImageUrl.trim()) {
        sig.imageUrl = newSigImageUrl.trim();
      }

      await updateDoc(doc(db, "users", user.uid), { emailSignatures: arrayUnion(sig) });
      toast({ description: "Assinatura salva." });
      return true;
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar assinatura." });
      return false;
    } finally {
      setIsSavingSig(false);
    }
  };

  const handleDeleteSignature = async (sig: EmailSignature) => {
    if (!user || !db) return;

    try {
      await updateDoc(doc(db, "users", user.uid), { emailSignatures: arrayRemove(sig) });
      toast({ description: "Assinatura removida." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao remover assinatura." });
    }
  };

  return {
    handleSaveMigrador,
    handleSaveFromEmail,
    handleAddSignature,
    handleDeleteSignature,
    isSavingMigrador,
    isSavingFrom,
    isSavingSig,
  };
}
