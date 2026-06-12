const TO_SNAKE: Record<string, string> = {
  uid: 'id',
  isMaster: 'is_master',
  isDisabled: 'is_disabled',
  mustChangePassword: 'must_change_password',
  migradorName: 'migrador_name',
  fromEmail: 'from_email',
  photoURL: 'photo_url',
  emailSignatures: 'email_signatures',
  projectIds: 'project_ids',
  projectOrder: 'project_order',
  memberUids: 'member_uids',
  memberProfiles: 'member_profiles',
  isLocked: 'is_locked',
  lockedByMaster: 'locked_by_master',
  lockedByUid: 'locked_by_uid',
  lockedByName: 'locked_by_name',
  ownerId: 'owner_id',
  projectId: 'project_id',
  mockId: 'mock_id',
  masterObjectId: 'master_object_id',
  explanatoryText: 'explanatory_text',
  startDate: 'start_date',
  endDate: 'end_date',
  isLoaded: 'is_loaded',
  isRunning: 'is_running',
  quantityExistingObjects: 'quantity_existing_objects',
  dataInicioCarga: 'data_inicio_carga',
  dataFimCarga: 'data_fim_carga',
  loadHistory: 'load_history',
  chargeGroup: 'charge_group',
  chargeOrder: 'charge_order',
  parallelOrder: 'parallel_order',
  isParallel: 'is_parallel',
  dependencyIds: 'dependency_ids',
  externalDependencies: 'external_dependencies',
  activityGroupIds: 'activity_group_ids',
  initialChargeStartTime: 'initial_charge_start_time',
  initialChargeEndTime: 'initial_charge_end_time',
  chargeStartTime: 'charge_start_time',
  chargeEndTime: 'charge_end_time',
  targetRecordsCount: 'target_records_count',
  processedRecordsCount: 'processed_records_count',
  migratedRecordsCount: 'migrated_records_count',
  successfulRecordsCount: 'successful_records_count',
  errorRecordsCount: 'error_records_count',
  currentChargeDurationMs: 'current_charge_duration_ms',
  previousMigratedRecordsCount: 'previous_migrated_records_count',
  previousChargeDurationMs: 'previous_charge_duration_ms',
  hasTechLogs: 'has_tech_logs',
  objectId: 'object_id',
  objectName: 'object_name',
  userId: 'user_id',
  userName: 'user_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  displayOrder: 'display_order',
  objectIds: 'object_ids',
  createdBy: 'created_by',
  groupIds: 'group_ids',
  createdByUid: 'created_by_uid',
  updatedByUid: 'updated_by_uid',
  fileNamePatterns: 'file_name_patterns',
  resourceId: 'resource_id',
  userEmail: 'user_email',
  lockedAt: 'locked_at',
  expiresAt: 'expires_at',
  lastSeen: 'last_seen',
  isOnline: 'is_online',
  userAgent: 'user_agent',
  infoKey: 'info_key',
  errorId: 'error_id',
  errorNumber: 'error_number',
  startedAt: 'started_at',
  importedAt: 'imported_at',
  sourceFileName: 'source_file_name',
  oldKey: 'old_key',
  updatedByName: 'updated_by_name',
  logPath: 'log_path',
  maxImportLines: 'max_import_lines',
};

const TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(TO_SNAKE).map(([k, v]) => [v, k]),
);

TO_CAMEL.id = 'id';
TO_CAMEL.uid = 'uid';

function mapKeys(obj: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = map[k] ?? k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[nk] = mapKeys(v as Record<string, unknown>, map);
    } else {
      out[nk] = v;
    }
  }
  return out;
}

export function toSnakeRow(data: Record<string, unknown>): Record<string, unknown> {
  return mapKeys(data, TO_SNAKE);
}

export function toCamelRow<T extends Record<string, unknown>>(row: Record<string, unknown>): T {
  const mapped = mapKeys(row, TO_CAMEL) as T;
  if (mapped.id && !mapped.uid && 'uid' in TO_CAMEL) {
    (mapped as Record<string, unknown>).uid = mapped.id;
  }
  return mapped;
}
