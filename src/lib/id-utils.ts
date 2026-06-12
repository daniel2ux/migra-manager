/**
 * Gera ID aleatório curto (9 chars, alfanumérico)
 * Usa Math.random().toString(36) como no padrão do projeto
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 11);
}

