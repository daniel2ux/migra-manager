"use client";

import dynamic from "next/dynamic";

export { QuickCreateObjectDialog } from "./quick-create-object-dialog";
export { EditObjectDialog } from "./edit-object-dialog";

export const ImportDialog = dynamic(
  () => import("./import-dialog").then((m) => m.ImportDialog),
  { ssr: false },
);

export const DependencyMapperDialog = dynamic(
  () => import("./dependency-mapper-dialog").then((m) => m.DependencyMapperDialog),
  { ssr: false },
);

export const ParallelSelectDialog = dynamic(
  () => import("./parallel-select-dialog").then((m) => m.ParallelSelectDialog),
  { ssr: false },
);

export const SelectNextDialog = dynamic(
  () => import("./select-next-dialog").then((m) => m.SelectNextDialog),
  { ssr: false },
);

export const PrecedenceDialog = dynamic(
  () => import("./precedence-dialog").then((m) => m.PrecedenceDialog),
  { ssr: false },
);

export const ForceLockDialog = dynamic(
  () => import("@/components/migration/force-lock-dialog").then((m) => m.ForceLockDialog),
  { ssr: false },
);
