export type CloseBrowserWindowOutcome =
  | 'closed'
  | 'navigated_back'
  | 'navigated_referrer'
  | 'manual_required';

function tryCloseWindow(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.opener && !window.opener.closed) {
    window.opener.focus();
  }

  window.close();

  if (window.closed) return true;

  try {
    window.open('', '_self');
    window.close();
  } catch {
    /* ignore */
  }

  return window.closed;
}

/**
 * Tenta fechar a janela/aba. Navegadores só permitem `close()` em janelas abertas
 * via script (`window.open`). Caso contrário, volta na história ou redireciona ao referrer.
 */
function closeBrowserWindowOrLeave(): CloseBrowserWindowOutcome {
  if (tryCloseWindow()) return 'closed';

  if (window.history.length > 1) {
    window.history.back();
    return 'navigated_back';
  }

  const referrer = document.referrer;
  if (referrer) {
    try {
      if (new URL(referrer).href !== window.location.href) {
        window.location.replace(referrer);
        return 'navigated_referrer';
      }
    } catch {
      /* referrer inválido */
    }
  }

  return 'manual_required';
}

/** Fecha com nova tentativa assíncrona (alguns browsers demoram a processar `close`). */
export function closeBrowserWindowOrLeaveAsync(
  onManualRequired?: () => void,
): void {
  if (tryCloseWindow()) return;

  window.setTimeout(() => {
    if (window.closed) return;

    if (tryCloseWindow()) return;

    const outcome = closeBrowserWindowOrLeave();
    if (outcome === 'manual_required') {
      onManualRequired?.();
    }
  }, 120);
}
