import { cn } from '@/lib/utils';

const LOGIN_PANEL_TEXTURE = {
  backgroundImage: [
    'linear-gradient(155deg, rgba(0,0,0,0.12) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: 'auto, 24px 24px, 24px 24px',
} as const;

const LOGIN_PANEL_NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface LoginPanelBackgroundProps {
  variant?: 'brand' | 'form';
  className?: string;
}

export function LoginPanelBackground({
  variant = 'brand',
  className,
}: LoginPanelBackgroundProps) {
  const isBrand = variant === 'brand';

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden>
      <div className={cn('absolute inset-0', isBrand ? 'bg-[#0048a8]' : 'bg-[#f5f6f7]')} />
      <div className="absolute inset-0" style={LOGIN_PANEL_TEXTURE} />
      <div
        className={cn(
          'absolute inset-0 mix-blend-soft-light',
          isBrand ? 'opacity-25' : 'opacity-10',
        )}
        style={{ backgroundImage: LOGIN_PANEL_NOISE }}
      />
      <div
        className={cn(
          'absolute inset-0',
          isBrand
            ? 'bg-linear-to-b from-black/10 via-transparent to-black/25'
            : 'bg-linear-to-br from-SkyBlue-500/8 via-transparent to-SkyBlue-500/5',
        )}
      />
    </div>
  );
}
