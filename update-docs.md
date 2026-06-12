# Tarefa: Atualização Geral da Documentação (Abril 2026)

## 📋 Objetivos
Sincronizar todos os manuais técnicos, instruções de agente e guias de arquitetura com a realidade atual do sistema Migra (v2.7).

## 🚀 Etapas

### 1. README.md (v2.4)
- [x] Criar seção da Versão 2.4 com foco em:
  - Estabilidade (Build ID Estabilizado).
  - Grupos de Atividade.
  - Navegação via URL Search Params (Performance).
  - Segurança de SMTP.

### 2. docs/blueprint.md (Pivot Firebase)
- [x] Substituir Supabase por Firebase Auth/Firestore.
- [x] Atualizar guia de estilo (SkyBlue-500, Premium BI).
- [x] Atualizar estrutura de navegação para Top-Bar (conforme `migra-app.md`).

### 3. ARCHITECTURE.md (Raiz)
- [x] Criar novo arquivo na raiz detalhando:
  - Tech Stack (Next 15 + App Router).
  - Modelo de Dados (Firestore).
  - Fluxo de Seleção Persistente (Mocks/Projetos).
  - Integração com Genkit (AI).

### 4. migra-app.md (Agent Rules)
- [x] Adicionar changelog de segurança e estabilidade.
- [x] Refinar as regras de permissões RBAC.
### 5. Formulários & UX Premium (v2.5)
- [x] Atualizar `README.md` (v2.5) com foco no Premium Input Feedback.
- [x] Atualizar `ARCHITECTURE.md` para v2.5.
- [x] Sincronizar `migra-app.md` com os novos padrões de escala e sombra em campos de formulário.
- [x] Unificar o comportamento de foco eliminando estilos inline redundantes nos principais diálogos.
### 6. Visual Cleanliness (v2.6)
- [x] Remover padrões de `font-bold` de inputs no `migra-app.md`.
- [x] Sincronizar `ARCHITECTURE.md` para v2.6.
- [x] Atualizar `README.md` com as novidades da v2.6.

### 7. Modularization & Hooks (v2.7)
- [x] Extrair lógica da página de Mocks para `useMocksActions.ts`.
- [x] Fragmentar a UI em sub-componentes especializados em `src/components/mocks/`.
- [x] Atualizar `ARCHITECTURE.md`, `README.md` e `migra-app.md` para v2.7.
- [x] Documentar padrão de navegação `/objetos/[mockId]?projectId=` em `ARCHITECTURE.md` e `migra-app.md`.
- [x] Versão do header `ARCHITECTURE.md` atualizada de v2.4 → v2.7.

### 8. Fiori UI & Dead Code (v2.11)
- [x] Remover referências à rota removida `POST /api/fs/browse`.
- [x] Documentar `gestao-sequence.ts` e separação formatters vs sequence-utils.
- [x] Sincronizar `README.md`, `ARCHITECTURE.md`, `migra-app.md` e `docs/development-guide.md` para v2.11.

## ✅ Critério de Aceitação
- Todos os arquivos mencionam Firebase como backend único.
- A versão 2.11 está documentada como a atual no README.
- O padrão de modularização de componentes e hooks está documentado em ARCHITECTURE.md e migra-app.md.
- O Guia de Estilo no Blueprint e no Migra-App reflete a "Visual Cleanliness" e a modularidade.
