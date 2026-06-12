"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
    Search,
    ChevronRight,
    AlertTriangle,
    Info,
    ArrowRight,
} from "lucide-react";

import { DOCS, type DocEntry, type DocWarning } from "@/data/docs";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectionTitle(id: string): string {
    const map: Record<string, string> = {};
    DOCS.forEach(cat => cat.entries.forEach(e => { map[e.id] = e.title; }));
    return map[id] ?? id;
}

function WarningBadge({ level }: { level: DocWarning["level"] }) {
    if (level === "danger") return <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />;
    if (level === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
    return <Info className="w-3.5 h-3.5 text-SkyBlue-500 shrink-0 mt-0.5" />;
}

function warningBg(level: DocWarning["level"]) {
    if (level === "danger") return "bg-red-50 border-red-200 text-red-800";
    if (level === "warn") return "bg-amber-50 border-amber-200 text-amber-800";
    return "bg-SkyBlue-50 border-SkyBlue-200 text-SkyBlue-800";
}

// ─── Entry Component ──────────────────────────────────────────────────────────

function DocEntryView({ entry }: { entry: DocEntry }) {
    const cat = DOCS.find(c => c.entries.some(e => e.id === entry.id));
    if (!cat) return null;
    return (
        <div id={entry.id} className="scroll-mt-20 space-y-6 pb-12 border-b border-slate-100 last:border-0">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest rounded-none border-slate-300", cat.color)}>
                        {cat.label}({entry.section})
                    </Badge>
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                    {entry.title}
                </h2>
            </div>

            {/* SINOPSE */}
            <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">SINOPSE</p>
                <p className="text-sm font-semibold text-slate-700 font-mono border-l-2 border-slate-300 pl-4 py-1">
                    {entry.synopsis}
                </p>
            </div>

            {/* DESCRIÇÃO */}
            <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">DESCRIÇÃO</p>
                <p className="text-sm text-slate-600 leading-relaxed pl-4">
                    {entry.description}
                </p>
            </div>

            {/* PARÂMETROS */}
            {entry.params && entry.params.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">PARÂMETROS</p>
                    <div className="border border-slate-200 divide-y divide-slate-100 rounded-none overflow-hidden">
                        {entry.params.map(p => (
                            <div key={p.name} className="grid grid-cols-[1fr_auto_auto_2fr] gap-4 px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors text-xs">
                                <span className="font-black text-slate-800 font-mono">{p.name}</span>
                                <span className="text-slate-400 font-mono">{p.type}</span>
                                <span className={cn("font-black uppercase text-[9px]", p.required ? "text-red-500" : "text-slate-300")}>
                                    {p.required ? "OBRIG." : "OPC."}
                                </span>
                                <span className="text-slate-500">{p.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PASSO A PASSO */}
            {entry.steps && entry.steps.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">PASSO A PASSO</p>
                    <div className="space-y-2 pl-4">
                        {entry.steps.map(s => (
                            <div key={s.n} className="flex gap-3 items-start">
                                <span className="flex items-center justify-center w-5 h-5 rounded-none bg-slate-900 text-white text-[9px] font-black shrink-0 mt-0.5">
                                    {String(s.n).padStart(2, "0")}
                                </span>
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">{s.title}</p>
                                    <p className="text-xs text-slate-500 leading-relaxed">{s.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AVISOS */}
            {entry.warnings && entry.warnings.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">AVISOS</p>
                    <div className="space-y-2 pl-4">
                        {entry.warnings.map((w, i) => (
                            <div key={i} className={cn("flex gap-2.5 items-start p-3 border rounded-none text-xs leading-relaxed", warningBg(w.level))}>
                                <WarningBadge level={w.level} />
                                <span>{w.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VER TAMBÉM */}
            {entry.seeAlso && entry.seeAlso.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">VER TAMBÉM</p>
                    <div className="flex flex-wrap gap-2 pl-4">
                        {entry.seeAlso.map(id => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-black text-SkyBlue-600 uppercase tracking-wide hover:underline"
                            >
                                <ArrowRight className="w-3 h-3" />
                                {sectionTitle(id)}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
    const [search, setSearch] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [openCats, setOpenCats] = useState<string[]>(DOCS.map(c => c.id));

    // Filtered entries
    const q = search.toLowerCase().trim();
    const filtered = DOCS.map(cat => ({
        ...cat,
        entries: cat.entries.filter(e =>
            !q ||
            e.title.toLowerCase().includes(q) ||
            e.synopsis.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        ),
    })).filter(cat => cat.entries.length > 0);

    // Intersection observer for active section
    const observerRef = useRef<IntersectionObserver | null>(null);
    useEffect(() => {
        observerRef.current?.disconnect();
        const allIds = DOCS.flatMap(c => c.entries.map(e => e.id));
        observerRef.current = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length > 0) setActiveId(visible[0].target.id);
            },
            { rootMargin: "-20% 0px -70% 0px" }
        );
        allIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) observerRef.current!.observe(el);
        });
        return () => observerRef.current?.disconnect();
    }, []);

    const toggleCat = (id: string) =>
        setOpenCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

    return (
        <DashboardShell noPadding>
            <div className="flex flex-col w-full h-full min-h-full">
                <PageHeader
                    title="DOCUMENTAÇÃO TÉCNICA"
                    subtitle="Migra v1.0 — Manual de Referência"
                    backHref="/"
                />

                {/* ── Body ── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* ── Left Nav ── */}
                    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-100 overflow-y-auto custom-scrollbar bg-white">
                        {/* Search */}
                        <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-[11px] font-medium bg-slate-100 border-0 rounded-none focus:outline-hidden focus:ring-1 focus:ring-SkyBlue-300 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Nav items */}
                        <nav className="py-3 space-y-0.5">
                            {filtered.map(cat => {
                                const Icon = cat.icon;
                                const isOpen = openCats.includes(cat.id);
                                return (
                                    <div key={cat.id}>
                                        <button
                                            onClick={() => toggleCat(cat.id)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">{cat.label}</span>
                                            </div>
                                            <ChevronRight className={cn("w-3 h-3 text-slate-300 transition-transform", isOpen && "rotate-90")} />
                                        </button>
                                        {isOpen && (
                                            <div className="pb-1">
                                                {cat.entries.map(e => (
                                                    <a
                                                        key={e.id}
                                                        href={`#${e.id}`}
                                                        className={cn(
                                                            "flex items-center gap-2 pl-8 pr-4 py-2 text-[10px] font-bold uppercase tracking-wide transition-all border-l-2 mx-2",
                                                            activeId === e.id
                                                                ? "text-SkyBlue-600 border-SkyBlue-500 bg-SkyBlue-50/50"
                                                                : "text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200"
                                                        )}
                                                    >
                                                        {e.title}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* ── Content ── */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 space-y-0">
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                                    <Search className="w-8 h-8" />
                                    <p className="text-sm font-bold uppercase tracking-wide">Nenhum resultado para &quot;{search}&quot;</p>
                                </div>
                            ) : (
                                filtered.map(cat => (
                                    <div key={cat.id} className="space-y-0">
                                        {/* Category divider */}
                                        <div className="flex items-center gap-3 py-8 first:pt-0">
                                            <div className={cn("p-1.5 rounded-none bg-slate-100", cat.color)}>
                                                <cat.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Seção {cat.entries[0]?.section}</p>
                                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{cat.label}</h3>
                                            </div>
                                            <div className="flex-1 h-px bg-slate-100" />
                                        </div>
                                        <div className="space-y-0">
                                            {cat.entries.map(e => <DocEntryView key={e.id} entry={e} />)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <footer className="border-t border-slate-100 px-6 md:px-12 py-8 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                                Migra v1.0 • H2D Consultoria Técnica • Manual de Referência
                            </p>
                        </footer>
                    </main>
                </div>
            </div>
        </DashboardShell>
    );
}
