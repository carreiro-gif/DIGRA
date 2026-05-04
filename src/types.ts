import { ProductionInput, BudgetHistoryEntry, TechnicalSummary } from "./types/SmartBudgetTypes";

export interface PapelBase {
  nome: string;
  a4: number;
  a3: number;
  folha: number;
  pacote: number;
  folhasPacote: number | null;
}

export interface MaterialTipo {
  nome: string;
  valor: number;
}

export interface MaterialBase {
  nome: string;
  tipos: MaterialTipo[];
}

export interface ImpressaoBase {
  tipo: string;
  formato: string;
  valor: number;
}

export interface MaoObraBase {
  profissional: string;
  hora: number;
}

export interface MaquinaDigitalBase {
  maquina: string;
  a4Minuto: number;
  a4FvMinuto: number;
  a3Minuto: number;
  a3FvMinuto: number;
  operador: string;
}

export interface MaquinaOffsetBase {
  maquina: string;
  producaoHora: number;
  coresRodada: number;
}

export interface CorteGuilhotinaBase {
  tipoProduto: string;
  tempoMin: number;
  tempoMax: number;
}

export interface ParametroProducaoBase {
  chave: string;
  valor: number;
  unidade: string;
}

export interface TempoAcabamentoBase {
  processo: string;
  velocidade: number;
  unidade: string;
}

export interface BaseData {
  papeis: PapelBase[];
  materiais: MaterialBase[];
  impressoes: ImpressaoBase[];
  maoObra: MaoObraBase[];
  maquinasDigitais: MaquinaDigitalBase[];
  maquinasOffset: MaquinaOffsetBase[];
  corteGuilhotina: CorteGuilhotinaBase[];
  parametrosProducao: ParametroProducaoBase[];
  temposAcabamento: TempoAcabamentoBase[];
}

// --- Item Instances ---

export interface ItemPapel {
  id: string;
  papelIndex: number | "";
  tamanho: "A4" | "A3" | "Folha" | "Pacote" | "";
  qtd: number;
  unit: number;
}

export interface ItemMaterial {
  id: string;
  materialIndex: number | "";
  tipoIndex: number | "";
  qtd: number;
  unit: number;
}

export interface ItemImpressao {
  id: string;
  tipo: string;
  formato: string;
  qtd: number;
  unit: number;
}

export interface ItemMaoObra {
  id: string;
  profIndex: number | "";
  minutos: number;
  minutoValor: number;
}

export interface AppInfo {
  qtTotal: number;
  tamanhoFinal: string;
  tec: 'OFFSET' | 'DIGITAL';
  descricao: string;
  dadosTecnicos: string;
  materialReferencia: string;
}

export interface AppState {
  info: AppInfo;
  itens: {
    papeis: ItemPapel[];
    materiais: ItemMaterial[];
    impressoes: ItemImpressao[];
    maoObra: ItemMaoObra[];
  };
  imagens: { url: string; label?: string }[]; 
  base: BaseData;
  producaoTecnica?: TechnicalSummary;
  technicalForm?: ProductionInput;
  historico_orcamentos: BudgetHistoryEntry[];
}
