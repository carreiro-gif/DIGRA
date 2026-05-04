export interface ProductionPaper {
  nome: string;
  gramatura: number;
  compraEm: 'Folha' | 'Pacote';
  descricao?: string; // ex: "Capa", "Miolo"
}

export type ColorOption = '1/0' | '1/1' | '4/0' | '4/1' | '4/4';

export interface MixedColorLine {
  tipo: ColorOption;
  paginas: number;
}

export interface ProductionInput {
  produto: string;
  quantidade: number;
  tamanhoFinal: string;
  frenteVerso: boolean;
  cores: ColorOption;
  modoImpressao: 'SIMPLES' | 'MISTO';
  coresMistas: MixedColorLine[];
  tipoImpressao: 'DIGITAL' | 'OFFSET';
  maquina: string;
  papeis: ProductionPaper[];
  paginas?: number; // Necessário para Alceamento
  materiais: {
    laserFilme: boolean;
    laserFilmeQtd?: number;
    espiral: boolean;
    espiralFolhasUnidade?: number;
    capaEncadernacao: boolean;
    fitaDuplaFace: boolean;
    bobinaPolietileno: boolean;
    adesivoVinil: boolean;
    bolsaPasta: boolean;
  };
  acabamentos: {
    plastificacao: boolean;
    espiral: boolean;
    grampo: boolean;
    dobra: boolean;
    alceamento: boolean; // Encadernação de Cartilha
    colagemCapa: boolean; // Colagem de Capa (Livro)
    vinco: boolean; // Vinco (Capa ou Folder)
  };
  observacoes?: string;
}

export interface CalculatedComponent {
  nome: string;
  papelSugerido: string;
  gramatura: number;
  unidadesPorFolha: number;
  totalFolhas: number;
  formatoFolha: string;
  totalImpressoes: number;
  folhas66x96Necessarias: number;
}

export interface TechnicalSummary {
  tipoProducao: 'DIGITAL' | 'OFFSET';
  maquina: string;
  velocidadeAplicada: string;
  quantidadeProduzida: number;
  passadas: number;
  chapas: number;
  tempoImpressaoMin: number;
  tempoOperadoresMin: number;
  tempoTotalMin: number;
  detalhesCorte?: string;
  temposAcabamento?: { [key: string]: number };
  producaoEngine?: ProductionEngineOutput;
  historicalInfo?: {
    original: number;
    average: number;
    suggested: number;
  };
}

export interface CalculatedMaterial {
  nome: string;
  tipo: string;
  quantidade: number;
  unidade: string;
}

export interface CalculatedProduction {
  input: ProductionInput;
  componentes: CalculatedComponent[];
  chapas: number;
  passadas: number;
  tempoImpressaoMin: number;
  tempoGuilhotinaMin: number;
  tempoDesignerMin: number;
  tempoOrcamentistaMin: number;
  tempoImpressorMin: number;
  // Tempos de Acabamento Detalhados
  temposAcabamento: {
    plastificacao: number;
    espiral: number;
    grampo: number;
    dobra: number;
    alceamento: number;
    colagemCapa: number;
    vinco: number;
  };
  materiais: CalculatedMaterial[];
  acrescimoOffset: number;
  resumoTecnico: TechnicalSummary;
  producaoEngine?: ProductionEngineOutput;
}

export interface ProductionEngineOutput {
  tempo_preparacao: number;
  tempo_impressao: number;
  tempo_corte: number;
  tempo_acabamento: number;
  tempo_total: number;
  custo_preparacao: number;
  custo_impressao: number;
  custo_corte: number;
  custo_acabamento: number;
  custo_total: number;
  custo_unitario: number;
}

export interface BudgetHistoryEntry {
  id: string;
  data: string;
  produto: string;
  quantidade: number;
  tipo_impressao: 'DIGITAL' | 'OFFSET';
  maquina: string;
  acabamentos: string[]; // List of active finishes
  tempo_preparacao: number;
  tempo_impressao: number;
  tempo_corte: number;
  tempo_acabamento: number;
  tempo_total: number;
  custo_total: number;
  custo_unitario: number;
}

export interface SavedBudget {
  id?: string;
  numeroOrcamento: string;
  cliente: string;
  produto: string;
  quantidade: number;
  valor: number;
  data: string; // ISO string
  mes: number;
  ano: number;
  pdfURL: string;
  createdAt: any; // Firestore Timestamp
}
