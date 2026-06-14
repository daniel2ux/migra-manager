"use client";

import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "@/supabase/compat-db-shim";
import { ref, uploadBytes, getDownloadURL, avatarRef } from "@/supabase/storage-shim";
import { useToast } from "@/hooks/use-toast";
import { createFileUploadError } from "@/lib/file-utils";

interface UseUserUploadsProps {
  user: any;
  storage: any;
  db: any;
}

export function useUserUploads({ user, storage, db }: UseUserUploadsProps) {
  const { toast } = useToast();
  const [isUploadingSigImage, setIsUploadingSigImage] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ── Signature Image Upload ──────────────────────────────────────────
  const handleSigImageUpload = async (file: File): Promise<string | null> => {
    if (!file || !user) return null;

    const sizeError = createFileUploadError(file);
    if (sizeError) {
      toast({ title: sizeError.title, description: sizeError.description, variant: "destructive" });
      return null;
    }

    try {
      setIsUploadingSigImage(true);
      if (!storage) return null;

      const storageRef = ref(storage, `signatures/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      toast({ title: "Imagem carregada!", description: "A imagem da assinatura foi enviada com sucesso." });
      return downloadURL;
    } catch {
      toast({ title: "Erro no upload", description: "Não foi possível enviar a imagem.", variant: "destructive" });
      return null;
    } finally {
      setIsUploadingSigImage(false);
    }
  };

  // ── Avatar Upload ────────────────────────────────────────────────────
  const handleAvatarUpload = async (file: File): Promise<boolean> => {
    if (!file || !user) return false;

    const sizeError = createFileUploadError(file);
    if (sizeError) {
      toast({ title: sizeError.title, description: sizeError.description, variant: "destructive" });
      return false;
    }

    try {
      setIsUploadingAvatar(true);
      if (!storage || !db) return false;

      const storageRef = avatarRef(storage, user.uid, file);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Sucesso!", description: "Sua foto de perfil foi atualizada." });
      return true;
    } catch {
      toast({ title: "Erro no upload", description: "Não foi possível enviar sua foto. Tente novamente.", variant: "destructive" });
      return false;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return {
    handleSigImageUpload,
    handleAvatarUpload,
    isUploadingSigImage,
    isUploadingAvatar,
  };
}
