"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { buildSidebarHref } from "@/lib/navigation/sidebar-href";
import { safeRouterPush } from "@/lib/navigation/safe-router";

interface DashboardHomeLinkProps {
  className?: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}

/** Link da marca «Migra» → dashboard (`/`), com projeto ativo na URL. */
export function DashboardHomeLink({ className, onNavigate, children }: DashboardHomeLinkProps) {
  const router = useRouter();
  const { projectId } = useActiveProjectId();
  const href = buildSidebarHref("/", projectId, false);

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        safeRouterPush(router, href);
      }}
    >
      {children}
    </Link>
  );
}
