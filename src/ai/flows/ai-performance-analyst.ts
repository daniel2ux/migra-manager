
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PerformanceObjectSchema = z.object({
  name: z.string().describe('Nome do objeto de migração'),
  durationRef: z.number().describe('Duração na mock de referência em milissegundos'),
  durationTarget: z.number().describe('Duração na mock atual em milissegundos'),
  successRef: z.number().describe('Quantidade de sucessos na referência'),
  successTarget: z.number().describe('Quantidade de sucessos na atual'),
  errorRef: z.number().describe('Quantidade de erros na referência'),
  errorTarget: z.number().describe('Quantidade de erros na atual'),
});

const AIPerformanceAnalystInputSchema = z.object({
  referenceMockName: z.string().describe('Nome da mock de referência'),
  targetMockName: z.string().describe('Nome da mock alvo'),
  objects: z.array(PerformanceObjectSchema).describe('Lista de estatísticas por objeto'),
});

export type AIPerformanceAnalystInput = z.infer<typeof AIPerformanceAnalystInputSchema>;

const AIPerformanceAnalystOutputSchema = z.object({
  summary: z.string().describe('Resumo executivo da análise de performance'),
  bottlenecks: z.array(z.string()).describe('Lista de gargalos identificados'),
  improvements: z.array(z.string()).describe('Lista de melhorias significativas'),
  recommendations: z.array(z.string()).describe('Recomendações técnicas acionáveis'),
});

export type AIPerformanceAnalystOutput = z.infer<typeof AIPerformanceAnalystOutputSchema>;

const aiPerformanceAnalystPrompt = ai.definePrompt({
  name: 'aiPerformanceAnalystPrompt',
  input: {schema: AIPerformanceAnalystInputSchema},
  output: {schema: AIPerformanceAnalystOutputSchema},
  prompt: `Você é um Arquiteto de Migração de Dados especialista em sistemas SAP IS-U e performance de carga.
  
Sua tarefa é analisar os dados comparativos entre duas janelas de carga (Mocks) e fornecer um relatório executivo e técnico.

Dados de Entrada:
- Referência: {{{referenceMockName}}}
- Alvo: {{{targetMockName}}}
- Dados dos Objetos: {{{objects}}}

Diretrizes de Análise:
1. Compare as durações: Identifique onde houve degradação (aumento de tempo) ou otimização (redução).
2. Analise a qualidade (Sucesso vs Erro): Verifique se o aumento de performance não prejudicou a qualidade dos dados.
3. Identifique padrões: Por exemplo, se vários objetos de um mesmo grupo de carga falharam ou ficaram lentos.
4. Linguagem: Use terminologia técnica de migração (throughput, baseline, gargalo, cleanup, tuning).

Formato de Saída:
- summary: Um texto de 2 a 3 parágrafos em Português (BR) resumindo a saúde da migração nesta janela.
- bottlenecks: Liste até 5 objetos específicos que apresentaram problemas críticos.
- improvements: Liste os destaques positivos de performance ou qualidade.
- recommendations: Sugira ações concretas (ex: revisar índices, aumentar paralelismo, verificar conectores).

Seja direto, profissional e focado em dados reais fornecidos no input.`,
});

export const aiPerformanceAnalystFlow = ai.defineFlow(
  {
    name: 'aiPerformanceAnalystFlow',
    inputSchema: AIPerformanceAnalystInputSchema,
    outputSchema: AIPerformanceAnalystOutputSchema,
  },
  async input => {
    const {output} = await aiPerformanceAnalystPrompt(input);
    return output!;
  }
);
