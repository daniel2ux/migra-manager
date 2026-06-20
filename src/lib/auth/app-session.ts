import { PROJECT_CHANGED_EVENT } from "@/hooks/use-active-project-id";
import { SESSION_KEYS, STORAGE_KEYS } from "@/lib/constants";

export type LoginFlash = "session_ended";

/** Remove parâmetros de navegação/estado da URL atual (sem recarregar). */
export function stripNavigationQueryParams(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.search) return;

  const keys = [
    "projectId",
    "mockId",
    "assignGroupId",
    "page",
    "add",
    "reason",
  ] as const;

  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) return;

  const qs = url.searchParams.toString();
  const next = qs ? `${url.pathname}?${qs}${url.hash}` : `${url.pathname}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

function setLoginFlash(flash: LoginFlash): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEYS.LOGIN_FLASH, flash);
}

export function consumeLoginFlash(): LoginFlash | null {
  if (typeof window === "undefined") return null;
  const flash = sessionStorage.getItem(SESSION_KEYS.LOGIN_FLASH);
  if (!flash) return null;
  sessionStorage.removeItem(SESSION_KEYS.LOGIN_FLASH);
  return flash === "session_ended" ? flash : null;
}

/** Limpa estado local da aplicação (storage + eventos). Chamar após signOut. */
export function clearAppState(options?: { flash?: LoginFlash }): void {
  if (typeof window === "undefined") return;

  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }

  sessionStorage.clear();

  if (options?.flash) {
    setLoginFlash(options.flash);
  }

  window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT, { detail: null }));
}
