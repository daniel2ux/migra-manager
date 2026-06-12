"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Box, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  selectedProjectId: string;
  selectedMockId: string;
  projects: any[] | null;
  projectMocks: any[] | null;
}

export function ReportFilters({
  selectedProjectId,
  selectedMockId,
  projects,
  projectMocks,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleProjectChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", val);
    params.set("mockId", "all");
    router.replace(`/relatorios?${params.toString()}`);
  };

  const handleMockChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mockId", val);
    router.replace(`/relatorios?${params.toString()}`);
  };

  const handlePrint = () => window.print();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-100">
        <ProjectSelector value={selectedProjectId} onChange={handleProjectChange} projects={projects} />

        <div className="w-px h-4 bg-slate-200" />

        <div className={cn("flex items-center", selectedProjectId === "all" && "opacity-30 grayscale pointer-events-none")}>
          <MockSelector
            value={selectedMockId}
            onChange={handleMockChange}
            projectMocks={projectMocks}
            disabled={selectedProjectId === "all"}
          />
        </div>

        <div className="w-px h-4 bg-slate-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="font-bold uppercase text-[10px]! tracking-widest h-8 w-8 border-0 text-slate-400 hover:text-slate-900 hover:bg-slate-200 bg-transparent transition-all rounded-none active:scale-95"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Imprimir Relatório
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

interface ProjectSelectorProps {
  value: string;
  onChange: (val: string) => void;
  projects: any[] | null;
}

function ProjectSelector({ value, onChange, projects }: ProjectSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto font-bold uppercase text-[10px]! tracking-widest gap-2 h-8 border-0 text-slate-600 hover:bg-slate-200 hover:text-slate-600 bg-transparent transition-all whitespace-nowrap rounded-none active:scale-95 shadow-none">
        <Filter className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        <SelectValue placeholder="Projeto" />
      </SelectTrigger>
      <SelectContent className="rounded-none border-slate-100 shadow-xl">
        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3 hover:bg-slate-50">
          Todos os Projetos
        </SelectItem>
        {projects?.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase tracking-widest py-3 hover:bg-slate-50">
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface MockSelectorProps {
  value: string;
  onChange: (val: string) => void;
  projectMocks: any[] | null;
  disabled: boolean;
}

function MockSelector({ value, onChange, projectMocks, disabled }: MockSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-auto font-bold uppercase text-[10px]! tracking-widest gap-2 h-8 border-0 text-slate-600 hover:bg-slate-200 hover:text-slate-600 bg-transparent transition-all whitespace-nowrap rounded-none active:scale-95 shadow-none">
        <Box className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        <SelectValue placeholder="Mock" />
      </SelectTrigger>
      <SelectContent className="rounded-none border-slate-100 shadow-xl">
        <SelectItem
          value="all"
          className="text-[10px] font-black uppercase tracking-widest py-3 bg-emerald-500 text-white data-highlighted:bg-emerald-600 data-highlighted:text-white focus:bg-emerald-600 focus:text-white"
        >
          Visão Consolidada
        </SelectItem>
        {projectMocks?.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-[10px] font-black uppercase tracking-widest py-3 hover:bg-slate-50">
            {m.name} {m.isRunning ? "— ATUAL" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
