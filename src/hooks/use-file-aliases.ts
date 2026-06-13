"use client";

import { useState, useCallback, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, updateDoc } from "@/supabase/compat-db-shim";
import { useDb, useUser } from "@/supabase/provider";
import type { FileAlias } from "@/types/file-alias";

function _validate(db: unknown): asserts db {
  if (!db) throw new Error("Banco de dados não inicializado");
}

function mapSnapshotDocs(
  docs: { id: string; data: () => Record<string, unknown> | undefined }[],
): FileAlias[] {
  return docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      objectName: String(data.objectName ?? data.object_name ?? ""),
      fileNamePatterns: Array.isArray(data.fileNamePatterns)
        ? (data.fileNamePatterns as string[])
        : Array.isArray(data.file_name_patterns)
          ? (data.file_name_patterns as string[])
          : [],
    };
  });
}

export function useFileAliases() {
  const db = useDb();
  const { user } = useUser();
  const [aliases, setAliases] = useState<FileAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadAliases = useCallback(async () => {
    if (!db || !user) return;
    const snap = await getDocs(collection(db, "fileAliases"));
    setAliases(mapSnapshotDocs(snap.docs));
    setError(null);
  }, [db, user]);

  useEffect(() => {
    if (!db || !user) {
      setAliases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "fileAliases"),
      (snap) => {
        setAliases(mapSnapshotDocs(snap.docs));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, user]);

  const addAlias = useCallback(
    async (alias: Omit<FileAlias, "id">) => {
      _validate(db);
      const payload: Record<string, unknown> = {
        ...alias,
        createdAt: new Date().toISOString(),
      };
      if (user?.uid) payload.createdBy = user.uid;

      await addDoc(collection(db, "fileAliases"), payload);
      await reloadAliases();
    },
    [db, user, reloadAliases],
  );

  const updateAlias = useCallback(
    async (id: string, data: Partial<FileAlias>) => {
      _validate(db);
      const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (data.objectName !== undefined) patch.objectName = data.objectName;
      if (data.fileNamePatterns !== undefined) patch.fileNamePatterns = data.fileNamePatterns;
      await updateDoc(doc(db, "fileAliases", id), patch);
      await reloadAliases();
    },
    [db, reloadAliases],
  );

  const deleteAlias = useCallback(
    async (id: string) => {
      _validate(db);
      await deleteDoc(doc(db, "fileAliases", id));
      await reloadAliases();
    },
    [db, reloadAliases],
  );

  return { aliases, loading, error, addAlias, updateAlias, deleteAlias, reloadAliases };
}
