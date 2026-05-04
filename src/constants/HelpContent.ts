export const HELP_CONTENT = {
  OVERVIEW: {
    title: "Visão Geral do Sistema",
    content: "O Sistema DIGRA é uma ferramenta inteligente para orçamentos gráficos, integrando inteligência artificial e análise de PDF para agilizar o processo comercial."
  },
  MANUAL: {
    title: "Manual do Sistema",
    content: "Acesse o manual completo para entender todas as funcionalidades, regras de cálculo e melhores práticas de uso do sistema."
  },
  ASSISTENTE: {
    title: "Assistente Inteligente",
    content: "Descreva o trabalho em linguagem natural (ex: '1000 cartões de visita couchê 300g'). O assistente interpreta seu pedido e sugere o preenchimento dos campos. Lembre-se: ele não altera valores base e você deve sempre revisar os dados antes de aplicar."
  },
  PDF_ANALYZER: {
    title: "Analisador Universal de PDF",
    content: "Arraste ou importe um PDF para análise automática. O sistema detecta tamanho, páginas, cores e estrutura. Você pode editar todos os dados antes de aplicar ao orçamento. O PDF serve como base técnica, não como verdade absoluta."
  },
  INFORMACOES_INICIAIS: {
    title: "Informações Iniciais",
    content: "Defina o tipo de material, a quantidade desejada e a base de preços que será utilizada para o cálculo."
  },
  IMAGENS_PROJETO: {
    title: "Imagens e Referências",
    content: "Faça upload de imagens ou arquivos PDF para referência. A primeira página do PDF importado torna-se automaticamente uma prévia visual para conferência."
  },
  PAPEIS: {
    title: "Papéis Utilizados",
    content: "Selecione o papel correto da base de dados. A escolha do papel impacta diretamente no custo final. Você pode ajustar gramaturas e tipos conforme a necessidade."
  },
  MATERIAIS: {
    title: "Materiais Adicionais",
    content: "Adicione materiais extras necessários para a produção, como cola, laminação, espirais ou embalagens específicas."
  },
  IMPRESSAO_DIGITAL: {
    title: "Impressão Digital",
    content: "Preencha este bloco apenas se o trabalho for executado em máquinas digitais. O sistema calcula automaticamente o custo por clique ou folha. NÃO preencha para processos em Offset."
  },
  MAO_OBRA: {
    title: "Mão de Obra",
    content: "Defina o tempo estimado para cada etapa da produção. O custo é calculado com base no valor/hora configurado no sistema."
  },
  MAQUINAS: {
    title: "Máquinas e Equipamentos",
    content: "Selecione os equipamentos que serão utilizados no processo produtivo. Isso impacta no custo fixo e variável de produção."
  },
  FICHA_TECNICA: {
    title: "Ficha Técnica",
    content: "Resumo técnico consolidado do material. Utilize para conferência final de todas as especificações antes de gerar o orçamento."
  },
  PLANEJAMENTO: {
    title: "Planejamento de Produção",
    content: "Organização lógica das etapas de produção e sequência de execução do trabalho."
  },
  VALORES_BASE: {
    title: "Valores Base",
    content: "Estes são os custos oficiais do sistema (papéis, máquinas, cliques). Eles servem de base para TODOS os cálculos e não devem ser alterados sem critério técnico."
  },
  HISTORICO: {
    title: "Histórico de Orçamentos",
    content: "Lista de todos os orçamentos realizados. Você pode visualizar, imprimir ou reutilizar informações de pedidos anteriores."
  },
  NOVO_ORCAMENTO: {
    title: "Novo Orçamento",
    content: "Inicia um novo processo de cálculo do zero. Limpa os campos atuais para uma nova entrada de dados."
  },
  IMPRIMIR: {
    title: "Gerar PDF / Imprimir",
    content: "Gera o documento final do orçamento com resumo de custos, especificações técnicas e imagens de referência."
  },
  RESUMO_FINANCEIRO: {
    title: "Resumo Financeiro",
    content: "Consolidado de todos os custos do projeto, incluindo papéis, materiais, impressão e mão de obra, com o cálculo do valor unitário final."
  },
  ACABAMENTOS: {
    title: "Acabamentos & Materiais",
    content: "Selecione os processos de acabamento (dobra, grampo, etc.) e materiais complementares necessários para finalizar o produto gráfico."
  }
};

export const MANUAL_SECTIONS = [
  {
    id: 'visao-geral',
    title: 'Visão Geral',
    content: `O sistema foi desenvolvido para o cálculo preciso de **custos técnicos de produção**, não incluindo margens de lucro automáticas. É uma ferramenta de uso interno baseada em valores técnicos reais da gráfica.`
  },
  {
    id: 'como-usar',
    title: 'Como Usar',
    content: `1. **Criação**: Inicie um novo orçamento ou use o assistente inteligente.\n2. **Revisão**: Confira cada bloco técnico (papéis, impressão, acabamento).\n3. **Exportação**: Gere o PDF para conferência ou envio.`
  },
  {
    id: 'assistente',
    title: 'Assistente Inteligente',
    content: `Interpreta descrições em texto e preenche os campos automaticamente. Sempre revise as sugestões do assistente antes de prosseguir.`
  },
  {
    id: 'analisador-pdf',
    title: 'Analisador de PDF',
    content: `Extrai metadados técnicos diretamente do arquivo original. Detecta dimensões reais, número de páginas e sugestão de cores.`
  },
  {
    id: 'cartilhas',
    title: 'Cartilhas e Revistas',
    content: `Fluxo especial que separa Capa e Miolo. O sistema calcula automaticamente a imposição de páginas e o número de chapas necessárias para Offset.`
  },
  {
    id: 'regras',
    title: 'Regras do Sistema',
    content: `• O sistema utiliza estritamente os **Valores Base** configurados.\n• O usuário tem total liberdade para ajustar dados técnicos.\n• O cálculo final representa o **Custo de Produção**.`
  },
  {
    id: 'faq',
    title: 'FAQ - Perguntas Frequentes',
    content: `**O valor está diferente?** Verifique se o papel e a máquina selecionados estão corretos na base.\n**PDF analisado errado?** O analisador lê metadados; se o arquivo foi exportado incorretamente, ajuste os dados manualmente no formulário de revisão.\n**Impressão Digital vs Offset?** O sistema sugere o melhor processo baseado na quantidade, mas a decisão final é do operador.`
  },
  {
    id: 'boas-praticas',
    title: 'Boas Práticas',
    content: `• Sempre revise o tamanho final (LxA).\n• Valide a gramatura do papel com o estoque.\n• Confira as imagens de referência antes de imprimir o orçamento.`
  }
];
