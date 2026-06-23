"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, updateDoc, query, where } from "@/supabase/compat-db-shim";
import { useDb, useUser } from "@/supabase/provider";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
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
      projectId: String(data.projectId ?? data.project_id ?? "") || undefined,
    };
  });
}

export function useFileAliases(explicitProjectId?: string | null) {
  const db = useDb();
  const { user } = useUser();
  const { projectId: activeProjectId } = useActiveProjectId();
  const projectId = explicitProjectId ?? activeProjectId;
  const [aliases, setAliases] = useState<FileAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopedQuery = useMemo(() => {
    if (!db || !user || !projectId || projectId === "all") return null;
    return query(collection(db, "fileAliases"), where("projectId", "==", projectId));
  }, [db, user, projectId]);

  const reloadAliases = useCallback(async () => {
    if (!scopedQuery) {
      setAliases([]);
      return;
    }
    const snap = await getDocs(scopedQuery);
    setAliases(mapSnapshotDocs(snap.docs));
    setError(null);
  }, [scopedQuery]);

  useEffect(() => {
    if (!scopedQuery) {
      setAliases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      scopedQuery,
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
  }, [scopedQuery]);

  const addAlias = useCallback(
    async (alias: Omit<FileAlias, "id">) => {
      _validate(db);
      if (!projectId || projectId === "all") {
        throw new Error("Selecione um projeto para cadastrar aliases de arquivo.");
      }
      const payload: Record<string, unknown> = {
        ...alias,
        projectId,
        createdAt: new Date().toISOString(),
      };
      if (user?.uid) payload.createdBy = user.uid;

      await addDoc(collection(db, "fileAliases"), payload);
      await reloadAliases();
    },
    [db, user, projectId, reloadAliases],
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

  return { aliases, loading, error, addAlias, updateAlias, deleteAlias, reloadAliases, projectId };
}
