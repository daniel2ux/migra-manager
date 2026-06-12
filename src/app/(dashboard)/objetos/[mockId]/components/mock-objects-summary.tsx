import { BarChart3 } from 'lucide-react';
import { formatNumber } from '@/lib/migration/format-utils';

interface MockObjectsSummaryProps {
  objectCount: number;
  totals: {
    target: number;
    processed: number;
    success: number;
    error: number;
  };
}

export function MockObjectsSummary({ objectCount, totals }: MockObjectsSummaryProps) {
  return (
    <>
      <div className="fiori-mock-summary-sticky-slot" aria-hidden="true" />
      <div className="fiori-mock-summary fiori-mock-summary--sticky">
        <div className="fiori-mock-summary-head">
          <div className="fiori-mock-summary-icon">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="fiori-mock-summary-titles">
            <span className="fiori-mock-summary-title">Resumo do mock</span>
            <span className="fiori-mock-summary-subtitle">Visão consolidada</span>
          </div>
        </div>

        <div className="fiori-mock-summary-metrics">
          <div className="fiori-mock-summary-metric">
            <span className="fiori-mock-summary-metric-label">Amostragem</span>
            <span className="fiori-mock-summary-metric-value">
              {objectCount} objeto{objectCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="fiori-mock-summary-divider" />

          <div className="fiori-mock-summary-metric">
            <span className="fiori-mock-summary-metric-label">Carga total</span>
            <span className="fiori-mock-summary-metric-value">{formatNumber(totals.target)}</span>
          </div>

          <div className="fiori-mock-summary-divider" />

          <div className="fiori-mock-summary-metric">
            <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--success">
              Sucesso
            </span>
            <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--success">
              {formatNumber(totals.success)}
            </span>
          </div>

          <div className="fiori-mock-summary-divider" />

          <div className="fiori-mock-summary-metric">
            <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--error">
              Erros
            </span>
            <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--error">
              {formatNumber(totals.error)}
            </span>
          </div>

          <div className="fiori-mock-summary-divider" />

          <span className="fiori-mock-summary-sync">Sincronizado</span>
        </div>
      </div>
    </>
  );
}
