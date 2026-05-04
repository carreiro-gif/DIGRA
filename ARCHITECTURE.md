# Proposta de Arquitetura: Sistema de Orçamento Gráfico Inteligente

## 1. Visão Geral
O objetivo é adicionar uma camada de inteligência e automação ao sistema existente sem alterar sua lógica core de precificação e estado. A nova arquitetura funcionará como um "adaptador" que traduz entradas desestruturadas (texto, arquivos) para o formato estruturado que o sistema já utiliza.

## 2. Estrutura de Camadas

### Camada 1: Interpretação (`src/services/interpreter/`)
Responsável por extrair dados de diferentes fontes.
- **`BudgetInterpreter.ts`**: Interface principal.
- **`TextParser.ts`**: Extrai dados de texto livre (RegEx / NLP básico / LLM).
- **`FileParser.ts`**: Processa arquivos (PDF/Imagens) para texto.

### Camada 2: Normalização e Regras (`src/services/rules/`)
Responsável por padronizar os dados e aplicar regras de negócio.
- **`Normalizer.ts`**: Converte termos variados (ex: "4x0", "frente", "só frente") para termos do sistema.
- **`BusinessRules.ts`**: Decide tecnologia (Offset vs Digital) baseada na tiragem.

### Camada 3: Mapeamento (`src/services/mapper/`)
Responsável por conectar a intenção do usuário com a base de dados existente.
- **`BaseMapper.ts`**: Busca na `state.base` os itens que correspondem aos dados normalizados.
  - Exemplo: Entrada "Couchê 150g" -> Busca ID do papel correspondente na base.

### Camada 4: Integração (UI)
- **`SmartBudgetInput.tsx`**: Novo componente para entrada de dados (Upload/Texto).
- **`BudgetPreview.tsx`**: Modal para validar a interpretação antes de aplicar ao estado.

## 3. Fluxo de Dados

1. **Entrada**: Usuário faz upload de PDF ou cola texto no `SmartBudgetInput`.
2. **Interpretação**: `BudgetInterpreter` extrai: `{ qtd: 1000, papel: "couchê 115", formato: "A4" }`.
3. **Regras**: `BusinessRules` detecta `qtd > 500` -> Sugere "Offset".
4. **Mapeamento**: `BaseMapper` varre `state.base.papeis` e encontra "Papel Couchê 115g - ID: 12".
5. **Confirmação**: Sistema exibe "Detectamos Papel Couchê 115g. Confirma?".
6. **Aplicação**: Ao confirmar, sistema chama `addItem()` do `AppState` existente.
7. **Cálculo**: O sistema original recalcula totais automaticamente (reatividade existente).

## 4. Estratégia de Implementação Incremental

### Fase 1: Estrutura e Texto (Atual)
- Criar interfaces de tipos (`SmartBudgetTypes.ts`).
- Implementar parser de texto básico (RegEx para quantidades e formatos padrão).
- Implementar mapeador simples para Papéis e Formatos.

### Fase 2: Integração com Base
- Conectar o mapeador ao `AppState` real.
- Criar UI de importação.

### Fase 3: Arquivos e IA
- Adicionar leitura de PDF (pdf.js).
- Integrar Gemini API para interpretação semântica de descrições complexas.

## 5. Garantia de Integridade
- **Fonte da Verdade**: A `state.base` continua sendo a única fonte de preços. O sistema inteligente apenas *seleciona* itens existentes, nunca cria preços novos.
- **Validação Humana**: Sempre haverá uma etapa de confirmação antes de preencher o orçamento.

---

## Próximos Passos
Para prosseguir com a implementação da **Fase 1**, preciso que você forneça os arquivos atuais do seu sistema, especificamente:
1. Definições de Tipos (`types.ts` ou similar).
2. O arquivo principal de estado/store (`store.ts`, `context.tsx` ou onde reside o `AppState`).
3. Um exemplo de como os itens são adicionados hoje (ex: função `addItem` ou reducer).
