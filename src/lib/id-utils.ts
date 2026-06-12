/**
 * Gera ID aleatório curto (9 chars, alfanumérico)
 * Usa Math.random().toString(36) como no padrão do projeto
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Gera ID aleatório ainda mais curto (7 chars)
 */
export function generateTinyId(): string {
  return Math.random().toString(36).substr(2, 7);
}

/**
 * Gera ID único para documentos de log
 */
export function generateLogId(mockId: string, objectName: string, line: number): string {
  return `${mockId}_${objectName}_line_${line}_${generateTinyId()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}
