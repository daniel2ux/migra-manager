import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

/**
 * Valida tamanho de arquivo antes do upload
 */
export function validateFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `A imagem deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

/**
 * Valida e retorna erro formatado para toast
 */
export function createFileUploadError(file: File): { title: string; description: string } | null {
  const error = validateFileSize(file);
  if (!error) return null;
  return {
    title: 'Erro no upload',
    description: error,
  };
}
