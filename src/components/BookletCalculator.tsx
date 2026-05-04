import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Book, Info, Printer, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { BaseData } from '../types';

interface BookletCalculatorProps {
  base: BaseData;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (data: any) => void;
}

export const BookletCalculator: React.FC<BookletCalculatorProps> = ({ base, isOpen, onClose, onApply }) => {
  const [calcForm, setCalcForm] = useState({
    quantidade: 100,
    tamanho: 'A5',
    tamanhoImpressao: 'A4' as 'A4' | 'A3',
    paginas: 16,
    papelMiolo: base.papeis.find(p => p.nome.includes('Offset 75g'))?.nome || base.papeis[0]?.nome || '',
    papelCapa: base.papeis.find(p => p.nome.includes('Cartolina Branca - 180g'))?.nome || base.papeis[0]?.nome || '',
    tipoMiolo: 'DIGITAL' as 'DIGITAL' | 'OFFSET',
    tipoCapa: 'DIGITAL' as 'DIGITAL' | 'OFFSET',
    exibirEsquemaOrcamento: false
  });

  const [result, setResult] = useState<any>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const calculate = () => {
    let adjustedPages = calcForm.paginas;
    setWarning(null);

    if (adjustedPages % 4 !== 0) {
      adjustedPages = Math.ceil(adjustedPages / 4) * 4;
      setWarning("Páginas ajustadas automaticamente para fechamento do caderno");
    }

    // LÓGICA DE IMPOSIÇÃO PROFISSIONAL
    // Identificar páginas por folha (frente + verso)
    let pagesPerSheet = 4;
    let itemsPerSheetCapa = 1;

    if (calcForm.tamanho === 'A5') {
      if (calcForm.tamanhoImpressao === 'A4') {
        pagesPerSheet = 4;
        itemsPerSheetCapa = 1;
      } else {
        pagesPerSheet = 8;
        itemsPerSheetCapa = 2;
      }
    } else if (calcForm.tamanho === 'A4') {
      if (calcForm.tamanhoImpressao === 'A4') {
        pagesPerSheet = 1; // Not a booklet in the same sense if 1 per A4, but let's keep logic
        itemsPerSheetCapa = 1;
      } else {
        pagesPerSheet = 2;
        itemsPerSheetCapa = 2;
      }
    }

    // CÁLCULO DO MIOLO
    const mioloSheets = Math.ceil(((adjustedPages / pagesPerSheet) * calcForm.quantidade) / 2);
    const mioloImpressions = mioloSheets * 2;

    // CÁLCULO DA CAPA
    const capaSheets = Math.ceil(calcForm.quantidade / itemsPerSheetCapa);
    const capaImpressions = capaSheets * 2;

    // GERAÇÃO DA BONECA REAL
    const cadernos = [];
    const totalPaginas = adjustedPages;
    const sum = totalPaginas + 1;

    if (calcForm.tamanhoImpressao === 'A4') {
      // Cada folha A4 = 4 páginas A5 (Frente/Verso)
      const numCadernos = totalPaginas / 4;
      for (let i = 0; i < numCadernos; i++) {
        const p_start = (i * 2) + 1;
        const p_end = totalPaginas - (i * 2);
        
        cadernos.push({
          id: i + 1,
          frente: [p_end, p_start],
          verso: [p_start + 1, p_end - 1]
        });
      }
    } else {
      // Cada folha A3 = 8 páginas A5 (Frente/Verso)
      const numFolhasA3 = Math.ceil(totalPaginas / 8);
      for (let i = 0; i < numFolhasA3; i++) {
        const base_p = (i * 4);
        
        const getP = (p: number) => {
          if (p <= 0 || p > totalPaginas) return '-';
          // Logic check: in saddle stitch, we go from outside in.
          // If we are past the middle, we stop.
          // But for A3, we are just filling slots.
          return p;
        };

        // A3 has 2 spreads per side
        // Spread 1: [total - base, base + 1]
        // Spread 2: [total - base - 2, base + 3]
        
        const f1 = totalPaginas - base_p;
        const f2 = base_p + 1;
        const f3 = totalPaginas - base_p - 2;
        const f4 = base_p + 3;

        const v1 = base_p + 2;
        const v2 = totalPaginas - base_p - 1;
        const v3 = base_p + 4;
        const v4 = totalPaginas - base_p - 3;

        // Only add if the first page of the spread is valid and not already used
        // In saddle stitch, we stop when we reach the middle.
        if (f2 <= totalPaginas / 2) {
          cadernos.push({
            id: i + 1,
            frente: [getP(f1), getP(f2), getP(f3), getP(f4)].filter(v => v !== '-'),
            verso: [getP(v1), getP(v2), getP(v3), getP(v4)].filter(v => v !== '-')
          });
        }
      }
    }

    setResult({
      tamanhoImpressao: calcForm.tamanhoImpressao,
      pagesPerSheet,
      adjustedPages,
      cadernos,
      miolo: {
        folhas: mioloSheets,
        impressoes: mioloImpressions,
        papel: calcForm.papelMiolo,
        tipo: calcForm.tipoMiolo
      },
      capa: {
        folhas: capaSheets,
        impressoes: capaImpressions,
        papel: calcForm.papelCapa,
        tipo: calcForm.tipoCapa
      }
    });
  };

  const handleUseInBudget = () => {
    if (!result || !onApply) return;
    
    onApply({
      calcForm,
      result
    });
    onClose();
  };

  // Boneca logic (Optional)
  const boneca = useMemo(() => {
    if (!calcForm.paginas || calcForm.paginas % 4 !== 0) return [];
    const pages = [];
    for (let i = 1; i <= calcForm.paginas; i += 4) {
      // Each sheet (folded) has 4 pages
      // Sheet 1: Front (P1, Plast), Back (P2, Plast-1)
      // This is a simplified version of imposition
      const sheetNum = Math.ceil(i / 4);
      const p1 = i;
      const p2 = i + 1;
      const p3 = i + 2;
      const p4 = i + 3;
      
      // In a real booklet (saddle stitch):
      // Sheet 1 (outermost): P_last, P1 (Front) | P2, P_last-1 (Back)
      // Sheet 2: P_last-2, P3 (Front) | P4, P_last-3 (Back)
      
      const last = calcForm.paginas - (i - 1);
      pages.push({
        folha: sheetNum,
        frente: [last, i],
        verso: [i + 1, last - 1]
      });
    }
    return pages;
  }, [calcForm.paginas]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full overflow-hidden border border-white/20 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-[#0f172a] bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Book className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Calculadora de Cartilhas</h3>
                <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Imposição Gráfica Profissional</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inputs */}
              <div className="space-y-6">
                {/* Tamanho de Impressão */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Printer className="w-3 h-3" /> Tamanho de Impressão
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['A4', 'A3'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setCalcForm({ ...calcForm, tamanhoImpressao: size as 'A4' | 'A3' })}
                        className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                          calcForm.tamanhoImpressao === size
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Quantidade</label>
                    <input 
                      type="number" 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      value={calcForm.quantidade}
                      onChange={e => setCalcForm({...calcForm, quantidade: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Páginas</label>
                    <input 
                      type="number" 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      value={calcForm.paginas}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setCalcForm({...calcForm, paginas: val});
                      }}
                    />
                    {warning && (
                      <p className="text-[9px] text-amber-600 font-bold uppercase animate-pulse">{warning}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tamanho Final</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={calcForm.tamanho}
                    onChange={e => setCalcForm({...calcForm, tamanho: e.target.value})}
                  >
                    <option value="A5">A5 (14,8 x 21 cm)</option>
                    <option value="A4">A4 (21 x 29,7 cm)</option>
                    <option value="A6">A6 (10,5 x 14,8 cm)</option>
                  </select>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Configuração do Miolo
                  </h4>
                  <div className="space-y-3">
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs font-bold"
                      value={calcForm.papelMiolo}
                      onChange={e => setCalcForm({...calcForm, papelMiolo: e.target.value})}
                    >
                      {base.papeis.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {['DIGITAL', 'OFFSET'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setCalcForm({...calcForm, tipoMiolo: t as any})}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${calcForm.tipoMiolo === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Configuração da Capa
                  </h4>
                  <div className="space-y-3">
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs font-bold"
                      value={calcForm.papelCapa}
                      onChange={e => setCalcForm({...calcForm, papelCapa: e.target.value})}
                    >
                      {base.papeis.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {['DIGITAL', 'OFFSET'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setCalcForm({...calcForm, tipoCapa: t as any})}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${calcForm.tipoCapa === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <input 
                    type="checkbox" 
                    id="exibirEsquema"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={calcForm.exibirEsquemaOrcamento}
                    onChange={e => setCalcForm({...calcForm, exibirEsquemaOrcamento: e.target.checked})}
                  />
                  <label htmlFor="exibirEsquema" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">
                    Exibir esquema de cadernos no orçamento
                  </label>
                </div>

                <button 
                  onClick={calculate}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Calculator className="w-5 h-5" /> Calcular Produção
                </button>
              </div>

              {/* Results */}
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> Resultado da Produção
                          </h4>
                          <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Formato: {result.tamanhoImpressao}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Miolo ({result.miolo.tipo})</span>
                              <span className="text-[9px] font-bold text-blue-400">{result.miolo.papel}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <span className="block text-2xl font-black text-blue-900 leading-none">{result.miolo.folhas}</span>
                                <span className="text-[8px] font-black text-blue-400 uppercase">Folhas Necessárias</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-2xl font-black text-blue-900 leading-none">{result.miolo.impressoes}</span>
                                <span className="text-[8px] font-black text-blue-400 uppercase">Impressões (F/V)</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Capa ({result.capa.tipo})</span>
                              <span className="text-[9px] font-bold text-emerald-400">{result.capa.papel}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <span className="block text-2xl font-black text-emerald-900 leading-none">{result.capa.folhas}</span>
                                <span className="text-[8px] font-black text-emerald-400 uppercase">Folhas Necessárias</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-2xl font-black text-emerald-900 leading-none">{result.capa.impressoes}</span>
                                <span className="text-[8px] font-black text-emerald-400 uppercase">Impressões (F/V)</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handleUseInBudget}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" /> Usar no Orçamento
                        </button>
                      </div>

                      {/* Boneca Visual */}
                      <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Esquema de Montagem (Boneca)
                          </h4>
                          <span className="text-[9px] font-black text-blue-600 uppercase">
                            Total: {result.cadernos.length} Cadernos
                          </span>
                        </div>

                        {/* Capa Separada */}
                        <div className="space-y-3">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                            Capa (Impressão Separada)
                          </h5>
                          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col items-center gap-2">
                            <span className="text-[8px] font-black uppercase text-slate-500">Contra Capa | Capa</span>
                            <div className="flex items-center gap-4 w-full">
                              <div className="flex-1 h-16 border border-white/20 rounded flex items-center justify-center font-black text-lg">
                                {result.adjustedPages}
                              </div>
                              <div className="w-px h-12 bg-white/10" />
                              <div className="flex-1 h-16 border border-white/20 rounded flex items-center justify-center font-black text-lg">
                                1
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Miolo - Cadernos */}
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {result.cadernos.map((caderno: any) => (
                            <div key={caderno.id} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-800 uppercase">Caderno {caderno.id}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">[ FOLHA DOBRADA ]</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[8px] font-black text-blue-600 uppercase block text-center">Frente</span>
                                  <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    {caderno.frente.map((p: number, idx: number) => (
                                      <div key={idx} className={`flex-1 py-3 text-center font-black text-sm ${idx === 0 ? 'border-r border-slate-100' : ''}`}>
                                        {p}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[8px] font-black text-emerald-600 uppercase block text-center">Verso</span>
                                  <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    {caderno.verso.map((p: number, idx: number) => (
                                      <div key={idx} className={`flex-1 py-3 text-center font-black text-sm ${idx === 0 ? 'border-r border-slate-100' : ''}`}>
                                        {p}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <p className="text-[8px] text-slate-400 font-bold text-center uppercase tracking-widest">
                          Representação técnica para imposição gráfica {result.tamanhoImpressao}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4 opacity-40">
                      <div className="p-6 bg-slate-100 rounded-full">
                        <Calculator className="w-12 h-12 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Aguardando cálculo...</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
