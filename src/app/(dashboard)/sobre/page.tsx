
"use client";

import { DashboardShell } from '@/components/layout/dashboard-shell';
import {
  Database,
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Lock,
  FileText,
  Activity,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function SobrePage() {
  const pillars = [
    {
      title: "Padronização Global",
      icon: Database,
      description: "Define objetos IS-U (Instalação, Contrato, Parceiro de Negócios) em um catálogo mestre único e reutilizável — eliminando inconsistências de nomenclatura entre projetos e ensaios.",
      color: "text-SkyBlue-600",
    },
    {
      title: "Qualidade em Tempo Real",
      icon: Target,
      description: "KPIs de sucesso, erro e aproveitamento calculados ao vivo durante a carga. Visibilidade total sobre cada objeto, com logs técnicos rastreáveis para auditoria.",
      color: "text-SkyBlue-600",
    }
  ];

  const audiences = [
    {
      icon: BarChart3,
      role: "Gestor de Projeto",
      benefit: "Acompanhe o progresso global, identifique gargalos e tome decisões de Go/No-Go com base em dados reais — sem dependência de planilhas manuais.",
      color: "bg-SkyBlue-50 text-SkyBlue-600",
    },
    {
      icon: Activity,
      role: "Especialista Técnico",
      benefit: "Registre e monitore KPIs por objeto em tempo real, compare ensaios consecutivos e documente impedimentos com rastreabilidade completa.",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: ShieldCheck,
      role: "Auditor / Analista",
      benefit: "Acesse o histórico completo de logs, variações de performance e justificativas técnicas — com isolamento garantido entre projetos simultâneos.",
      color: "bg-slate-100 text-slate-600",
    },
  ];

  const versionFeatures = [
    {
      title: "Dashboard em Tempo Real",
      desc: "Acompanhe o status de cada objeto com gráficos e indicadores atualizados automaticamente durante a execução no SAP. Oculte ou expanda painéis para adaptar o foco da análise.",
      icon: Activity
    },
    {
      title: "Análise Gráfica Avançada",
      desc: "Gráfico de resultados por objeto em escala logarítmica — permitindo identificar gargalos de performance e tendências de erro durante a carga.",
      icon: BarChart3
    },
    {
      title: "Logs Técnicos Colaborativos",
      desc: "Registre paradas, ajustes de tuning e justificativas de SLA diretamente em cada objeto. Comentários de administradores são destacados para rastreabilidade de auditoria.",
      icon: MessageSquare
    },
    {
      title: "Governança e Isolamento",
      desc: "RBAC com isolamento absoluto entre projetos: cada especialista acessa apenas os dados autorizados. Mocks bloqueados garantem integridade histórica para auditorias.",
      icon: Lock
    }
  ];

  const workflow = [
    { title: "Estruturação", desc: "Crie o ambiente do projeto, vincule a empresa-cliente e defina a equipe de especialistas." },
    { title: "Catalogação", desc: "Registre os objetos IS-U no Catálogo Mestre com agrupamento técnico e ordem de execução." },
    { title: "Planejamento", desc: "Organize cada ciclo de carga em uma Janela de Execução (Mock) com escopo e datas definidos." },
    { title: "Execução", desc: "Atualize KPIs em tempo real durante a carga no SAP: Target, Lido, Sucesso e Erro por objeto." },
    { title: "Validação", desc: "Analise performance e logs consolidados para embasar a decisão formal de Go/No-Go." }
  ];

  return (
    <DashboardShell noPadding>
      <div className="flex flex-col relative w-full min-h-screen">
        <PageHeader
          title="SOBRE O PRODUTO"
          subtitle="Visão Técnica e Visão de Valor"
          backHref="/"
        />

        <div className="max-w-6xl mx-auto space-y-24 py-10 px-4 sm:px-6">

          {/* Header com Branding e Versão */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b pb-12 border-slate-100">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-SkyBlue-50 border  text-SkyBlue-600 text-[10px] font-black uppercase tracking-widest">
                  <Zap className="w-3 h-3 fill-current" /> H2D Consultoria
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase px-3 py-1 rounded-none">
                  v1.0 · Lançamento Oficial
                </Badge>
              </div>
              <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
                Migra
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                A plataforma de gestão técnica para migrações{" "}
                <span className="text-slate-900 font-bold underline decoration-SkyBlue-500/30 decoration-4">IS-U</span>.{" "}
                Centralize, monitore e analise cada ensaio de carga — do planejamento à decisão de Go/No-Go.
              </p>
            </div>
          </header>

          {/* Para quem é */}
          <section className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-xs font-black text-SkyBlue-600 uppercase tracking-[0.3em]">Público-Alvo</h2>
              <p className="text-2xl font-bold text-slate-900">Desenvolvido para quem opera e decide</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {audiences.map((a, i) => (
                <div key={i} className="border border-slate-100 rounded-2xl p-6 space-y-4 hover:border-SkyBlue-200 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", a.color)}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{a.role}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{a.benefit}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Proposta de Valor / Benefícios */}
          <section className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-xs font-black text-SkyBlue-600 uppercase tracking-[0.3em]">Por que o Migra?</h2>
              <p className="text-2xl font-bold text-slate-900">Três pilares que fazem a diferença</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {pillars.map((pillar, index) => (
                <div key={index} className="space-y-4 group">
                  <div className={cn("w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center transition-all group-hover:bg-SkyBlue-50", pillar.color)}>
                    <pillar.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{pillar.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Funcionalidades da v1.0 com Carrossel */}
          <section className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-SkyBlue-600/10 blur-[120px] pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <Badge className="bg-SkyBlue-500 text-white border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-none">
                  Funcionalidades da v1.0
                </Badge>
                <h2 className="text-4xl font-black tracking-tight leading-tight">
                  Tudo que você precisa<br />para migrar com confiança
                </h2>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Do catálogo mestre à decisão de Go/No-Go — o Migra cobre cada etapa do processo de migração IS-U com rastreabilidade total e dados em tempo real.
                </p>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Monitoramento em tempo real
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Logs técnicos rastreáveis
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Governança RBAC
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> IA para documentação automática
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Importação em lote via planilha
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative px-4 sm:px-12">
                <Carousel className="w-full">
                  <CarouselContent>
                    {versionFeatures.map((f, i) => (
                      <CarouselItem key={i} className="md:basis-full">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-4xl flex flex-col gap-6 h-full hover:bg-white/10 transition-colors">
                          <div className="p-4 bg-SkyBlue-500/20 rounded-2xl h-fit w-fit text-SkyBlue-400">
                            <f.icon className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg uppercase text-slate-100 mb-3 tracking-tight">{f.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="hidden sm:flex justify-end gap-2 mt-6">
                    <CarouselPrevious className="static translate-y-0 bg-white/5 border-white/10 text-white hover:bg-white/10" />
                    <CarouselNext className="static translate-y-0 bg-white/5 border-white/10 text-white hover:bg-white/10" />
                  </div>
                </Carousel>
              </div>
            </div>
          </section>

          {/* Fluxo Operacional */}
          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
              <div className="space-y-2">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Metodologia H2D</h2>
                <p className="text-2xl font-bold text-slate-900">Fluxo de Excelência em Migração</p>
              </div>
              <p className="text-sm text-slate-500 max-w-md font-medium italic">
                Cinco etapas estruturadas para mitigar riscos e garantir rastreabilidade em projetos de alta complexidade.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
              {workflow.map((item, index) => (
                <div key={index} className="bg-white p-8 space-y-4 hover:bg-SkyBlue-50/40 transition-colors">
                  <span className="text-3xl font-black text-slate-100 transition-colors">0{index + 1}</span>
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tecnologia & Governança */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-8 border-t border-slate-100">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-SkyBlue-50 rounded-lg text-SkyBlue-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Inteligência Artificial</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                O Migra utiliza o modelo de linguagem{" "}
                <span className="text-slate-900 font-bold">Google Gemini</span> para sugerir descrições técnicas automaticamente ao cadastrar novos objetos IS-U — garantindo documentação padronizada e consistente com menos esforço manual.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-slate-600">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Segurança e Governança</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Controle de acesso baseado em papéis (RBAC) com regras rigorosas no Firebase Firestore. Cada consultor acessa apenas os projetos autorizados — com isolamento total entre clientes e auditorias simultâneas.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-20 pb-10 space-y-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="bg-SkyBlue-600 p-1.5 rounded-lg">
                    <Zap className="w-5 h-5 text-white fill-white" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-slate-900">Migra</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm uppercase font-bold tracking-widest">
                  A plataforma que transforma dados de migração IS-U em decisões técnicas confiáveis.
                </p>
                <Link href="/docs">
                  <Button variant="outline" size="sm" className="rounded-none text-[10px] font-black uppercase tracking-widest text-SkyBlue-600 border-SkyBlue-200 hover:bg-SkyBlue-50 gap-2 mt-2">
                    <FileText className="w-3.5 h-3.5" /> Ver Documentação
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</h5>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-SkyBlue-600" /> H2D Consultoria
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Muzambinho, Minas Gerais • Brasil</p>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suporte & Status</h5>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sistemas Operacionais</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-SkyBlue-600" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Cloud Security: Ativa</span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
                © 2026 H2D Consultoria. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-6">
                <p className="text-[10px] text-slate-300 font-medium italic">
                  Propriedade Intelectual Protegida
                </p>
                <p className="text-[10px] text-slate-400 font-black">v1.0.0</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </DashboardShell>
  );
}
