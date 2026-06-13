"use client";

import dynamic from "next/dynamic";

export const QuickCreateObjectDialog = dynamic(
  () => import("./quick-create-object-dialog").then((m) => m.QuickCreateObjectDialog),
  { ssr: false },
);

export const EditObjectDialog = dynamic(
  () => import("./edit-object-dialog").then((m) => m.EditObjectDialog),
  { ssr: false },
);

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

export const ResetSequenceDialog = dynamic(
  () => import("./sequence-dialogs").then((m) => m.ResetSequenceDialog),
  { ssr: false },
);

export const MigrationDialog = dynamic(
  () => import("./sequence-dialogs").then((m) => m.MigrationDialog),
  { ssr: false },
);

export const ProgressDialog = dynamic(
  () => import("./progress-dialog").then((m) => m.ProgressDialog),
  { ssr: false },
);

export const ForceLockDialog = dynamic(
  () => import("@/components/migration/force-lock-dialog").then((m) => m.ForceLockDialog),
  { ssr: false },
);
