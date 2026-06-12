interface GaxiosLikeError {
  code?: number;
  message?: string;
  errors?: Array<{ message?: string; reason?: string }>;
  response?: {
    status?: number;
    data?: GaxiosResponseData;
  };
}

type GaxiosResponseData = string | { error?: { message?: string; code?: number } };

function parseResponseData(
  data: GaxiosResponseData | undefined,
): { message?: string; code?: number } | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as { error?: { message?: string; code?: number } };
      return parsed.error;
    } catch {
      return undefined;
    }
  }
  return data.error;
}

/** Extrai mensagem legível de erros do Firebase Storage / Gaxios. */
export function getBackupApiError(err: unknown): { message: string; status: number } {
  const e = err as GaxiosLikeError;

  const responseError = parseResponseData(e.response?.data);
  const apiMessage = responseError?.message ?? e.errors?.[0]?.message ?? e.message;
  const apiCode = responseError?.code ?? e.code ?? e.response?.status;

  if (
    apiCode === 403 &&
    (apiMessage?.includes('billing account') ||
      apiMessage?.includes('accountDisabled') ||
      e.errors?.[0]?.reason === 'accountDisabled')
  ) {
    return {
      message:
        'Conta de faturamento do Firebase/Google Cloud inativa ou em atraso. ' +
        'Reative o billing no console do Firebase para gravar backups no Storage.',
      status: 503,
    };
  }

  if (apiMessage) {
    return { message: apiMessage, status: typeof apiCode === 'number' ? apiCode : 500 };
  }

  if (err instanceof Error && err.message) {
    return { message: err.message, status: 500 };
  }

  return { message: 'Erro interno do servidor.', status: 500 };
}
