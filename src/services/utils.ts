import { AppState } from "../types";

export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number) {
  if (valor === null || valor === undefined || isNaN(valor) || !isFinite(valor)) return "R$ 0,00";
  if (valor > 10000000) return "Valor inválido – verificar cálculo";

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarNumero(valor: number, decimals: number = 2) {
  if (valor === null || valor === undefined || isNaN(valor) || !isFinite(valor)) return "0,00";
  if (valor > 10000000) return "Valor inválido – verificar cálculo";

  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function validateNumberInput(value: string, max: number = 10000000): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  if (parsed > max) return max;
  if (parsed < 0) return 0;
  return parsed;
}

export const formatCurrency = (value: number) => formatarMoeda(value);

export const calculateTotals = (state: AppState) => {
  const totalPapeis = state.itens.papeis.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const totalMateriais = state.itens.materiais.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const totalImpressoes = state.itens.impressoes.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const totalMaoObra = state.itens.maoObra.reduce((acc, item) => acc + (item.minutos * item.minutoValor), 0);

  const subtotal = totalPapeis + totalMateriais + totalImpressoes + totalMaoObra;
  
  // 10% Markup for OFFSET - Applied specifically to total impressions
  const acrescimo = state.info.tec === 'OFFSET' ? totalImpressoes * 0.10 : 0;
  
  const totalGeral = subtotal + acrescimo;
  
  const qtTotal = Math.max(1, state.info.qtTotal || 1);
  const valorUnitario = totalGeral / qtTotal;

  return {
    totalPapeis,
    totalMateriais,
    totalImpressoes,
    totalMaoObra,
    acrescimo,
    totalGeral,
    valorUnitario
  };
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
