import { getDashboardCardDomId } from "@/lib/dashboard/card-key";

export function getDashboardScrollContainer(): HTMLElement | null {
  return document.querySelector("main.flex-1.min-h-0.overflow-y-auto");
}

export function getDashboardScrollTop(): number {
  return getDashboardScrollContainer()?.scrollTop ?? window.scrollY;
}

export function setDashboardScrollTop(top: number) {
  const container = getDashboardScrollContainer();
  if (container) {
    container.scrollTop = top;
    return;
  }
  window.scrollTo(0, top);
}

export interface DashboardScrollLock {
  unlock: (restore?: boolean) => number;
}

let activeScrollLock: DashboardScrollLock | null = null;
let activeScrollTop: number | null = null;

export function beginDashboardDialogScroll(): number {
  const top = getDashboardScrollTop();
  activeScrollTop = top;
  activeScrollLock?.unlock(false);
  activeScrollLock = lockDashboardScrollPosition(top);
  [0, 16, 32, 64].forEach((delay) => {
    window.setTimeout(() => setDashboardScrollTop(top), delay);
  });
  return top;
}

export function endDashboardDialogScroll(restore = true): number | null {
  const top = activeScrollLock?.unlock(restore) ?? activeScrollTop;
  activeScrollLock = null;
  activeScrollTop = null;
  return top ?? null;
}

export function isDashboardDialogScrollLocked(): boolean {
  return activeScrollLock !== null;
}

export function lockDashboardScrollPosition(initialTop?: number): DashboardScrollLock {
  const main = getDashboardScrollContainer();
  if (!main) {
    return {
      unlock: () => initialTop ?? getDashboardScrollTop(),
    };
  }

  const lockedTop = initialTop ?? main.scrollTop;
  const previousOverflow = main.style.overflow;
  setDashboardScrollTop(lockedTop);
  main.style.overflow = "hidden";

  const enforce = () => {
    if (main.scrollTop !== lockedTop) {
      main.scrollTop = lockedTop;
    }
  };

  main.addEventListener("scroll", enforce, { passive: false });
  const intervalId = window.setInterval(enforce, 16);

  return {
    unlock(restore = true) {
      main.removeEventListener("scroll", enforce);
      window.clearInterval(intervalId);
      main.style.overflow = previousOverflow;
      if (restore) setDashboardScrollTop(lockedTop);
      return lockedTop;
    },
  };
}

function getDashboardViewportTopOffset(): number {
  const subtoolbar = document.querySelector(".fiori-subtoolbar--below-page-header");
  if (subtoolbar) return subtoolbar.getBoundingClientRect().bottom + 8;
  const pageHeader = document.querySelector(".fiori-page-header");
  if (pageHeader) return pageHeader.getBoundingClientRect().bottom + 8;
  return 72;
}

export function isDashboardCardInViewport(cardKey: string): boolean {
  const el = document.getElementById(getDashboardCardDomId(cardKey));
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const topOffset = getDashboardViewportTopOffset();
  const bottomMargin = 16;

  return rect.top >= topOffset && rect.bottom <= window.innerHeight - bottomMargin;
}

export function ensureDashboardCardVisible(cardKey: string) {
  const el = document.getElementById(getDashboardCardDomId(cardKey));
  const main = getDashboardScrollContainer();
  if (!el || !main || isDashboardCardInViewport(cardKey)) return;

  const rect = el.getBoundingClientRect();
  const topOffset = getDashboardViewportTopOffset();
  const bottomMargin = 16;

  let delta = 0;
  if (rect.top < topOffset) {
    delta = rect.top - topOffset;
  } else if (rect.bottom > window.innerHeight - bottomMargin) {
    delta = rect.bottom - (window.innerHeight - bottomMargin);
  }

  if (delta !== 0) {
    main.scrollBy({ top: delta, behavior: "auto" });
  }
}

export const dashboardDialogFocusProps = {
  onOpenAutoFocus: (event: Event) => event.preventDefault(),
  onCloseAutoFocus: (event: Event) => event.preventDefault(),
} as const;

/** Evita RemoveScroll do Radix (scroll real está no `<main>`). */
export const dashboardDialogRootProps = {
  modal: false as const,
};

/** Overlay + focus: backdrop manual (Radix não renderiza overlay com modal={false}). */
export const dashboardDialogContentProps = {
  manualBackdrop: true as const,
  overlayClassName: "fiori-dashboard-dialog-overlay",
  ...dashboardDialogFocusProps,
} as const;

export const dashboardAlertDialogContentProps = {
  /* Overlay leve: mantém cards e contexto visíveis atrás da confirmação */
  overlayClassName: "fiori-message-box-overlay",
  ...dashboardDialogFocusProps,
} as const;
