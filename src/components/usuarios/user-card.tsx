"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  Users,
  AtSign,
  Info,
  Camera,
  Loader2,
  FileText,
  Settings,
  Crown,
  Shield,
  KeyRound,
  Ban,
  ShieldCheck,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { formatBrazilianDate } from "@/lib/migration/datetime-br";
import { formatBrazilianPhone } from "@/lib/formatters";
import { normalizeAvatarPublicUrl } from "@/lib/storage/avatar-url";
import type { UserProfile } from "@/types/usuarios";
import { ROLE_LABELS } from "@/types/usuarios";
import type { AccessProfileRecord } from "@/hooks/use-access-permissions";
import { accessProfileCardLabel } from "@/hooks/use-access-profile-options";

const CARD_TOOLBAR_BTN =
  "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

interface UserCardProps {
  user: UserProfile;
  accessProfiles?: AccessProfileRecord[];
  isMe: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  isUploadingAvatar: boolean;
  emailEditUserId: string | null;
  emailEditValue: string;
  isSavingEmail: boolean;
  onAvatarUpload: (file: File) => void;
  onEmailEditStart: () => void;
  onEmailEditSave: () => void;
  onEmailEditCancel: () => void;
  onEmailChange: (value: string) => void;
  onViewUser: () => void;
  onEditUser: () => void;
  onToggleBlock: () => void;
  onOpenRoleDialog: () => void;
  onOpenResetConfirm: () => void;
  onOpenDeleteConfirm: () => void;
  onOpenSettings: () => void;
  onOpenSignatures: () => void;
}

function getRoleMeta(role: string, blocked: boolean) {
  if (blocked) {
    return {
      label: "Inativo",
      labelClass: "text-[#bb0000]",
      icon: <Ban className="w-3 h-3" aria-hidden />,
    };
  }
  if (role === "master") {
    return {
      label: ROLE_LABELS.master || "Master",
      labelClass: "text-[#0070f2]",
      icon: <Crown className="w-3 h-3" aria-hidden />,
    };
  }
  if (role === "admin") {
    return {
      label: ROLE_LABELS.admin || "Governança",
      labelClass: "text-[#0070f2]",
      icon: <ShieldCheck className="w-3 h-3" aria-hidden />,
    };
  }
  return {
    label: (role in ROLE_LABELS ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : undefined) || "Consultoria",
    labelClass: "text-[#107e3e]",
    icon: <Users className="w-3 h-3" aria-hidden />,
  };
}

function RoleStatusBadge({
  roleMeta,
  canChange,
  onChangeRole,
}: {
  roleMeta: ReturnType<typeof getRoleMeta>;
  canChange: boolean;
  onChangeRole: () => void;
}) {
  if (!canChange) {
    return (
      <div className={cn("fiori-project-card-status-label shrink-0", roleMeta.labelClass)}>
        {roleMeta.icon}
        {roleMeta.label}
      </div>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "fiori-project-card-status-label fiori-card-meta-editable shrink-0",
            roleMeta.labelClass,
          )}
          onClick={(e) => {
            e.stopPropagation();
            onChangeRole();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`Alterar perfil (${roleMeta.label})`}
        >
          {roleMeta.icon}
          {roleMeta.label}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" variant="fiori">
        Alterar perfil
      </TooltipContent>
    </Tooltip>
  );
}

function canDeleteUserProfile(
  viewer: { isMe: boolean; isMaster: boolean; isAdmin: boolean },
  target: UserProfile,
): boolean {
  if (viewer.isMe) return false;

  const targetIsMaster = target.role === "master" || target.isMaster;

  if (viewer.isMaster) return true;

  if (viewer.isAdmin) {
    return !targetIsMaster && target.role !== "admin";
  }

  return false;
}

