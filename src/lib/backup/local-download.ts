/** Salva o backup no disco local via diálogo do navegador (File System Access API ou download). */
export async function saveBackupLocally(blob: Blob, filename: string): Promise<void> {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const showSaveFilePicker = (
        window as Window & {
          showSaveFilePicker: (options: {
            suggestedName: string;
            types: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<{
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }
      ).showSaveFilePicker;

      const handle = await showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Backup Migra (.json.gz)',
            accept: { 'application/gzip': ['.json.gz'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Salvamento cancelado.');
      }
      // fallback para download clássico
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function parseFilenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1];
}
