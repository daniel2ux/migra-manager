import type { ElementType } from "react";
import {
    FolderPlus,
    Package,
    Box,
    BarChart,
    FileText,
    Settings,
    Shield,
    MessageSquare,
    Wrench,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocParam {
    name: string;
    type: string;
    required: boolean;
    description: string;
}

export interface DocStep {
    n: number;
    title: string;
    body: string;
}

export interface DocWarning {
    level: "info" | "warn" | "danger";
    text: string;
}

export interface DocEntry {
    id: string;
    title: string;
    section: string;          // man section number
    synopsis: string;
    description: string;
    params?: DocParam[];
    steps?: DocStep[];
    warnings?: DocWarning[];
    seeAlso?: string[];       // ids
}

export interface DocCategory {
    id: string;
    label: string;
    icon: ElementType;
    color: string;
    entries: DocEntry[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const DOCS: DocCategory[] = [
    {
        id: "projetos",
        label: "Projetos",
        icon: FolderPlus,
        color: "text-SkyBlue-500",
        entries: [
            {
                id: "projetos-criar",
                title: "Criar Projeto",
                section: "1",
                synopsis: "Cria um novo ambiente de projeto com escopo, empresa e equipe inicial.",
                description:
                    "Um Projeto é o container raiz de todo ciclo de migração. Ele agrega Mocks, membros da equipe e metadados de governança. Somente Administradores podem criar projetos. Após a criação, o projeto fica imediatamente disponível no painel de Projetos e no seletor de contexto da sidebar.",
                params: [
                    { name: "Nome", type: "string", required: true, description: "Identificador único do projeto. Ex: SAP IS-U — FASE 1." },
                    { name: "Empresa", type: "string", required: true, description: "Cliente ou empresa responsável pelo projeto." },
                    { name: "Descrição (Escopo)", type: "text", required: false, description: "Narrativa técnica do escopo de migração. Pode ser gerada via IA integrada." },
                    { name: "Membros", type: "multi-select", required: false, description: "Usuários atribuídos ao projeto. Membros recebem acesso ao dashboard e às mocks do projeto." },
                ],
                steps: [
                    { n: 1, title: "Acessar Projetos", body: "Navegue para Projetos na sidebar. Clique no botão '+' no canto superior direito do cabeçalho." },
                    { n: 2, title: "Preencher dados", body: "Informe Nome, Empresa e Descrição do Escopo. Use o botão de IA para gerar a descrição automaticamente a partir de um prompt." },
                    { n: 3, title: "Atribuir membros", body: "No campo Membros, selecione os usuários que participarão do projeto. Membros podem ser adicionados ou removidos a qualquer momento." },
                    { n: 4, title: "Salvar", body: "Clique em Salvar. O projeto aparece imediatamente na lista e no seletor de contexto da sidebar." },
                ],
                warnings: [
                    { level: "info", text: "A descrição do escopo é exibida no tooltip do card de projeto (ícone ⓘ) e serve como referência técnica para toda a equipe." },
                ],
                seeAlso: ["projetos-membros", "mocks-criar"],
            },
            {
                id: "projetos-editar",
                title: "Editar Projeto",
                section: "1",
                synopsis: "Atualiza os metadados de um projeto existente.",
                description:
                    "Permite alterar nome, empresa, descrição e foto de capa de um projeto. O bloqueio de edição simultânea impede que dois administradores modifiquem o mesmo projeto ao mesmo tempo — um banner âmbar é exibido dentro do dialog caso outro usuário já esteja editando.",
                steps: [
                    { n: 1, title: "Localizar projeto", body: "Na tela de Projetos, localize o card do projeto desejado." },
                    { n: 2, title: "Abrir edição", body: "Clique no ícone de lápis (✏) no rodapé do card. O sistema tentará adquirir o bloqueio de edição automaticamente." },
                    { n: 3, title: "Alterar campos", body: "Modifique os campos desejados. Todos os campos do dialog de criação estão disponíveis para edição." },
                    { n: 4, title: "Salvar ou Cancelar", body: "Clique em Salvar para persistir as alterações ou Cancelar para descartá-las. O bloqueio é liberado automaticamente em ambos os casos." },
                ],
                warnings: [
                    { level: "warn", text: "Se o banner âmbar 'Usuário X está editando' aparecer, aguarde a liberação antes de tentar editar. Forçar a edição pode sobrescrever dados." },
                ],
                seeAlso: ["projetos-criar", "acesso-bloqueio"],
            },
            {
                id: "projetos-membros",
                title: "Gerenciar Membros",
                section: "1",
                synopsis: "Adiciona ou remove usuários de um projeto.",
                description:
                    "O acesso de Especialistas é isolado por projeto — eles só visualizam dashboards e mocks de projetos aos quais foram explicitamente atribuídos. Administradores têm visibilidade global independente de atribuição.",
                steps: [
                    { n: 1, title: "Abrir edição do projeto", body: "Acesse o dialog de edição do projeto (ícone lápis no card)." },
                    { n: 2, title: "Campo Membros", body: "Utilize o seletor múltiplo para adicionar ou remover usuários. A lista exibe todos os usuários cadastrados no sistema." },
                    { n: 3, title: "Salvar", body: "As alterações de acesso têm efeito imediato após o salvamento — o membro removido perde acesso ao projeto instantaneamente." },
                ],
                warnings: [
                    { level: "info", text: "Membros removidos de um projeto perdem acesso ao dashboard, mas os registros de auditoria que eles criaram são preservados." },
                ],
                seeAlso: ["acesso-rbac"],
            },
            {
                id: "projetos-bloquear",
                title: "Bloquear / Desbloquear Projeto",
                section: "1",
                synopsis: "Altera o status de bloqueio de um projeto para proteger o histórico.",
                description:
                    "Um projeto bloqueado impede a criação de novas mocks e edição das mocks existentes. É utilizado quando o projeto foi concluído ou arquivado e o histórico precisa ser preservado para fins de auditoria.",
                steps: [
                    { n: 1, title: "Localizar o card", body: "Na tela de Projetos, identifique o card do projeto." },
                    { n: 2, title: "Acionar bloqueio", body: "Clique no ícone de cadeado (🔓/🔒) no rodapé do card. O sistema pedirá confirmação." },
                    { n: 3, title: "Confirmar", body: "Confirme a ação. O ícone muda para cadeado fechado e o card exibe o status 'Bloqueado'." },
                ],
                warnings: [
                    { level: "danger", text: "Projetos bloqueados não permitem criação de novas mocks nem edição das existentes. Desbloquear requer permissão de Administrador." },
                ],
                seeAlso: ["mocks-bloquear"],
            },
            {
                id: "projetos-excluir",
                title: "Excluir Projeto",
                section: "1",
                synopsis: "Remove permanentemente um projeto e todos os seus dados.",
                description:
                    "A exclusão de um projeto é irreversível e cascateia para todas as mocks e registros de performance associados. Esta operação só está disponível para Administradores em projetos não bloqueados.",
                steps: [
                    { n: 1, title: "Localizar o card", body: "Na tela de Projetos, identifique o card do projeto a ser removido." },
                    { n: 2, title: "Acionar exclusão", body: "Clique no ícone de lixeira (🗑) no rodapé do card." },
                    { n: 3, title: "Confirmar", body: "Um dialog de confirmação será exibido com o nome do projeto. Digite o nome para confirmar a exclusão irreversível." },
                ],
                warnings: [
                    { level: "danger", text: "Esta operação é irreversível. Todos os dados do projeto — mocks, KPIs, logs e registros de performance — serão permanentemente removidos." },
                    { level: "warn", text: "Projetos bloqueados não podem ser excluídos. Desbloqueie primeiro se a exclusão for necessária." },
                ],
                seeAlso: ["projetos-bloquear"],
            },
        ],
    },
    {
        id: "mocks",
        label: "Mocks (Janelas Técnicas)",
        icon: Package,
        color: "text-amber-500",
        entries: [
            {
                id: "mocks-criar",
                title: "Criar Mock",
                section: "2",
                synopsis: "Cria uma nova janela técnica de carga associada a um projeto.",
                description:
                    "Uma Mock representa um ensaio de carga completo ou um ciclo de volumetria. Ela agrupa os objetos IS-U que serão executados naquela janela de tempo e registra todos os KPIs de performance de cada execução.",
                params: [
                    { name: "Nome", type: "string", required: true, description: "Identificador da janela. Ex: MOCK 3 — FULL LOAD ou CICLO 01 — PARCIAL." },
                    { name: "Data de Execução", type: "date", required: false, description: "Data planejada ou realizada da janela de carga." },
                    { name: "Objetos", type: "multi-select", required: false, description: "Objetos do catálogo que farão parte desta janela específica." },
                    { name: "Target por Objeto", type: "number", required: false, description: "Volume de registros previsto para cada objeto nesta janela." },
                ],
                steps: [
                    { n: 1, title: "Acessar Mocks", body: "Navegue para a tela de Mocks via sidebar ou pelo botão 'MOCKS' no card de projeto." },
                    { n: 2, title: "Nova Mock", body: "Clique no botão '+' no cabeçalho. O dialog de criação será aberto." },
                    { n: 3, title: "Definir objetos", body: "Selecione os objetos do catálogo que participarão desta janela. O target pode ser definido individualmente por objeto." },
                    { n: 4, title: "Salvar", body: "Salve a mock. Ela aparece na lista com status PENDENTE até ser ativada." },
                ],
                warnings: [
                    { level: "info", text: "Uma mock não precisa conter todos os objetos do projeto — cada janela pode ser parcial (subset de objetos) ou total." },
                ],
                seeAlso: ["mocks-ativar", "objetos-criar"],
            },
            {
                id: "mocks-ativar",
                title: "Ativar Mock (Iniciar Execução)",
                section: "2",
                synopsis: "Marca uma mock como EM ANDAMENTO, tornando-a visível no dashboard.",
                description:
                    "Ativar uma mock sinaliza que a janela de carga está em execução no ambiente SAP. A mock passa a aparecer no seletor de contexto do dashboard e os KPIs dos seus objetos ficam disponíveis para atualização em tempo real.",
                steps: [
                    { n: 1, title: "Localizar a mock", body: "Na tela de Mocks, localize a janela desejada com status ABERTO." },
                    { n: 2, title: "Acionar Play", body: "Clique no ícone ▶ (Play) na linha da mock. O status muda para EM ANDAMENTO com pulsação laranja e ícone de raio (⚡)." },
                    { n: 3, title: "Acompanhar no dashboard", body: "Navegue para o Dashboard e selecione a mock ativada no seletor de contexto para visualizar os KPIs em tempo real." },
                ],
                warnings: [
                    { level: "warn", text: "Apenas uma mock por projeto deve estar EM ANDAMENTO por vez. Ativar múltiplas mocks simultaneamente pode gerar confusão no dashboard." },
                ],
                seeAlso: ["mocks-finalizar", "objetos-atualizar"],
            },
            {
                id: "mocks-finalizar",
                title: "Finalizar Mock",
                section: "2",
                synopsis: "Encerra a execução de uma mock, registrando o ciclo como concluído.",
                description:
                    "Finalizar uma mock muda seu status de EM ANDAMENTO para CONCLUÍDA. Os dados ficam disponíveis para análise nos relatórios e o comparativo com a próxima mock começa a ser calculado automaticamente.",
                steps: [
                    { n: 1, title: "Localizar a mock ativa", body: "Na tela de Mocks, identifique a mock com status EM ANDAMENTO." },
                    { n: 2, title: "Acionar Stop", body: "Clique no ícone ■ (Stop) na linha da mock. O sistema confirmará a finalização e o status mudará para CONCLUÍDA com ícone de check (✔)." },
                    { n: 3, title: "Verificar KPIs", body: "Certifique-se de que todos os objetos relevantes estão com seus KPIs atualizados antes de finalizar." },
                ],
                warnings: [
                    { level: "info", text: "Após finalizar, os KPIs ainda podem ser editados enquanto a mock não for bloqueada. Use a Edição Rápida no dashboard para correções pós-execução." },
                ],
                seeAlso: ["mocks-bloquear", "mocks-edicao-rapida"],
            },
            {
                id: "mocks-bloquear",
                title: "Bloquear Mock",
                section: "2",
                synopsis: "Congela os dados de uma mock para fins de auditoria.",
                description:
                    "Uma mock bloqueada tem todos os seus KPIs e logs tornados imutáveis. Utilize esta ação após a validação Go/No-Go para preservar o registro histórico oficial da janela de carga.",
                steps: [
                    { n: 1, title: "Selecionar a mock", body: "Na tela de Mocks, localize a mock CONCLUÍDA que deseja bloquear." },
                    { n: 2, title: "Acionar bloqueio", body: "Clique no ícone de cadeado na linha da mock." },
                    { n: 3, title: "Confirmar", body: "O status muda para ENCERRADO com ícone de cadeado fechado (🔒) e a mock não permite mais edições." },
                ],
                warnings: [
                    { level: "danger", text: "Mocks bloqueadas não permitem edição de KPIs, datas ou logs. Desbloquear requer permissão de Administrador." },
                    { level: "info", text: "O bloqueio deve ser aplicado após o registro formal da decisão Go/No-Go no mural de logs." },
                ],
                seeAlso: ["logs-mural", "projetos-bloquear"],
            },
            {
                id: "mocks-resetar",
                title: "Resetar Objeto (em Mock)",
                section: "2",
                synopsis: "Zera os KPIs de um objeto específico dentro de uma mock.",
                description:
                    "O reset de um objeto apaga seus registros de KPI (target, lido, sucesso, erro, datas de início/fim) dentro da mock atual, retornando-o ao estado PENDENTE. Útil quando uma execução foi cancelada e precisa ser refeita do zero.",
                steps: [
                    { n: 1, title: "Acessar detalhes da mock", body: "Na tela de Mocks, clique no nome da mock para abrir a tela de detalhes com a tabela de objetos." },
                    { n: 2, title: "Localizar o objeto", body: "Na tabela de performance, identifique o objeto a ser resetado." },
                    { n: 3, title: "Acionar Reset Total", body: "Clique no ícone de reset (↺) na linha do objeto. Um dialog de confirmação será exibido." },
                    { n: 4, title: "Confirmar", body: "Confirme o reset. Todos os KPIs do objeto nesta mock serão zerados." },
                ],
                warnings: [
                    { level: "danger", text: "O reset é irreversível dentro da mock. Os dados anteriores não podem ser recuperados." },
                    { level: "warn", text: "Mocks bloqueadas não permitem reset de objetos." },
                ],
                seeAlso: ["mocks-bloquear", "objetos-atualizar"],
            },
            {
                id: "mocks-edicao-rapida",
                title: "Edição Rápida de Ciclo",
                section: "2",
                synopsis: "Atualiza datas e KPIs de um objeto diretamente pelo dashboard.",
                description:
                    "A Edição Rápida (ícone ⚡ no card do dashboard) permite atualizar os campos de execução de um objeto sem precisar navegar para a tela de detalhes da mock. Ideal para atualizações durante ou após a execução.",
                params: [
                    { name: "Início", type: "datetime", required: false, description: "Horário de início da carga do objeto." },
                    { name: "Término", type: "datetime", required: false, description: "Horário de encerramento da carga." },
                    { name: "Target", type: "number", required: false, description: "Volume de registros esperado na seleção." },
                    { name: "Lido", type: "number", required: false, description: "Total de registros processados pela ferramenta de carga." },
                    { name: "Sucesso", type: "number", required: false, description: "Registros criados com sucesso no SAP." },
                ],
                steps: [
                    { n: 1, title: "Localizar o card", body: "No Dashboard, localize o card do objeto desejado." },
                    { n: 2, title: "Abrir Edição Rápida", body: "Clique no ícone ⚡ (Zap) no rodapé do card. O sistema tentará adquirir o bloqueio de edição." },
                    { n: 3, title: "Atualizar campos", body: "Preencha ou atualize os campos de KPI. Os erros são calculados automaticamente (Lido − Sucesso)." },
                    { n: 4, title: "Salvar Ciclo", body: "Clique em 'Salvar Ciclo' para persistir as alterações. O bloqueio é liberado automaticamente." },
                ],
                warnings: [
                    { level: "info", text: "Os erros são calculados automaticamente pelo sistema (Erro = Lido − Sucesso). Não há campo manual para erros." },
                    { level: "warn", text: "Mocks bloqueadas não permitem Edição Rápida." },
                ],
                seeAlso: ["acesso-bloqueio", "mocks-bloquear"],
            },
        ],
    },
    {
        id: "objetos",
        label: "Catálogo de Objetos",
        icon: Box,
        color: "text-violet-500",
        entries: [
            {
                id: "objetos-criar",
                title: "Criar Objeto Master",
                section: "3",
                synopsis: "Cadastra um novo objeto técnico IS-U no catálogo global.",
                description:
                    "O Catálogo de Objetos Master é o registro global e reutilizável de todos os objetos técnicos do projeto de migração (ex: Instalações, Parceiros de Negócio, Contratos). Este catálogo é compartilhado entre todos os projetos e apenas Administradores podem criar ou editar entradas.",
                params: [
                    { name: "Nome", type: "string", required: true, description: "Identificador técnico do objeto. Ex: IS-U_INST_001 ou BP_CLIE." },
                    { name: "Descrição", type: "text", required: false, description: "Descrição funcional do objeto e seu propósito na migração." },
                    { name: "Grupo de Carga", type: "string", required: true, description: "Agrupamento técnico (G1, G2…). Objetos do mesmo grupo podem ser executados em paralelo." },
                    { name: "Ordem de Execução", type: "number", required: true, description: "Sequência lógica dentro do grupo, respeitando dependências entre objetos. Ex: 1, 2, 3." },
                    { name: "Ordem Paralela", type: "decimal", required: false, description: "Sufixo decimal para objetos em paralelo dentro do mesmo nível. Ex: 3.1, 3.2." },
                    { name: "Dependências", type: "multi-select", required: false, description: "Outros objetos do catálogo que devem ser concluídos antes deste." },
                ],
                steps: [
                    { n: 1, title: "Acessar Catálogo", body: "Navegue para Catálogo de Objetos na sidebar." },
                    { n: 2, title: "Novo Objeto", body: "Clique no botão '+ Novo Objeto' no cabeçalho." },
                    { n: 3, title: "Preencher dados", body: "Informe nome, grupo, ordem e dependências. A ordem de execução determina a posição do card no dashboard." },
                    { n: 4, title: "Configurar dependências", body: "Selecione os objetos que devem ser concluídos antes deste. O sistema detectará dependências circulares automaticamente." },
                    { n: 5, title: "Salvar", body: "O objeto é adicionado ao catálogo e ficará disponível para seleção em novas mocks." },
                ],
                warnings: [
                    { level: "warn", text: "Objetos em uso (vinculados a mocks ativas) não podem ser excluídos. É necessário remover o vínculo com as mocks primeiro." },
                    { level: "info", text: "Alterações na ordem de execução ou grupo de carga de um objeto refletem imediatamente na ordenação do dashboard." },
                ],
                seeAlso: ["objetos-dependencias", "objetos-paralelismo", "mocks-criar"],
            },
            {
                id: "objetos-dependencias",
                title: "Configurar Dependências",
                section: "3",
                synopsis: "Define quais objetos devem ser concluídos antes de um objeto poder ser iniciado.",
                description:
                    "As dependências formam a cadeia de precedência de carga. O sistema constrói automaticamente a cadeia completa (transitiva) e a exibe no tooltip de Carga Consolidada no dashboard. Dependências circulares são detectadas e sinalizadas com um alerta vermelho pulsante.",
                params: [
                    { name: "Dependências Diretas", type: "multi-select", required: false, description: "Objetos que devem ser concluídos imediatamente antes deste. O sistema calculará a cadeia transitiva automaticamente." },
                ],
                steps: [
                    { n: 1, title: "Abrir edição do objeto", body: "No Catálogo, clique no ícone de edição do objeto." },
                    { n: 2, title: "Campo Dependências", body: "Selecione os objetos que são pré-requisitos diretos para este objeto." },
                    { n: 3, title: "Verificar cadeia", body: "No tooltip de Carga Consolidada do dashboard, a cadeia de precedência completa é exibida visualmente com badges e setas." },
                ],
                warnings: [
                    { level: "danger", text: "Dependências circulares (A→B→A) são detectadas automaticamente e sinalizadas com badge vermelho pulsante 'Cadeia Circular Detectada'. Corrija imediatamente — cargas circulares não podem ser executadas." },
                ],
                seeAlso: ["objetos-criar", "objetos-paralelismo"],
            },
            {
                id: "objetos-paralelismo",
                title: "Configurar Paralelismo",
                section: "3",
                synopsis: "Define objetos que podem ser executados simultaneamente no mesmo nível de carga.",
                description:
                    "Objetos paralelos compartilham o mesmo número de ordem de execução e são identificados pelo campo Ordem Paralela (sufixo decimal). No dashboard, são marcados com o badge PARA e ícone de bifurcação (⑂).",
                params: [
                    { name: "Ordem de Execução", type: "number", required: true, description: "Deve ser igual ao dos outros objetos paralelos no mesmo grupo. Ex: todos com ordem 3." },
                    { name: "Ordem Paralela", type: "decimal", required: true, description: "Distingue objetos no mesmo nível: 3.1, 3.2, 3.3… O sistema usa este campo para identificar o grupo paralelo." },
                ],
                steps: [
                    { n: 1, title: "Definir ordem igual", body: "Atribua o mesmo número de Ordem de Execução a todos os objetos que devem ser paralelos (ex: todos com ordem 3)." },
                    { n: 2, title: "Definir ordem paralela", body: "Atribua Ordem Paralela com sufixo decimal para cada um: 3.1, 3.2, 3.3..." },
                    { n: 3, title: "Verificar no dashboard", body: "Os objetos paralelos aparecerão agrupados no mesmo nível do card e com badge PARA verde." },
                ],
                warnings: [
                    { level: "info", text: "Objetos sem sufixo decimal são tratados como objetos sequenciais únicos, mesmo que tenham a mesma ordem de execução que outros." },
                ],
                seeAlso: ["objetos-criar", "objetos-dependencias"],
            },
            {
                id: "objetos-importar",
                title: "Importar via CSV",
                section: "3",
                synopsis: "Importa múltiplos objetos master de uma planilha CSV.",
                description:
                    "O catálogo suporta importação em lote via arquivo CSV. Este recurso é ideal para a configuração inicial de projetos com grande número de objetos. O sistema valida o formato e reporta erros linha a linha.",
                params: [
                    { name: "name", type: "string (coluna CSV)", required: true, description: "Nome do objeto." },
                    { name: "chargeGroup", type: "string (coluna CSV)", required: true, description: "Grupo de carga (G1, G2…)." },
                    { name: "chargeOrder", type: "number (coluna CSV)", required: true, description: "Ordem de execução dentro do grupo." },
                    { name: "parallelOrder", type: "decimal (coluna CSV)", required: false, description: "Sufixo decimal para objetos paralelos." },
                    { name: "description", type: "string (coluna CSV)", required: false, description: "Descrição funcional do objeto." },
                ],
                steps: [
                    { n: 1, title: "Preparar o CSV", body: "Crie um arquivo CSV com as colunas: name, chargeGroup, chargeOrder, parallelOrder, description. A primeira linha deve ser o cabeçalho." },
                    { n: 2, title: "Acessar importação", body: "No Catálogo de Objetos, clique no botão 'Importar CSV' no cabeçalho." },
                    { n: 3, title: "Selecionar arquivo", body: "Selecione o arquivo CSV no dialog de upload." },
                    { n: 4, title: "Revisar e confirmar", body: "O sistema exibe um preview das linhas a serem importadas. Confirme para persistir." },
                ],
                warnings: [
                    { level: "warn", text: "Objetos com o mesmo nome de um objeto já existente no catálogo serão ignorados na importação. Renomeie-os no CSV se a intenção for criar duplicatas intencionais." },
                    { level: "info", text: "A importação não sobrescreve objetos existentes. É aditiva — apenas adiciona novos registros." },
                ],
                seeAlso: ["objetos-criar"],
            },
        ],
    },
    {
        id: "dashboard",
        label: "Dashboard & Performance",
        icon: BarChart,
        color: "text-emerald-500",
        entries: [
            {
                id: "dashboard-filtros",
                title: "Filtros de Performance",
                section: "4",
                synopsis: "Filtra os cards de objetos no dashboard por múltiplos critérios.",
                description:
                    "O painel de filtros (ícone funil) permite segmentar os cards de objetos por nome, status de execução, objetos em andamento e percentual de carga. Múltiplos filtros são cumulativos (AND lógico).",
                params: [
                    { name: "Busca por nome", type: "text", required: false, description: "Filtra por substring no nome do objeto. Não diferencia maiúsculas/minúsculas." },
                    { name: "Status", type: "select", required: false, description: "Filtra por status: Todos, Em Andamento, Concluído, Pendente." },
                    { name: "Carga em Andamento", type: "toggle", required: false, description: "Exibe somente objetos com carga iniciada e não finalizada." },
                    { name: "% Carga", type: "operador + número", required: false, description: "Filtra por percentual de aproveitamento com operadores: >=, <=, =, >, <. Ex: >= 90 exibe somente objetos com 90% ou mais de aproveitamento." },
                ],
                steps: [
                    { n: 1, title: "Abrir filtros", body: "Clique no ícone de funil no cabeçalho do dashboard. O painel de filtros desliza para baixo." },
                    { n: 2, title: "Aplicar filtros", body: "Preencha os campos desejados. Os cards são filtrados em tempo real sem necessidade de confirmar." },
                    { n: 3, title: "Limpar filtros", body: "Clique em 'Limpar Tudo' para remover todos os filtros ativos de uma vez." },
                ],
                warnings: [
                    { level: "info", text: "O badge no ícone de funil indica o número de filtros ativos simultaneamente." },
                ],
                seeAlso: ["dashboard-ordenacao"],
            },
            {
                id: "dashboard-ordenacao",
                title: "Ordenação dos Cards",
                section: "4",
                synopsis: "Define a ordem de exibição dos cards de objetos no dashboard.",
                description:
                    "Os cards do dashboard são sempre ordenados pela sequência definida no Catálogo de Objetos Master (chargeGroup → chargeOrder → parallelOrder). Esta ordenação é determinística e não pode ser alterada manualmente — reflete a sequência real de execução da carga no SAP.",
                warnings: [
                    { level: "info", text: "Para alterar a ordem dos cards, altere o Grupo de Carga ou a Ordem de Execução do objeto no Catálogo de Objetos. A mudança reflete imediatamente no dashboard." },
                ],
                seeAlso: ["objetos-criar", "objetos-paralelismo"],
            },
            {
                id: "dashboard-consolidado",
                title: "Carga Consolidada (% Carga)",
                section: "4",
                synopsis: "Exibe o indicador consolidado de aproveitamento acumulado de todas as mocks.",
                description:
                    "O bloco '% CARGA' em cada card agrega os KPIs de todas as mocks executadas para aquele objeto no projeto, calculando o aproveitamento total (Sucesso Total ÷ Target Total). Clicar no bloco abre o tooltip detalhado com a cadeia de precedência e os indicadores individuais.",
                warnings: [
                    { level: "info", text: "A cor do percentual segue a escala: verde (100%), âmbar (≥ 50%), vermelho (< 50% ou com erros). Objetos sem dados aparecem em slate." },
                ],
                seeAlso: ["dashboard-filtros", "objetos-dependencias"],
            },
            {
                id: "dashboard-contexto",
                title: "Menu de Contexto dos Cards",
                section: "4",
                synopsis: "Clique com o botão direito em um card de objeto para acessar ações rápidas.",
                description:
                    "O menu de contexto (botão direito sobre o card) disponibiliza atalhos para: FILTRO (filtra o dashboard pelo nome do objeto), RELATÓRIOS (abre o Relatório de Resultados com o objeto pré-selecionado), ESTATÍSTICA (abre a Estatística de Carga com o objeto pré-selecionado), LOG/COMENTÁRIO, EXIBIR LOGS e, para Administradores, EDIÇÃO RÁPIDA com opções de iniciar, finalizar e reiniciar carga.",
                steps: [
                    { n: 1, title: "Abrir menu", body: "Clique com o botão direito (ou pressione longo no mobile) sobre qualquer card de objeto no dashboard." },
                    { n: 2, title: "Selecionar ação", body: "Clique na ação desejada. FILTRO aplica filtro imediato pelo nome do objeto; RELATÓRIOS e ESTATÍSTICA abrem os painéis com o objeto pré-selecionado." },
                ],
                warnings: [
                    { level: "info", text: "As opções de EDIÇÃO RÁPIDA (iniciar, finalizar, reiniciar) são visíveis apenas para perfis Administrador e Master." },
                    { level: "info", text: "Membros visualizam apenas as opções de leitura no menu de contexto." },
                ],
                seeAlso: ["dashboard-filtros", "relatorios-estatistica"],
            },
            {
                id: "dashboard-precedencia",
                title: "Explorador de Precedência",
                section: "4",
                synopsis: "Visualiza o grafo completo de dependências dos objetos de migração.",
                description:
                    "O Explorador de Precedência (botão DIAGRAMA PRECEDÊNCIA no cabeçalho da Gestão de Objetos) exibe um grafo interativo com layout esquerda→direita. Os objetos raiz (sem dependências) ficam à esquerda; dependentes avançam para colunas à direita conforme a profundidade da cadeia. Linhas sólidas representam dependências explícitas; linhas pontilhadas cinza representam a sequência de carga (chargeOrder consecutivo dentro do mesmo chargeGroup). O usuário deve buscar e selecionar um objeto para explorar sua árvore de precedência recursiva.",
                steps: [
                    { n: 1, title: "Abrir explorador", body: "Na página de Gestão de Objetos, clique no botão DIAGRAMA PRECEDÊNCIA no cabeçalho." },
                    { n: 2, title: "Buscar objeto", body: "No campo de busca, digite o nome do objeto. Selecione o objeto desejado na lista de sugestões." },
                    { n: 3, title: "Explorar", body: "O grafo renderiza a árvore de precedência completa do objeto selecionado — todos os ancestrais recursivos aparecem à esquerda, com o objeto selecionado destacado." },
                    { n: 4, title: "Navegar", body: "Use zoom (botões + / -) e arraste para navegar. A MiniMap no canto inferior direito facilita a navegação em grafos grandes." },
                ],
                warnings: [
                    { level: "info", text: "O grafo é disponível para Administradores e Membros. Membros visualizam apenas o botão Visualizar Precedência nos cards de objeto." },
                    { level: "info", text: "Linhas pontilhadas indicam sequência de carga (chargeOrder consecutivo no mesmo grupo), não dependência explícita configurada." },
                    { level: "warn", text: "Em projetos com muitos objetos, o grafo completo pode ser denso. Use o campo de busca para focar em um objeto específico." },
                ],
                seeAlso: ["objetos-dependencias", "objetos-paralelismo"],
            },
            {
                id: "dashboard-comparativa",
                title: "Painel Comparativo de Performance",
                section: "4",
                synopsis: "Compara o desempenho de duas mocks em um gráfico de área com variação percentual por objeto.",
                description:
                    "O painel COMPARATIVA exibe um gráfico de área com escala logarítmica sobrepondo as curvas de duração de carga de duas mocks: a mock de referência (laranja) e a mock alvo (verde). Cada ponto da linha alvo exibe o percentual de variação em relação à referência. Verde indica melhoria (menor duração), vermelho indica piora (maior duração) e cinza indica variação nula. O painel lateral exibe o ranking TOP VARIAÇÕES com os objetos de maior delta absoluto.",
                params: [
                    { name: "Mock Alvo", type: "select", required: true, description: "Mock selecionada no header (seletor de mock). Não disponível no modo 'Todas as Mocks'." },
                    { name: "Mock Referência", type: "automático", required: false, description: "Mock imediatamente anterior à mock alvo na sequência do projeto. Determinada automaticamente." },
                ],
                steps: [
                    { n: 1, title: "Selecionar mock", body: "No seletor de mock do header, escolha uma mock específica (não 'Todas as Mocks')." },
                    { n: 2, title: "Ativar comparativa", body: "Clique em COMPARATIVA no toggle do header (canto superior direito). O painel substitui os cards de resultado." },
                    { n: 3, title: "Interpretar o gráfico", body: "Cada ponto da linha verde exibe o % de variação em relação à referência. Verde = mais rápido, vermelho = mais lento, cinza = sem variação." },
                    { n: 4, title: "Verificar top variações", body: "O painel TOP VARIAÇÕES à direita lista os objetos com maior delta absoluto em ordem decrescente." },
                ],
                warnings: [
                    { level: "info", text: "O painel COMPARATIVA só é exibido quando uma mock específica está selecionada. Com 'Todas as Mocks' ativo, o botão COMPARATIVA fica desabilitado." },
                    { level: "info", text: "A escala logarítmica permite visualizar simultaneamente objetos com durações muito discrepantes (ex: 1s vs 30min)." },
                    { level: "warn", text: "Se a mock de referência não tiver dados para um objeto, a variação é exibida como 0% (cinza)." },
                ],
                seeAlso: ["dashboard-filtros", "relatorios-estatistica"],
            },
        ],
    },
    {
        id: "relatorios",
        label: "Relatórios",
        icon: FileText,
        color: "text-rose-500",
        entries: [
            {
                id: "relatorios-estatistica",
                title: "Estatística de Carga",
                section: "5",
                synopsis: "Gera relatório detalhado de KPIs por objeto e permite exportar para Excel ou enviar por e-mail, incluindo planilha e tabela de erros quando houver.",
                description:
                    "O painel de Estatística de Carga exibe uma tabela com os campos Migrador, Data Migr., HrExecMig, Empresa, Obj.Migr., Ok, Erro, Processados, % Ok, % Erro, Modificado, Hora mod. e Temp.Trab. para cada objeto selecionado. É acessado através do botão de gráfico no dashboard. A seleção de objetos é feita via lista à esquerda — por padrão todos os objetos estão selecionados. O migrador é preenchido automaticamente com o nome cadastrado em Perfil. Se algum objeto selecionado possuir erros de carga, o Excel gera automaticamente um segundo arquivo de erros e o e-mail inclui a tabela de erros abaixo da tabela de estatísticas.",
                params: [
                    { name: "Objetos", type: "multi-select", required: false, description: "Objetos incluídos no relatório. Selecione na lista à esquerda do painel. Padrão: todos." },
                    { name: "Modo Excel", type: "select", required: false, description: "'Único arquivo' gera um .xlsx de estatística + um .xlsx de erros (se houver). 'Por objeto' gera um .xlsx por objeto compactados em .zip, incluindo o arquivo de erros de cada objeto com erros." },
                ],
                steps: [
                    { n: 1, title: "Abrir painel", body: "No dashboard, clique no ícone de estatística (📊). O painel de Estatística de Carga abre em tela cheia." },
                    { n: 2, title: "Selecionar objetos", body: "Na lista à esquerda, marque ou desmarque os objetos desejados. Use o campo de pesquisa para filtrar." },
                    { n: 3, title: "Exportar Excel", body: "Clique em Excel para exportar. Se houver erros, dois arquivos são gerados: {mock}-estatisticas-carga.xlsx e {mock}-erros-carga.xlsx. Use a seta (▾) para escolher o modo." },
                    { n: 4, title: "Enviar por e-mail", body: "Clique em E-mail para abrir o dialog de composição. Se houver erros, a tabela de erros é incluída automaticamente abaixo das estatísticas. Preencha o destinatário e clique em Enviar ou Abrir no Cliente." },
                ],
                warnings: [
                    { level: "info", text: "O nome do migrador é preenchido automaticamente a partir de Perfil → Identificação do Migrador. Configure-o antes de gerar o relatório." },
                    { level: "info", text: "O envio direto por e-mail requer que o SMTP esteja configurado em Configurações → Sistema → Configuração SMTP." },
                    { level: "info", text: "A planilha e a tabela de erros são geradas/incluídas automaticamente apenas para objetos com errorRecordsCount > 0. O botão E-mail mostra um spinner enquanto busca os dados de erros." },
                ],
                seeAlso: ["relatorios-email", "config-smtp", "config-perfil"],
            },
            {
                id: "relatorios-email",
                title: "Compor e Enviar E-mail de Estatística",
                section: "5",
                synopsis: "Compõe e envia e-mail formatado com a tabela de KPIs, tabela de erros (quando houver) e assinatura pessoal.",
                description:
                    "O dialog de composição de e-mail pré-preenche assunto, remetente (a partir de Perfil) e saudação automática baseada no horário. O corpo inclui a tabela HTML de KPIs compatível com Outlook e Gmail. Se algum objeto selecionado possuir erros, uma segunda tabela de erros (Migrador, Data Migr., HrExecMig, Empresa, Obj.Migr., Erro ID, Cód. Erro, Ocorrências, Mensagem) é incluída automaticamente abaixo das estatísticas. A assinatura selecionada é incluída no envio direto (SMTP) e omitida ao abrir no cliente externo. O campo Para possui autocomplete com os e-mails dos usuários cadastrados no sistema.",
                params: [
                    { name: "De", type: "string", required: false, description: "Preenchido automaticamente com o e-mail de origem do Perfil ou e-mail de login." },
                    { name: "Para", type: "string", required: true, description: "Destinatário do e-mail. Suporta autocomplete com usuários do sistema." },
                    { name: "Assunto", type: "string", required: true, description: "Pré-preenchido com 'carga [OBJETO] - [MOCK]' para objeto único ou 'carga - [MOCK]' para múltiplos." },
                    { name: "Assinatura", type: "select", required: false, description: "Assinatura pessoal cadastrada em Perfil → Assinaturas de E-mail. Incluída apenas no envio SMTP." },
                ],
                steps: [
                    { n: 1, title: "Abrir composição", body: "No painel de Estatística de Carga, clique em E-mail. O dialog abre com os campos pré-preenchidos." },
                    { n: 2, title: "Preencher destinatário", body: "No campo Para, digite o e-mail ou escolha via autocomplete." },
                    { n: 3, title: "Selecionar assinatura", body: "Escolha uma assinatura no seletor ou deixe em Nenhuma." },
                    { n: 4, title: "Enviar", body: "Clique em Enviar para entrega via SMTP ou Abrir no Cliente para abrir o client de e-mail com assunto e destinatário preenchidos (corpo copiado automaticamente)." },
                ],
                warnings: [
                    { level: "info", text: "Ao usar 'Abrir no Cliente', o corpo HTML é copiado automaticamente para a área de transferência. Apague o texto pré-existente no cliente e cole (Ctrl+V) para preservar a formatação." },
                    { level: "warn", text: "O envio via SMTP requer configuração prévia em Configurações → Sistema → Configuração SMTP." },
                ],
                seeAlso: ["config-smtp", "config-perfil", "relatorios-estatistica"],
            },
            {
                id: "relatorios-erros",
                title: "Relatório de Erros",
                section: "5",
                synopsis: "Exibe e exporta o log detalhado de erros de carga por objeto, com sumário por tipo de erro e opção de download em Excel.",
                description:
                    "O Relatório de Erros é acessado pelo ícone de alerta (⚠) em cada card de objeto com erros. Exibe dois painéis: o sumário agrupa os erros por tipo (Erro ID + Cód. Erro) com contagem de ocorrências e mensagem amostra; o detalhe lista todos os registros individuais filtrados pelo tipo selecionado. O botão Excel exporta os dados no mesmo formato da planilha de estatística — colunas Migrador, Data Migr., HrExecMig, Empresa, Obj.Migr., Erro ID, Cód. Erro, Ocorrências, Mensagem — com uma linha por tipo de erro. O arquivo é nomeado no padrão <mock>-<objeto>-erros-carga.xlsx.",
                params: [
                    { name: "Tipo de Erro", type: "select", required: false, description: "Clique em uma linha do sumário para filtrar o painel de detalhe por aquele tipo. Clique novamente para desfiltrar." },
                    { name: "Pesquisa", type: "string", required: false, description: "Filtra o detalhe por chave, Erro ID, Cód. Erro ou mensagem. Pode ser combinado com o filtro de tipo." },
                ],
                steps: [
                    { n: 1, title: "Abrir relatório", body: "No dashboard, clique no badge vermelho de erros ou no ícone de alerta no card do objeto. O dialog abre e carrega os logs automaticamente." },
                    { n: 2, title: "Explorar erros", body: "Clique em uma linha do sumário para ver os registros daquele tipo no painel inferior. Use o campo de pesquisa para refinar." },
                    { n: 3, title: "Exportar Excel", body: "Clique em Excel no rodapé. O arquivo é gerado com uma linha por tipo de erro e nomeado <mock>-<objeto>-erros-carga.xlsx." },
                ],
                warnings: [
                    { level: "info", text: "O relatório carrega até 500 registros de log. Se o objeto tiver mais erros, use a pesquisa para localizar registros específicos." },
                    { level: "info", text: "Os campos Migrador, Data Migr., HrExecMig e Empresa na planilha Excel são alimentados automaticamente a partir dos dados de carga do objeto." },
                ],
                seeAlso: ["relatorios-estatistica", "relatorios-consolidado"],
            },
            {
                id: "relatorios-consolidado",
                title: "Relatório Consolidado",
                section: "5",
                synopsis: "Visão consolidada de volumes e qualidade por objeto em todas as mocks.",
                description:
                    "Exibe o gráfico de barras com Target, Lido, Sucesso e Erro para cada objeto, consolidando todas as mocks do projeto. Utiliza escala logarítmica para permitir comparação entre objetos de volumes muito diferentes.",
                warnings: [
                    { level: "info", text: "A escala logarítmica é automática e não pode ser desativada. Valores reais são sempre exibidos no tooltip ao passar o mouse sobre as barras." },
                ],
                seeAlso: [],
            },
        ],
    },
    {
        id: "acesso",
        label: "Acesso & Governança",
        icon: Shield,
        color: "text-slate-500",
        entries: [
            {
                id: "acesso-rbac",
                title: "Perfis de Usuário (RBAC)",
                section: "6",
                synopsis: "Define os níveis de acesso disponíveis no sistema.",
                description:
                    "O sistema implementa controle de acesso baseado em papéis (RBAC) com três perfis: Master, Administrador e Membro. As permissões são verificadas em tempo real e bloqueadas tanto na export interface quanto nas rotas — não é possível contorná-las via URL direta.",
                params: [
                    { name: "Master", type: "role", required: false, description: "Nível mais alto do sistema. Herda todas as permissões de Administrador e possui acesso exclusivo a: alterar perfis de usuário, redefinir senhas, acessar Configurações do Sistema, Grupos de Atividade, Perfil e importar logs de migração." },
                    { name: "Administrador", type: "role", required: false, description: "Acesso total: criar/editar/excluir projetos, objetos, mocks e usuários. Acesso a relatórios, Configurações, Grupos de Atividade e Perfil. Visibilidade global de todos os projetos." },
                    { name: "Membro", type: "role", required: false, description: "Acesso restrito aos projetos atribuídos. Pode visualizar o dashboard, objetos e consultar logs de migração. Não pode criar projetos, objetos master, acessar relatórios, Configurações, Grupos de Atividade ou Perfil. No dashboard, apenas o botão Visualizar Precedência está disponível nos cards." },
                ],
                warnings: [
                    { level: "info", text: "O perfil de acesso só pode ser alterado por um Master na tela de Usuários (Configurações → Usuários)." },
                    { level: "warn", text: "Membros que não estão atribuídos a nenhum projeto não visualizarão nenhum dashboard ou mock." },
                    { level: "info", text: "O menu Configurações (incluindo Perfil) é visível exclusivamente para perfis Master e Administrador. Membros que acessarem as rotas diretamente verão tela de acesso restrito." },
                ],
                seeAlso: ["projetos-membros", "acesso-bloqueio"],
            },
            {
                id: "acesso-bloqueio",
                title: "Bloqueio de Edição Simultânea",
                section: "6",
                synopsis: "Impede que dois usuários editem o mesmo recurso ao mesmo tempo.",
                description:
                    "O sistema utiliza bloqueios de presença armazenados no banco de dados (tabela edit_locks). Quando um usuário abre um dialog de edição, o sistema tenta adquirir o bloqueio atomicamente via transação. Se outro usuário já possui o bloqueio, a edição é recusada e o nome do editor atual é exibido. O bloqueio expira automaticamente em 5 minutos sem atividade (TTL) e é renovado a cada 90 segundos enquanto o dialog estiver aberto.",
                warnings: [
                    { level: "info", text: "O TTL de 5 minutos garante que bloqueios orphans (ex: browser fechado abruptamente) sejam limpos automaticamente sem intervenção manual." },
                    { level: "warn", text: "Se o banner âmbar aparecer indicando que outro usuário está editando, aguarde a liberação. Não tente forçar a edição — o sistema bloqueará a tentativa." },
                ],
                seeAlso: ["acesso-rbac"],
            },
        ],
    },
    {
        id: "config",
        label: "Configurações do Sistema",
        icon: Settings,
        color: "text-slate-500",
        entries: [
            {
                id: "config-caminho-logs",
                title: "Configurar Caminho dos Logs",
                section: "7",
                synopsis: "Define o diretório do servidor onde os arquivos .err de migração estão armazenados.",
                description:
                    "O caminho de logs é um parâmetro global persistido em app_config/settings no banco de dados. Ele é lido pelo servidor Node.js no momento da importação — portanto deve ser um caminho absoluto acessível pelo processo que executa a aplicação. Somente perfis Master e Administrador podem ler e gravar esta configuração. Se o caminho não estiver configurado ao abrir o dialog de importação, o próprio dialog exibirá um campo para informá-lo sem necessidade de acessar a tela de Configurações.",
                params: [
                    { name: "Caminho do Diretório", type: "string", required: true, description: "Caminho absoluto no servidor. Ex: /var/logs/migration ou C:\\migra\\logs. Deve conter arquivos com extensão .err." },
                ],
                steps: [
                    { n: 1, title: "Acessar Configurações", body: "Na sidebar, clique em Configurações → Sistema. A tela está disponível apenas para perfis Master e Administrador." },
                    { n: 2, title: "Informar o caminho", body: "No campo 'Caminho do diretório', insira o caminho absoluto do diretório no servidor onde os arquivos .err estão armazenados." },
                    { n: 3, title: "Salvar", body: "Clique em Salvar. A configuração é persistida no banco de dados (app_config/settings) com timestamp e responsável." },
                ],
                warnings: [
                    { level: "warn", text: "O diretório deve ser acessível pelo processo Node.js do servidor. Caminhos de rede (UNC/NFS) são suportados desde que o processo tenha permissão de leitura." },
                    { level: "info", text: "Somente arquivos com extensão .err são utilizados na importação de logs de migração. Outros formatos são ignorados." },
                ],
                seeAlso: ["config-importar-logs"],
            },
            {
                id: "config-importar-logs",
                title: "Importar Logs de Migração",
                section: "7",
                synopsis: "Escaneia o diretório configurado em busca de arquivos .err correspondentes aos objetos selecionados e grava os registros na coleção migrationLogs.",
                description:
                    "O processo de importação lê o diretório configurado no servidor, filtra arquivos .err cujo nome contenha o nome de cada objeto selecionado (busca case-insensitive), e exibe uma checklist para revisão antes da importação. Todos os arquivos encontrados ficam marcados por padrão — o usuário pode desmarcar os que não devem ser importados. O campo object de cada registro é sempre gravado com o nome canônico do objeto cadastrado no sistema, independentemente do conteúdo da primeira coluna do arquivo .err. Os registros são gravados na coleção migrationLogs via batched writes (lotes de 400 documentos).",
                params: [
                    { name: "Seleção de Objetos", type: "multi-select", required: false, description: "Objetos com checkbox marcado na tela de Gestão. Se nenhum estiver selecionado, todos os objetos visíveis são considerados." },
                    { name: "Arquivo .err", type: "file", required: true, description: "Arquivo no diretório configurado cujo nome contenha o nome do objeto (busca case-insensitive). Apenas arquivos .err são considerados." },
                ],
                steps: [
                    { n: 1, title: "Selecionar objetos (opcional)", body: "Na tela de Gestão de uma mock, marque os checkboxes dos objetos cujos logs deseja importar. Sem seleção, todos os objetos visíveis são usados." },
                    { n: 2, title: "Abrir importação", body: "Clique no ícone de terminal (⌨) no cabeçalho da página ou no ícone de importação na linha do objeto. O dialog abre e inicia automaticamente o escaneamento do diretório configurado." },
                    { n: 3, title: "Revisar checklist", body: "O dialog exibe todos os arquivos .err encontrados, agrupados por objeto, com checkboxes marcados. Desmarque os arquivos que não devem ser importados. Objetos sem arquivo correspondente são indicados com aviso." },
                    { n: 4, title: "Importar", body: "Clique em 'Importar N arquivos'. O terminal interno exibe o progresso arquivo a arquivo com contagem de linhas lidas, registros gravados e erros." },
                    { n: 5, title: "Resumo", body: "Ao final, o terminal exibe o resumo: arquivos processados, linhas lidas, registros gravados, excluídos (reimportação) e erros de parse." },
                    { n: 6, title: "Nova importação", body: "Clique em 'Nova importação' para reescanear o diretório sem fechar o dialog. Use 'Recarregar' durante a etapa de checklist para atualizar a lista de arquivos." },
                ],
                warnings: [
                    { level: "warn", text: "A importação é uma operação de substituição: todos os registros existentes para aquele par MOCK+OBJECT são excluídos antes da gravação dos novos." },
                    { level: "info", text: "O campo object é sempre gravado com o nome canônico do objeto do sistema — não com o valor da primeira coluna do arquivo .err. Isso garante que a consulta de logs e o visualizador de erros encontrem os registros corretamente." },
                    { level: "info", text: "Toda importação gera entrada em audit_logs com: responsável, arquivo fonte, contagem de gravados/excluídos/erros e timestamp." },
                    { level: "info", text: "Se o caminho de logs não estiver configurado, o dialog exibirá um campo para informá-lo e iniciará o escaneamento automaticamente após salvar." },
                ],
                seeAlso: ["config-caminho-logs", "config-reimportacao"],
            },
            {
                id: "config-smtp",
                title: "Configuração SMTP",
                section: "7",
                synopsis: "Define as credenciais do servidor de e-mail utilizado para envio direto de estatísticas de carga.",
                description:
                    "As configurações SMTP são persistidas em app_config/smtp_config no banco de dados e lidas pelo servidor Node.js no momento do envio. O envio é realizado via Nodemailer. Somente perfis Master e Administrador podem configurar o SMTP. As credenciais são armazenadas no servidor e nunca expostas ao cliente.",
                params: [
                    { name: "Host SMTP", type: "string", required: true, description: "Endereço do servidor SMTP. Ex: smtp.gmail.com ou smtp.office365.com." },
                    { name: "Porta", type: "number", required: true, description: "587 para STARTTLS (padrão) ou 465 para SSL/TLS." },
                    { name: "SSL/TLS", type: "toggle", required: false, description: "Ative apenas se usar a porta 465. Para porta 587, mantenha desativado." },
                    { name: "Usuário", type: "string", required: true, description: "E-mail ou usuário de autenticação SMTP." },
                    { name: "Senha", type: "password", required: true, description: "Senha ou app password do servidor SMTP." },
                ],
                steps: [
                    { n: 1, title: "Acessar configurações", body: "Na sidebar, clique em Configurações → Sistema. Localize a seção Configuração SMTP." },
                    { n: 2, title: "Preencher credenciais", body: "Informe Host, Porta, Usuário e Senha. Para Gmail, utilize smtp.gmail.com, porta 587 e uma App Password (não a senha da conta)." },
                    { n: 3, title: "Salvar", body: "Clique em Salvar. As credenciais são gravadas em appConfig/smtpConfig com timestamp e responsável." },
                ],
                warnings: [
                    { level: "danger", text: "Não utilize a senha principal da conta. Crie uma App Password dedicada no provedor (Google, Microsoft) para uso exclusivo nesta integração." },
                    { level: "warn", text: "Certifique-se de usar o host SMTP e não o host IMAP. Um erro comum é informar imap.gmail.com no lugar de smtp.gmail.com." },
                    { level: "info", text: "Após salvar, teste o envio via Estatística de Carga → E-mail → Enviar para validar as credenciais." },
                ],
                seeAlso: ["relatorios-email", "config-perfil"],
            },
            {
                id: "config-perfil",
                title: "Perfil Pessoal",
                section: "7",
                synopsis: "Configura o nome do migrador, e-mail de origem e assinaturas pessoais utilizados nos relatórios e e-mails.",
                description:
                    "O Perfil está disponível apenas para perfis Master e Administrador via Configurações → Perfil. As informações são persistidas no perfil do usuário (profiles). O nome do migrador é preenchido automaticamente na coluna Migrador da Estatística de Carga. O e-mail de origem é usado como padrão no campo De ao compor e-mails. As assinaturas são selecionáveis no dialog de composição.",
                params: [
                    { name: "Nome do Migrador", type: "string", required: false, description: "Identificador do executor da carga. Gravado em maiúsculas. Preenche automaticamente a coluna Migrador na Estatística." },
                    { name: "E-mail de Origem", type: "email", required: false, description: "Endereço exibido no campo De ao compor e-mails. Se vazio, usa o e-mail de login." },
                    { name: "Assinaturas de E-mail", type: "list", required: false, description: "Lista de assinaturas pessoais com nome e conteúdo multilinha. A primeira linha do conteúdo é renderizada em negrito e fonte maior." },
                ],
                steps: [
                    { n: 1, title: "Acessar Perfil", body: "Na sidebar, clique em Configurações → Perfil. A página está disponível apenas para perfis Master e Administrador." },
                    { n: 2, title: "Migrador", body: "Informe o nome do migrador e clique em Salvar. O nome será usado automaticamente nos relatórios de Estatística de Carga." },
                    { n: 3, title: "E-mail de Origem", body: "Informe o endereço de e-mail desejado e clique em Salvar. Será pré-preenchido no campo De ao compor e-mails." },
                    { n: 4, title: "Assinatura", body: "Informe o nome e o conteúdo da assinatura (uma linha por parágrafo). Clique em Adicionar. A assinatura ficará disponível no seletor do dialog de composição." },
                ],
                warnings: [
                    { level: "info", text: "A primeira linha da assinatura é renderizada em negrito e tamanho maior no e-mail. Use-a para o nome completo." },
                    { level: "info", text: "Múltiplas assinaturas podem ser cadastradas. Selecione a desejada ao compor o e-mail." },
                ],
                seeAlso: ["relatorios-email", "config-smtp"],
            },
            {
                id: "config-reimportacao",
                title: "Reimportação (mesmo MOCK/OBJECT)",
                section: "7",
                synopsis: "Substitui todos os registros de logs de um par MOCK+OBJECT por novos dados do arquivo .err.",
                description:
                    "Ao importar um arquivo para um par MOCK+OBJECT que já possui registros em migration_logs, o sistema executa exclusão prévia em lotes de 400 registros seguida de gravação dos novos em lotes de 400. Não há operação atômica global por limitação de tamanho de lote (máx. 500 ops/lote). A estratégia adotada garante idempotência: se o processo for interrompido, a próxima importação retomará o delete e reinserirá corretamente. O estado transitório (dados parciais) existe apenas durante a janela de execução e é aceitável para este contexto de uso interno.",
                warnings: [
                    { level: "warn", text: "Durante a reimportação, existe uma janela transitória em que os dados antigos foram excluídos mas os novos ainda não foram todos gravados. Evite consultar migrationLogs neste intervalo." },
                    { level: "info", text: "A contagem de 'Excluídos' no resumo final reflete os documentos do lote anterior que foram removidos antes da nova carga." },
                ],
                seeAlso: ["config-importar-logs"],
            },
        ],
    },
    {
        id: "logs",
        label: "Logs & Colaboração",
        icon: MessageSquare,
        color: "text-teal-500",
        entries: [
            {
                id: "logs-mural",
                title: "Mural de Logs Técnicos",
                section: "8",
                synopsis: "Registra comentários técnicos e decisões de auditoria por objeto.",
                description:
                    "Cada objeto em uma mock possui um mural de logs colaborativo. Os logs são ordenados cronologicamente e identificam o autor. Comentários de Administradores são destacados com badge azul para evidenciar decisões de governança e auditoria.",
                steps: [
                    { n: 1, title: "Abrir mural", body: "No card do dashboard, clique no ícone de balão de comentário (💬). O painel de logs será exibido." },
                    { n: 2, title: "Adicionar log", body: "Digite o comentário no campo de texto e clique em 'Salvar Log'. O log é registrado com timestamp e nome do autor." },
                    { n: 3, title: "Identificar comentários de admin", body: "Logs de Administradores exibem badge azul 'ADMIN' para diferenciação visual." },
                ],
                warnings: [
                    { level: "danger", text: "Logs técnicos não podem ser editados ou excluídos após serem salvos. Registre apenas informações corretas e rastreáveis." },
                    { level: "info", text: "Utilize os logs para registrar: paradas de sistema, ajustes de tuning, justificativas de erro e decisões de Go/No-Go." },
                ],
                seeAlso: ["mocks-bloquear"],
            },
            {
                id: "logs-consulta",
                title: "Consulta de Logs de Migração",
                section: "8",
                synopsis: "Pesquisa e visualiza registros da coleção migrationLogs com filtros por mock, objeto, intervalo de datas e texto livre.",
                description:
                    "A página Consulta de Logs permite inspecionar todos os registros gravados durante importações de migração. Acessível a usuários com perfil Master, Admin e Membro. A busca é sempre iniciada explicitamente pelo usuário (search-first): nenhum dado é carregado até que os filtros sejam configurados e o botão Buscar seja acionado. Os resultados são exibidos por padrão na vista RESUMO, que agrupa os registros por objeto + ERRO ID + CÓD. ERRO + mensagem, exibindo o total de ocorrências de cada grupo. A vista TODOS exibe todos os registros individuais. Os resultados são paginados em até 1.000 registros com navegação cursor-based.",
                params: [
                    { name: "MOCK", type: "select", required: false, description: "Filtra pelo nome da mock. O dropdown é populado com todas as mocks do projeto selecionado. Ao trocar a mock, o filtro de objeto é resetado automaticamente." },
                    { name: "OBJECT", type: "select", required: false, description: "Filtra pelo nome do objeto dentro da mock selecionada. Disponível apenas quando uma mock estiver selecionada e a mock possuir objetos com logs importados (hasTechLogs = true)." },
                    { name: "Data início", type: "date", required: false, description: "Limite inferior do campo importedAt. Padrão: primeiro dia do mês corrente." },
                    { name: "Data fim", type: "date", required: false, description: "Limite superior do campo importedAt. Padrão: último dia do mês corrente." },
                    { name: "Busca em MESSAGE / INFOKEY", type: "string", required: false, description: "Filtro client-side aplicado sobre os registros já carregados. Pesquisa simultânea nos campos message e infoKey (ou oldKey). Não requer nova consulta ao banco." },
                ],
                steps: [
                    { n: 1, title: "Selecionar projeto", body: "Certifique-se de que um projeto está selecionado no seletor de contexto da sidebar. Sem projectId, nenhum registro será retornado." },
                    { n: 2, title: "Configurar filtros", body: "Escolha a mock e, opcionalmente, o objeto. Ajuste o intervalo de datas se necessário. O filtro de texto livre pode ser preenchido antes ou após a busca." },
                    { n: 3, title: "Buscar", body: "Clique em Buscar. O sistema consulta o banco de dados com os filtros ativos e exibe os primeiros 1.000 registros ordenados por data de importação decrescente." },
                    { n: 4, title: "Vista Resumo (padrão)", body: "Os resultados são agrupados por objeto + ERRO ID + CÓD. ERRO + mensagem. Cada linha exibe o número de ocorrências e a data da última ocorrência. Clique em uma linha para expandir e ver todos os registros individuais do grupo — com data/hora, INFOKEY e filename. Clique novamente para colapsar." },
                    { n: 5, title: "Vista Todos", body: "Clique no botão TODOS no cabeçalho para alternar para a lista completa de registros individuais. Cada linha é clicável e abre o modal de detalhe com ERRO ID, CÓD. ERRO, OBJECT, MOCK, INFOKEY, IMPORTADO EM, FILENAME e MESSAGE completo." },
                    { n: 6, title: "Navegar páginas", body: "Se existirem mais de 1.000 registros, os botões de paginação (‹ ›) ficam habilitados no canto direito. A navegação usa paginação por cursor — voltar a uma página anterior usa o cursor armazenado da primeira consulta daquela página." },
                    { n: 7, title: "Filtrar localmente", body: "Use o campo 'Buscar em MESSAGE / INFOKEY' para refinar os registros já carregados sem nova consulta ao banco." },
                    { n: 8, title: "Limpar filtros", body: "Clique em 'Limpar filtros' para resetar todos os campos e voltar ao estado inicial (sem resultados exibidos)." },
                ],
                warnings: [
                    { level: "info", text: "A mock em execução (isRunning = true) é pré-selecionada automaticamente ao abrir a página, agilizando o acesso ao contexto ativo." },
                    { level: "info", text: "Na vista RESUMO, o agrupamento usa a combinação objeto + ERRO ID + CÓD. ERRO + mensagem como chave. Erros com o mesmo objeto e mensagem mas códigos diferentes aparecem em linhas separadas." },
                    { level: "warn", text: "O limite de 1.000 registros por página é aplicado no servidor. Se o aviso de limite aparecer na parte inferior da tabela, refine os filtros (ex.: reduza o intervalo de datas ou selecione um objeto específico) para visualizar os registros desejados." },
                    { level: "info", text: "O filtro de texto livre (MESSAGE / INFOKEY) opera somente sobre a página atual carregada — não pesquisa além dos 1.000 registros exibidos." },
                    { level: "danger", text: "Consultas sem filtro de objeto em mocks com grande volume de logs podem atingir rapidamente o limite de 1.000 registros. Use filtros combinados para resultados precisos." },
                ],
                seeAlso: ["config-importar-logs", "logs-mural"],
            },
        ],
    },
    {
        id: "utilitarios",
        label: "Utilitários",
        icon: Wrench,
        color: "text-violet-500",
        entries: [
            {
                id: "utilitarios-backup-completo",
                title: "Criar Backup Completo",
                section: "7",
                synopsis: "Exporta todos os dados do sistema para um arquivo comprimido no armazenamento na nuvem.",
                description:
                    "O backup completo percorre recursivamente todas as tabelas e relacionamentos do banco (profundidade máxima de 6 níveis), serializa tipos de data e referência para JSON e armazena o resultado como um arquivo .json.gz no armazenamento na nuvem. Um checksum SHA-256 é calculado sobre os dados brutos e embutido no payload para validação de integridade na restauração. Somente usuários com role Master podem executar esta operação.",
                params: [
                    { name: "Tipo", type: "radio", required: true, description: "Selecione 'Backup Completo' para exportar todo o banco de dados." },
                ],
                steps: [
                    { n: 1, title: "Acessar Utilitários → Backup", body: "Navegue para Utilitários > Backup na sidebar. A tela exibe a lista de backups existentes e o painel de criação." },
                    { n: 2, title: "Selecionar tipo", body: "No painel 'Backup por Mock', selecione o radio 'Backup Completo'." },
                    { n: 3, title: "Criar", body: "Clique em 'Criar Backup Completo'. O processo pode levar alguns minutos dependendo do volume de dados. Aguarde a notificação de sucesso." },
                    { n: 4, title: "Verificar", body: "O novo backup aparece no topo da tabela com nome, data, total de documentos e tamanho comprimido." },
                ],
                warnings: [
                    { level: "warn", text: "O backup completo pode demorar vários minutos em bases com muitos documentos. Não feche a aba durante a operação." },
                    { level: "info", text: "O arquivo gerado inclui metadados (versão, projeto, checksum) armazenados tanto no payload quanto nos metadados customizados do Storage." },
                ],
                seeAlso: ["utilitarios-backup-mock", "utilitarios-restore"],
            },
            {
                id: "utilitarios-backup-mock",
                title: "Criar Backup por Mock",
                section: "7",
                synopsis: "Exporta os dados de um mock específico: documento do mock, objetos de migração e logs.",
                description:
                    "O backup por mock é uma operação cirúrgica que exporta apenas o escopo de um mock: o documento do mock em projects/{projectId}/mocks/{mockId}, todos os migrationObjects e suas subcoleções, e os migrationLogs filtrados por mockId e projectId. É significativamente mais rápido que o backup completo e ideal para snapshots antes de operações destrutivas em um mock específico.",
                params: [
                    { name: "Projeto", type: "select", required: true, description: "Projeto ao qual o mock pertence." },
                    { name: "Mock", type: "select", required: true, description: "Mock a ser exportado. A lista é carregada dinamicamente após a seleção do projeto." },
                ],
                steps: [
                    { n: 1, title: "Acessar Utilitários → Backup", body: "Navegue para Utilitários > Backup na sidebar." },
                    { n: 2, title: "Selecionar tipo", body: "No painel 'Backup por Mock', selecione o radio 'Backup por Mock'." },
                    { n: 3, title: "Selecionar projeto e mock", body: "Escolha o projeto no primeiro seletor. Após o carregamento, selecione o mock desejado." },
                    { n: 4, title: "Criar", body: "Clique em 'Criar Backup do Mock'. O arquivo gerado terá o nome no formato backup-{mockId}-{timestamp}.json.gz." },
                ],
                warnings: [
                    { level: "info", text: "O backup por mock inclui apenas dados do escopo daquele mock — não exporta outros mocks, configurações globais ou dados de usuários." },
                ],
                seeAlso: ["utilitarios-backup-completo", "utilitarios-restore", "utilitarios-limpar-logs"],
            },
            {
                id: "utilitarios-restore",
                title: "Restaurar Backup",
                section: "7",
                synopsis: "Restaura dados do sistema a partir de um backup armazenado na nuvem ou de um arquivo local.",
                description:
                    "A restauração descomprime o arquivo .json.gz, valida o checksum SHA-256, deserializa os tipos do backup e grava os registros em lote (400 registros/lote). Suporta dois modos: Merge (upsert sem apagar registros existentes) e Overwrite (substitui o conteúdo de cada registro). Opcionalmente, é possível purgar tabelas antes da restauração (apaga todos os registros existentes antes de escrever). É possível filtrar quais tabelas raiz serão restauradas. Somente usuários Master podem executar restaurações.",
                params: [
                    { name: "Fonte", type: "radio", required: true, description: "Storage (backup listado na tabela) ou Arquivo Local (upload de .json.gz)." },
                    { name: "Modo", type: "radio", required: true, description: "Merge: upsert sem deletar docs extras. Overwrite: substitui o conteúdo de cada documento existente." },
                    { name: "Coleções", type: "multi-select", required: false, description: "Coleções raiz a restaurar. Vazio = todas as coleções do backup." },
                    { name: "Limpar antes", type: "checkbox", required: false, description: "Apaga todos os documentos das coleções alvo antes de escrever. Irreversível." },
                ],
                steps: [
                    { n: 1, title: "Localizar o backup", body: "Na tabela de backups, clique no ícone de restauração (↺) ao lado do arquivo desejado. Para arquivo local, use a seção 'Restaurar arquivo local' no rodapé da tela." },
                    { n: 2, title: "Configurar modo", body: "Selecione Merge ou Overwrite. Em caso de dúvida, prefira Merge — é mais seguro pois não apaga documentos não presentes no backup." },
                    { n: 3, title: "Filtrar coleções (opcional)", body: "Marque apenas as coleções raiz que deseja restaurar. Útil para restaurar parcialmente (ex: somente migrationLogs)." },
                    { n: 4, title: "Limpar antes (opcional)", body: "Marque 'Limpar coleções antes de restaurar' apenas se quiser uma restauração completa e destrutiva." },
                    { n: 5, title: "Confirmar", body: "Clique em 'Confirmar Restauração'. Aguarde a conclusão. Um resumo com total de documentos restaurados e eventuais erros será exibido." },
                ],
                warnings: [
                    { level: "danger", text: "A opção 'Limpar antes de restaurar' apaga permanentemente todos os documentos existentes nas coleções selecionadas antes de escrever. Esta ação não pode ser desfeita." },
                    { level: "warn", text: "A restauração valida o checksum SHA-256 do payload. Se o arquivo estiver corrompido ou adulterado, a operação será recusada." },
                    { level: "info", text: "Arquivos enviados via upload local são salvos automaticamente em Storage/uploads/ como trilha de auditoria." },
                ],
                seeAlso: ["utilitarios-backup-completo", "utilitarios-backup-mock"],
            },
            {
                id: "utilitarios-limpar-logs",
                title: "Limpar Logs de Mock",
                section: "7",
                synopsis: "Remove permanentemente todos os logs de migração de um mock específico.",
                description:
                    "Esta operação exclui todos os documentos da coleção migrationLogs filtrados pelo mockId e projectId informados. A deleção é feita em batches de 400 documentos para garantir eficiência em grandes volumes. A operação exige confirmação explícita: o usuário deve digitar o ID do mock para prosseguir. Somente usuários Master podem executar esta operação.",
                params: [
                    { name: "Projeto", type: "select", required: true, description: "Projeto ao qual o mock pertence." },
                    { name: "Mock", type: "select", required: true, description: "Mock cujos logs serão removidos." },
                    { name: "Confirmação", type: "text", required: true, description: "Digite o ID exato do mock para habilitar o botão de execução." },
                ],
                steps: [
                    { n: 1, title: "Acessar Utilitários → Limpar Logs", body: "Navegue para Utilitários > Limpar Logs na sidebar." },
                    { n: 2, title: "Selecionar projeto", body: "Escolha o projeto no seletor. Os mocks disponíveis serão carregados automaticamente." },
                    { n: 3, title: "Selecionar mock", body: "Escolha o mock cujos logs serão removidos. O ID é exibido no campo abaixo para referência." },
                    { n: 4, title: "Confirmar", body: "Digite o ID exato do mock no campo de confirmação. O botão 'Limpar Logs' só é habilitado quando a digitação coincide." },
                    { n: 5, title: "Executar", body: "Clique em 'Limpar Logs'. O sistema exibirá a quantidade de logs deletados ao concluir." },
                ],
                warnings: [
                    { level: "danger", text: "Esta operação é irreversível. Os logs deletados não podem ser recuperados. Considere criar um backup por mock antes de limpar os logs." },
                    { level: "info", text: "Limpar logs não afeta os KPIs de performance nem os documentos dos objetos — apenas os registros de execução (migrationLogs) são removidos." },
                ],
                seeAlso: ["utilitarios-backup-mock", "logs-consulta"],
            },
        ],
    },
];
