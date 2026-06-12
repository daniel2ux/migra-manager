"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
    /** Título principal da página */
    title: string;
    /** Subtítulo/descrição da página */
    subtitle?: string;
    /** Badge opcional ao lado do título (ex: contador) */
    badge?: React.ReactNode;
    /** Ícone da seção (opcional, aparece antes do título) */
    icon?: React.ReactNode;
    /** Ações/controles do header (lado direito) */
    actions?: React.ReactNode;
    /** Indicador de progresso (ex.: passos de wizard), exibido à direita do título */
    progress?: React.ReactNode;
    /** URL para navegação de retorno (opcional) */
    backHref?: string;
    /** Classe CSS adicional para o container */
    className?: string;
    /** Elementos adicionais de contexto (ex: breadcrumbs em texto pequeno) */
    context?: React.ReactNode;
    /** Labels de contexto no estilo grid (ex: Projeto, Status) */
    contextLabels?: React.ReactNode;
    /** Nome da empresa-cliente */
    empresa?: string;
    /** Nome do projeto (exibido ao lado quando empresa também está definida) */
    projectName?: string;
    /** Nome da mock selecionada (contexto ao lado do título) */
    mockName?: string;
    /** Variante visual: default (Premium BI) ou fiori (SAP Fiori Horizon) */
    variant?: "default" | "fiori";
}

/**
 * PageHeader - Componente padrão para headers de páginas do dashboard
 */
export function PageHeader({
    title,
    subtitle,
    badge,
    icon,
    actions,
    progress,
    backHref,
    className,
    context,
    contextLabels,
    empresa,
    projectName,
    mockName,
    variant = "default",
}: PageHeaderProps) {
    const isFiori = variant === "fiori";

    const contextFields = [
        empresa && { key: "empresa", label: "Empresa", value: empresa },
        projectName && { key: "project", label: "Projeto", value: projectName },
        mockName && { key: "mock", label: "Mock", value: mockName },
    ].filter(Boolean) as { key: string; label: string; value: string }[];

    const resolvedContextLabels = contextLabels ?? (contextFields.length > 0 ? (
        <div className="flex items-center gap-3">
            {contextFields.map((field, index) => (
                <React.Fragment key={field.key}>
                    {index > 0 && (
                        <div
                            className={cn(
                                isFiori ? "fiori-page-context-divider" : "page-header-context-divider",
                            )}
                            aria-hidden
                        />
                    )}
                    <div className={cn(isFiori ? "fiori-page-context-field" : "page-header-context-field")}>
                        <span className={cn(isFiori ? "fiori-page-context-label" : "page-header-context-label")}>
                            {field.label}
                        </span>
                        <span className={cn(isFiori ? "fiori-page-context-value" : "page-header-context-value")}>
                            {field.value}
                        </span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    ) : undefined);

    const fioriHeaderTall = isFiori && subtitle && !context;

    const headerRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!headerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
                setHeaderHeight(height);
                document.documentElement.style.setProperty("--fiori-page-header-height", `${height}px`);
            }
        });
        resizeObserver.observe(headerRef.current);
        return () => {
            resizeObserver.disconnect();
            document.documentElement.style.removeProperty("--fiori-page-header-height");
        };
    }, []);

    return (
        <>
            <div
                className={cn(
                    "shrink-0 print:hidden",
                    fioriHeaderTall ? "fiori-page-header-spacer--tall" : "h-14",
                )}
                style={headerHeight ? { height: `${headerHeight}px`, minHeight: `${headerHeight}px` } : undefined}
            />
            <div
                ref={headerRef}
                className={cn(
                    "fixed top-16 left-0 right-0 z-[60] flex items-center justify-between px-4 md:px-8 shrink-0 print:hidden",
                    fioriHeaderTall ? "fiori-page-header--tall" : "h-14",
                    isFiori
                        ? "fiori-page-header"
                        : "bg-white/98 backdrop-blur-md border-b border-slate-200",
                    className
                )}
            >
                <div className="flex items-center gap-4 min-w-0">
                    {backHref && (
                        <>
                            <Link href={backHref}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        isFiori
                                            ? "fiori-page-back-btn"
                                            : "h-8 w-8 rounded-none hover:bg-slate-200 text-slate-500 active:scale-95 transition-all border-0 shadow-none"
                                    )}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div
                                className={cn(
                                    "shrink-0",
                                    isFiori ? "fiori-page-divider" : "h-6 w-px bg-slate-200"
                                )}
                            />
                        </>
                    )}

                    {icon && (
                        <div
                            className={cn(
                                "shrink-0",
                                isFiori
                                    ? "fiori-page-icon"
                                    : "flex items-center justify-center w-10 h-10 bg-SkyBlue-500 rounded-lg"
                            )}
                        >
                            {icon}
                        </div>
                    )}

                    <div className="flex flex-col min-w-0 gap-1">
                        <div className="fiori-page-title-row flex items-center gap-2 min-w-0 flex-wrap">
                            <h1
                                className={cn(
                                    "leading-none truncate shrink-0",
                                    isFiori
                                        ? "fiori-page-title"
                                        : "text-sm font-black text-slate-900 uppercase tracking-wider"
                                )}
                            >
                                {title}
                            </h1>
                            {badge && (
                                isFiori ? (
                                    typeof badge === "string" || typeof badge === "number" ? (
                                        <span className="fiori-page-badge shrink-0">{badge}</span>
                                    ) : (
                                        <div className="fiori-page-badges shrink-0">{badge}</div>
                                    )
                                ) : (
                                    <span className="flex items-center justify-center min-w-[24px] h-5 px-1.5 text-[10px] font-bold text-slate-600 rounded-none">
                                        {badge}
                                    </span>
                                )
                            )}
                            {isFiori && resolvedContextLabels && (
                                <>
                                    <div className="fiori-page-title-context-divider" aria-hidden />
                                    <div className="fiori-page-context fiori-page-context--inline min-w-0">
                                        {resolvedContextLabels}
                                    </div>
                                </>
                            )}
                        </div>
                        {subtitle && !context && (
                            isFiori ? (
                                <p className="fiori-page-subtitle">{subtitle}</p>
                            ) : (
                                !resolvedContextLabels && (
                                    <p className="text-[9px] text-slate-400 uppercase tracking-tight mt-1">
                                        {subtitle}
                                    </p>
                                )
                            )
                        )}
                        {!isFiori && resolvedContextLabels && (
                            <div className="flex items-center gap-6 mt-1">
                                {resolvedContextLabels}
                            </div>
                        )}
                        {context && !resolvedContextLabels && (
                            isFiori ? (
                                <div className="fiori-page-context">{context}</div>
                            ) : (
                                <div className="flex items-center gap-x-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                    {context}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {(progress || actions) && (
                    <div
                        className={cn(
                            "flex items-center shrink-0 min-w-0 ml-auto",
                            isFiori ? "gap-3" : "gap-1.5",
                        )}
                    >
                        {progress}
                        {actions}
                    </div>
                )}
            </div>
        </>
    );
}
