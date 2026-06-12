"use client";

import { useState, useCallback, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useFirestore, useAuth } from "@/supabase/provider";
import type { FileAlias } from "@/types/file-alias";

function _validate(firestore: any): asserts firestore {
  if (!firestore) throw new Error("Firestore not initialized");
}

export function useFileAliases() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [aliases, setAliases] = useState<FileAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !auth?.currentUser) return;
    const unsub = onSnapshot(
      collection(firestore, "fileAliases"),
      snap => { setAliases(snap.docs.map(d => ({ id: d.id, ...d.data() } as FileAlias))); setLoading(false); },
      err => { setError(err.message); setLoading(false); }
    );
    return () => unsub();
  }, [firestore, auth?.currentUser]);

  const addAlias = useCallback(async (alias: Omit<FileAlias, "id">) => {
    _validate(firestore);
    await addDoc(collection(firestore, "fileAliases"), {
      ...alias, createdAt: new Date().toISOString(), createdBy: auth?.currentUser?.uid || "unknown"
    });
  }, [firestore, auth]);

  const updateAlias = useCallback(async (id: string, data: Partial<FileAlias>) => {
    _validate(firestore);
    await updateDoc(doc(firestore, "fileAliases", id), { ...data, updatedAt: new Date().toISOString() });
  }, [firestore]);

  const deleteAlias = useCallback(async (id: string) => {
    _validate(firestore);
    await deleteDoc(doc(firestore, "fileAliases", id));
  }, [firestore]);

  return { aliases, loading, error, addAlias, updateAlias, deleteAlias };
}