export function UserCard({
  user,
  accessProfiles = [],
  isMe,
  isMaster,
  isAdmin,
  isUploadingAvatar,
  emailEditUserId,
  emailEditValue,
  isSavingEmail,
  onAvatarUpload,
  onEmailEditStart,
  onEmailEditSave,
  onEmailEditCancel,
  onEmailChange,
  onViewUser,
  onEditUser,
  onToggleBlock,
  onOpenRoleDialog,
  onOpenResetConfirm,
  onOpenDeleteConfirm,
  onOpenSettings,
  onOpenSignatures,
}: UserCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blocked = !!user.isDisabled;
  const isEditingEmail = emailEditUserId === user.uid;
  const roleMeta = getRoleMeta(user.role, blocked);
  const canDelete = canDeleteUserProfile({ isMe, isMaster, isAdmin }, user);
  const canEditEmail = isMaster || isMe;
  const { label: accessProfileName, isCustom: accessProfileIsCustom } = accessProfileCardLabel(
    accessProfiles,
    user.accessProfileId,
    user.role,
    user.isMaster,
  );
  const canChangeRole = isMaster && !isMe;
  const avatarSrc = normalizeAvatarPublicUrl(user.photoURL);

  const cardContent = (
    <div
      className={cn(
        "fiori-project-card fiori-user-card p-3 flex flex-col gap-2.5 transition-all group cursor-pointer relative overflow-hidden select-none",
        "outline-hidden focus-visible:ring-2 focus-visible:ring-[#0070f2] focus-visible:ring-offset-2",
        blocked && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn("fiori-user-card-avatar", isMe && "cursor-pointer")}
            onClick={() => isMe && fileInputRef.current?.click()}
          >
            <div className="fiori-user-card-avatar-inner relative" aria-hidden>
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt=""
                  fill
                  sizes="32px"
                  className="fiori-user-card-avatar-img"
                  unoptimized
                  draggable={false}
                />
              ) : (
                <span className="fiori-user-card-avatar-fallback">
                  {user.name?.substring(0, 2)}
                </span>
              )}
            </div>
            {isMe && !isUploadingAvatar && (
              <div
                className="fiori-user-card-avatar-overlay flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              >
                <Camera className="w-3 h-3 text-white" aria-hidden />
              </div>
            )}
            {isMe && isUploadingAvatar && (
              <div className="fiori-user-card-avatar-overlay flex items-center justify-center bg-black/40">
                <Loader2 className="w-3 h-3 animate-spin text-white" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="fiori-project-card-title truncate">{user.name}</span>
            {isMe && <span className="fiori-user-card-you-badge">Você</span>}
          </div>
        </div>

        <RoleStatusBadge
          roleMeta={roleMeta}
          canChange={canChangeRole}
          onChangeRole={onOpenRoleDialog}
        />
      </div>

      <div className="fiori-project-card-metrics fiori-project-card-metrics--panel">
        <EmailMetricPopover
          user={user}
          canEdit={canEditEmail}
          isOpen={isEditingEmail}
          value={emailEditValue}
          isSaving={isSavingEmail}
          onOpenChange={(open) => {
            if (open) onEmailEditStart();
            else onEmailEditCancel();
          }}
          onChange={onEmailChange}
          onSave={onEmailEditSave}
        />

        <div className="fiori-project-card-metrics-h-divider" aria-hidden />

        <div className="fiori-project-card-metrics-row">
          <div className="fiori-project-card-metric">
            <span className="fiori-project-card-metric-label">Cargo</span>
            <span
              className="fiori-project-card-metric-value line-clamp-2 whitespace-normal"
              title={user.position || undefined}
            >
              {user.position || "—"}
            </span>
          </div>

          <div className="fiori-project-card-metric-divider" aria-hidden />

          <div className="fiori-project-card-metric">
            <span className="fiori-project-card-metric-label">Empresa</span>
            <span
              className="fiori-project-card-metric-value line-clamp-2 whitespace-normal"
              title={user.company || undefined}
            >
              {user.company || "—"}
            </span>
          </div>
        </div>

        <div className="fiori-project-card-metrics-h-divider" aria-hidden />

        <div className="fiori-project-card-metric min-w-0">
          <span className="fiori-project-card-metric-label inline-flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 shrink-0 opacity-70" aria-hidden />
            Permissões
          </span>
          <span
            className={cn(
              "fiori-project-card-metric-value truncate",
              accessProfileIsCustom && "text-[#0070f2] font-semibold",
            )}
            title={accessProfileName}
          >
            {accessProfileName}
          </span>
        </div>
      </div>

      <div className="fiori-card-footer mt-auto flex items-center justify-between gap-2">
        <div className="fiori-card-toolbar">
          {isMe && (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={CARD_TOOLBAR_BTN}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewUser();
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" variant="fiori">
                  Visualizar ficha
                </TooltipContent>
              </Tooltip>
              {(isMaster || isAdmin) && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={CARD_TOOLBAR_BTN}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSettings();
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    Configuração
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={CARD_TOOLBAR_BTN}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSignatures();
                    }}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" variant="fiori">
                  Assinatura de e-mail
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {isMaster && !isMe && (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={CARD_TOOLBAR_BTN}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRoleDialog();
                    }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" variant="fiori">
                  Alterar perfil
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={CARD_TOOLBAR_BTN}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenResetConfirm();
                    }}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" variant="fiori">
                  Reset senha
                </TooltipContent>
              </Tooltip>
              {canDelete && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteConfirm();
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    Excluir
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
          {isAdmin && !isMe && (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={CARD_TOOLBAR_BTN}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditUser();
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" variant="fiori">
                  {(user.role === "master" || user.isMaster) && !isMaster
                    ? "Ver ficha"
                    : "Configuração"}
                </TooltipContent>
              </Tooltip>
              {(!user.isMaster && user.role !== "master") || isMaster ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        CARD_TOOLBAR_BTN,
                        blocked && "fiori-card-toolbar-btn-active",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBlock();
                      }}
                    >
                      {blocked ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    {blocked ? "Reativar" : "Bloquear"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div
                  className="flex h-7 w-7 cursor-not-allowed items-center justify-center text-[var(--fiori-label)] opacity-40"
                  title="Privilégios insuficientes"
                >
                  <Ban className="w-3.5 h-3.5" />
                </div>
              )}
              {canDelete && !isMaster && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteConfirm();
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant="fiori">
                    Excluir
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>

        <UserInfoTooltip user={user} />
      </div>
    </div>
  );

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && onAvatarUpload(e.target.files[0])}
        accept="image/*"
        className="hidden"
      />
      <ContextMenu>
        <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
        <UserContextMenuContent
          user={user}
          isMe={isMe}
          isMaster={isMaster}
          isAdmin={isAdmin}
          blocked={blocked}
          onViewUser={onViewUser}
          onEditUser={onEditUser}
          onToggleBlock={onToggleBlock}
          onOpenRoleDialog={onOpenRoleDialog}
          onOpenResetConfirm={onOpenResetConfirm}
          onOpenDeleteConfirm={onOpenDeleteConfirm}
          onOpenSettings={onOpenSettings}
        />
      </ContextMenu>
    </>
  );
}

function UserInfoTooltip({ user }: { user: UserProfile }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn")}
          onClick={(e) => e.stopPropagation()}
          aria-label="Ficha técnica"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" variant="fiori-panel" className="w-72">
        <div className="fiori-tooltip-panel-body p-4">
        <div className="space-y-3">
          <div className="border-b border-[var(--fiori-border-light)] pb-2">
            <h4 className="text-[0.8125rem] font-semibold text-[var(--fiori-text)]">
              {user.name}
            </h4>
            <p className="text-[0.6875rem] text-[var(--fiori-label)]">Ficha técnica</p>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {user.phone && (
              <InfoItem icon={<Phone className="w-2.5 h-2.5" />} label="Contato" value={formatBrazilianPhone(user.phone)} />
            )}
            {user.company && (
              <InfoItem icon={<Building2 className="w-2.5 h-2.5" />} label="Empresa" value={user.company} />
            )}
            {user.department && (
              <InfoItem icon={<AtSign className="w-2.5 h-2.5" />} label="Área" value={user.department} />
            )}
            {user.manager && (
              <InfoItem icon={<Users className="w-2.5 h-2.5" />} label="Gestor" value={user.manager} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-[var(--fiori-border-light)] pt-2">
            <DateItem label="Início" value={user.startDate} />
            <DateItem label="Término" value={user.endDate} />
          </div>
        </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1 text-[0.625rem] font-semibold text-[var(--fiori-label)]">
        {icon} {label}
      </p>
      <p className="text-[0.75rem] font-semibold text-[var(--fiori-text)]">{value}</p>
    </div>
  );
}

function DateItem({ label, value }: { label: string; value: string | undefined }) {
  const display = value ? formatBrazilianDate(value) : "—";
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1 text-[0.625rem] font-semibold text-[var(--fiori-label)]">
        <Calendar className="w-2.5 h-2.5" aria-hidden /> {label}
      </p>
      <p className="text-[0.75rem] font-semibold text-[var(--fiori-text)]">{display}</p>
    </div>
  );
}

function EmailMetricPopover({
  user,
  canEdit,
  isOpen,
  value,
  isSaving,
  onOpenChange,
  onChange,
  onSave,
}: {
  user: UserProfile;
  canEdit: boolean;
  isOpen: boolean;
  value: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const metricBody = (
    <>
      <span className="fiori-project-card-metric-label">E-mail</span>
      <span className="fiori-project-card-metric-value lowercase" title={user.email}>
        {user.email}
      </span>
    </>
  );

  if (!canEdit) {
    return (
      <div className="fiori-project-card-metric">
        {metricBody}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fiori-project-card-metric fiori-project-card-metric--editable w-full text-left"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
        aria-label="Editar e-mail"
      >
        {metricBody}
      </button>

      <Dialog preserveDashboardScroll open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          open={isOpen}
          variant="fiori"
          overlayClassName="fiori-dialog-overlay"
          className="fiori-dialog fiori-dialog--form flex w-[calc(100vw-2rem)] max-w-[20rem] flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)] [&>button]:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form
            className="flex min-h-0 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
              <DialogDescription className="sr-only">
                Editar e-mail de {user.name}
              </DialogDescription>
              <div className="fiori-dialog-header-row">
                <div className="fiori-dialog-icon shrink-0" aria-hidden>
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="fiori-dialog-title">Editar e-mail</DialogTitle>
                  <p className="fiori-dialog-subtitle truncate">{user.name}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="fiori-dialog-body">
              <div className="space-y-1.5">
                <label className="fiori-field-label" htmlFor={`email-edit-${user.uid}`}>
                  Endereço de e-mail
                </label>
                <Input
                  id={`email-edit-${user.uid}`}
                  type="email"
                  autoFocus
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onOpenChange(false);
                  }}
                  placeholder="nome@empresa.com"
                  className="fiori-input lowercase text-sm shadow-none"
                  autoComplete="email"
                />
                <p className="fiori-field-hint">
                  Atualiza o contato no diretório de profissionais.
                </p>
              </div>
            </div>

            <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
              <button
                type="button"
                className="fiori-btn-ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="fiori-btn-emphasized inline-flex items-center gap-1.5"
                disabled={isSaving || !value.trim()}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Salvar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserContextMenuContent({
  user,
  isMe,
  isMaster,
  isAdmin,
  blocked,
  onViewUser,
  onEditUser,
  onToggleBlock,
  onOpenRoleDialog,
  onOpenResetConfirm,
  onOpenDeleteConfirm,
}: {
  user: UserProfile;
  isMe: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  blocked: boolean;
  onViewUser: () => void;
  onEditUser: () => void;
  onToggleBlock: () => void;
  onOpenRoleDialog: () => void;
  onOpenResetConfirm: () => void;
  onOpenDeleteConfirm: () => void;
  onOpenSettings: () => void;
}) {
  const isTargetMaster = user.role === "master" || user.isMaster;
  const canDelete = canDeleteUserProfile({ isMe, isMaster, isAdmin }, user);

  return (
    <ContextMenuContent variant="fiori" className="fiori-dropdown-menu w-52">
      {isMe && (
        <ContextMenuItem
          onClick={onViewUser}
          className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[var(--fiori-text)] focus:bg-[#f5f6f7]"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--fiori-label)]" />
          Visualizar meus dados
        </ContextMenuItem>
      )}
      {isMaster && !isMe && (
        <>
          <ContextMenuItem
            onClick={onOpenRoleDialog}
            className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[#0070f2] focus:bg-[#e8f3ff]"
          >
            <Crown className="h-3.5 w-3.5 shrink-0" />
            Alterar perfil
          </ContextMenuItem>
          <ContextMenuItem
            onClick={onOpenResetConfirm}
            className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[#e76500] focus:bg-[#fff3e0]"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            Reset senha
          </ContextMenuItem>
          {canDelete && (
            <ContextMenuItem
              onClick={onOpenDeleteConfirm}
              className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[#bb0000] focus:bg-[#ffebeb]"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Excluir permanentemente
            </ContextMenuItem>
          )}
          <ContextMenuSeparator className="my-1 bg-[#e5e5e5]" />
        </>
      )}
      {isAdmin && !isMe && (
        <>
          <ContextMenuItem
            onClick={onEditUser}
            className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[var(--fiori-text)] focus:bg-[#f5f6f7]"
          >
            <Settings className="h-3.5 w-3.5 shrink-0 text-[#0070f2]" />
            {isTargetMaster && !isMaster ? "Ficha do profissional" : "Configuração técnica"}
          </ContextMenuItem>
          {((!user.isMaster && user.role !== "master") || isMaster) && (
            <ContextMenuItem
              onClick={onToggleBlock}
              className={cn(
                "cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold",
                blocked
                  ? "text-[#107e3e] focus:bg-[#f1f8f4]"
                  : "text-[#bb0000] focus:bg-[#ffebeb]",
              )}
            >
              {blocked ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Ban className="h-3.5 w-3.5 shrink-0" />
              )}
              {blocked ? "Reativar" : "Bloquear"}
            </ContextMenuItem>
          )}
          {canDelete && !isMaster && (
            <ContextMenuItem
              onClick={onOpenDeleteConfirm}
              className="cursor-pointer gap-2 rounded-sm text-[0.75rem] font-semibold text-[#bb0000] focus:bg-[#ffebeb]"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Excluir permanentemente
            </ContextMenuItem>
          )}
        </>
      )}
    </ContextMenuContent>
  );
}
