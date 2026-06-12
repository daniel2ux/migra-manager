
'use server';
/**
 * @fileOverview An AI assistant for generating initial project, mock and object descriptions.
 *
 * - aiDescriptionGenerator - A function that generates a description based on keywords and type.
 * - AIDescriptionGeneratorInput - The input type for the aiDescriptionGenerator function.
 * - AIDescriptionGeneratorOutput - The return type for the aiDescriptionGenerator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDescriptionGeneratorInputSchema = z.object({
  type: z.enum(['project', 'mock', 'object']).describe('The type of entity to generate a description for (project, mock or object).'),
  keywords: z.string().describe('Comma-separated keywords or high-level goals for the description.'),
});
export type AIDescriptionGeneratorInput = z.infer<typeof AIDescriptionGeneratorInputSchema>;

const AIDescriptionGeneratorOutputSchema = z.object({
  description: z.string().describe('The generated summarized technical description in Portuguese (BR).'),
});
export type AIDescriptionGeneratorOutput = z.infer<typeof AIDescriptionGeneratorOutputSchema>;

export async function aiDescriptionGenerator(input: AIDescriptionGeneratorInput): Promise<AIDescriptionGeneratorOutput> {
  return aiDescriptionGeneratorFlow(input);
}

const aiDescriptionGeneratorPrompt = ai.definePrompt({
  name: 'aiDescriptionGeneratorPrompt',
  input: {schema: AIDescriptionGeneratorInputSchema},
  output: {schema: AIDescriptionGeneratorOutputSchema},
  prompt: `Você é um consultor técnico especialista em IS-U (Industry Solution for Utilities) e projetos de migração de dados.

Seu objetivo é gerar uma descrição profissional, tecnicamente precisa e RESUMIDA para um(a) entidade do tipo "{{{type}}}" baseada nas palavras-chave/objetivos fornecidos: "{{{keywords}}}".

Diretrizes Contextuais:
- Se o tipo for "project": Foque nos objetivos globais, estratégia de migração (ex: Big Bang ou Phased) e valor de negócio.
- Se o tipo for "mock": Foque na janela de ensaio específica, metas de volumetria e simulações de cutover.
- Se o tipo for "object": Forneça uma visão concisa do objeto técnico IS-U (ex: Parceiro de Negócio, Conta de Contrato, Instalação). Explique seu papel no modelo de dados IS-U e dependências principais.

O tom deve ser profissional, direto e acionável, adequado para gerentes técnicos e consultores funcionais. 
A saída deve estar obrigatoriamente em PORTUGUÊS (BRASIL) e ser CONCISA, focando apenas no escopo técnico e objetivos essenciais, evitando textos longos ou prolixos.`,
});

const aiDescriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'aiDescriptionGeneratorFlow',
    inputSchema: AIDescriptionGeneratorInputSchema,
    outputSchema: AIDescriptionGeneratorOutputSchema,
  },
  async input => {
    const {output} = await aiDescriptionGeneratorPrompt(input);
    return output!;
  }
);
