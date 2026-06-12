"use client";

import { useEffect, useState } from "react";

type NavigateOptions = { scroll?: boolean };

type RouterLike = {
  replace: (href: string, options?: NavigateOptions) => void;
  push: (href: string, options?: NavigateOptions) => void;
};

const ROUTER_NOT_READY =
  "Internal Next.js error: Router action dispatched before initialization.";

function runWhenRouterReady(fn: () => void, attempt = 0) {
  if (typeof window === "undefined") return;

  const run = () => {
    try {
      fn();
    } catch (error) {
      if (
        attempt < 8 &&
        error instanceof Error &&
        error.message.includes(ROUTER_NOT_READY)
      ) {
        window.setTimeout(() => runWhenRouterReady(fn, attempt + 1), 16 * (attempt + 1));
        return;
      }
      throw error;
    }
  };

  requestAnimationFrame(() => {
    queueMicrotask(run);
  });
}

export function safeRouterReplace(
  router: RouterLike,
  href: string,
  options?: NavigateOptions,
) {
  runWhenRouterReady(() => router.replace(href, options));
}

export function safeRouterPush(
  router: RouterLike,
  href: string,
  options?: NavigateOptions,
) {
  runWhenRouterReady(() => router.push(href, options));
}

/** Aguarda a montagem no cliente antes de disparar navegação automática. */
export function useRouterReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}
