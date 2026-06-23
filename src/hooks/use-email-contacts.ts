"use client";

import { useMemo } from "react";
import { collection, doc, deleteDoc, setDoc, query, where } from "@/supabase/compat-db-shim";
import { useDb, useCollection, useMemoDb } from "@/supabase";
import { useUser } from "@/supabase/provider";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import type { EmailContact, EmailGroup, EmailRecipientSelection } from "@/types/email";
import { getDocRef, validateUpsert, buildAuditData } from "@/lib/db-upsert";
import type { CompatDb } from "@/supabase/compat-db-shim";

function requireProjectId(projectId: string | null | undefined): string {
  if (!projectId || projectId === "all") {
    throw new Error("Selecione um projeto para gerenciar contatos e agrupadores de e-mail.");
  }
  return projectId;
}

/**
 * Hook para gerenciar agrupadores de e-mail (escopo do projeto ativo).
 */
export function useEmailGroups(explicitProjectId?: string | null) {
  const db = useDb();
  const { user } = useUser();
  const { projectId: activeProjectId } = useActiveProjectId();
  const projectId = explicitProjectId ?? activeProjectId;

  const groupsQuery = useMemoDb(() => {
    if (!db || !user || !projectId || projectId === "all") return null;
    return query(
      collection(db as CompatDb, "emailGroups"),
      where("projectId", "==", projectId),
    );
  }, [db, user, projectId]);

  const { data: groups, isLoading, error, refetch } = useCollection<EmailGroup>(groupsQuery);
  const sortedGroups = useMemo(() => groups ? [...groups].sort((a, b) => a.name.localeCompare(b.name)) : [], [groups]);

  const upsertGroup = async (groupData: Partial<EmailGroup> & { name: string }) => {
    validateUpsert(user?.uid, db);
    const scopedProjectId = requireProjectId(projectId);
    const groupRef = getDocRef(db as CompatDb, "emailGroups", groupData.id);
    await setDoc(groupRef, buildAuditData(user!.uid, {
      name: groupData.name.trim(),
      description: groupData.description?.trim() ?? "",
      projectId: scopedProjectId,
    }, !groupData.id), { merge: true });
    refetch();
    return groupRef.id;
  };

  const deleteGroup = async (groupId: string) => {
    if (!db) return;
    await deleteDoc(doc(db as CompatDb, "emailGroups", groupId));
    refetch();
  };

  return { groups: sortedGroups ?? [], isLoading, error, upsertGroup, deleteGroup, refetch, projectId };
}

/**
 * Hook para gerenciar contatos de e-mail (escopo do projeto ativo).
 */
export function useEmailContacts(explicitProjectId?: string | null) {
  const db = useDb();
  const { user } = useUser();
  const { projectId: activeProjectId } = useActiveProjectId();
  const projectId = explicitProjectId ?? activeProjectId;

  const contactsQuery = useMemoDb(() => {
    if (!db || !user || !projectId || projectId === "all") return null;
    return query(
      collection(db as CompatDb, "emailContacts"),
      where("projectId", "==", projectId),
    );
  }, [db, user, projectId]);

  const { data: contacts, isLoading, error, refetch } = useCollection<EmailContact>(contactsQuery);
  const sortedContacts = useMemo(() => contacts ? [...contacts].sort((a, b) => a.name.localeCompare(b.name)) : [], [contacts]);

  const upsertContact = async (contactData: Partial<EmailContact> & { name: string; email: string; groupIds?: string[] }) => {
    validateUpsert(user?.uid, db);
    const scopedProjectId = requireProjectId(projectId);
    const contactRef = getDocRef(db as CompatDb, "emailContacts", contactData.id);
    await setDoc(contactRef, buildAuditData(user!.uid, {
      name: contactData.name.trim(),
      email: contactData.email.trim().toLowerCase(),
      groupIds: contactData.groupIds ?? [],
      projectId: scopedProjectId,
    }, !contactData.id), { merge: true });
    refetch();
    return contactRef.id;
  };

  const deleteContact = async (contactId: string) => {
    if (!db) return;
    await deleteDoc(doc(db as CompatDb, "emailContacts", contactId));
    refetch();
  };

  const getContactsByGroup = async (groupId: string): Promise<EmailContact[]> => {
    if (!db || !projectId || projectId === "all") return [];
    const { getDocs } = await import("@/supabase/compat-db-shim");
    const contactsQuery = query(
      collection(db as CompatDb, "emailContacts"),
      where("projectId", "==", projectId),
      where("groupIds", "array-contains", groupId),
    );
    const snap = await getDocs(contactsQuery);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as EmailContact));
  };

  return { contacts: sortedContacts ?? [], isLoading, error, upsertContact, deleteContact, getContactsByGroup, refetch, projectId };
}

/**
 * Hook utilitário para obter todos os e-mails a partir de seleções
 */
export function useEmailRecipients(explicitProjectId?: string | null) {
  const { contacts } = useEmailContacts(explicitProjectId);
  const { groups } = useEmailGroups(explicitProjectId);

  const resolveEmails = (selections: EmailRecipientSelection[]): string[] => {
    const emailSet = new Set<string>();
    selections.forEach(s => {
      if (s.type === 'contact') { const c = contacts.find(c => c.id === s.id); if (c?.email) emailSet.add(c.email); }
      else if (s.type === 'group') { contacts.filter(c => c.groupIds.includes(s.id)).forEach(c => { if (c.email) emailSet.add(c.email); }); }
      else if (s.type === 'external' && s.email) { emailSet.add(s.email); }
    });
    return Array.from(emailSet).sort();
  };

  const getLabel = (type: 'contact' | 'group' | 'external', id: string, email?: string): string => {
    if (type === 'external') return email ?? id;
    if (type === 'contact') { const c = contacts.find(c => c.id === id); return c ? `${c.name} <${c.email}>` : id; }
    return groups.find(g => g.id === id)?.name ?? id;
  };

  return { contacts, groups, resolveEmails, getLabel };
}
