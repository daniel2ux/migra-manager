"use client";

import Link from "next/link";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { buildSidebarHref } from "@/lib/navigation/sidebar-href";

interface DashboardHomeLinkProps {
  className?: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}

/** Link da marca «Migra» → dashboard (`/`), com projeto ativo na URL. */
export function DashboardHomeLink({ className, onNavigate, children }: DashboardHomeLinkProps) {
  const { projectId } = useActiveProjectId();
  const href = buildSidebarHref("/", projectId, false);

  return (
    <Link href={href} className={className} onClick={() => onNavigate?.()}>
      {children}
    </Link>
  );
}
