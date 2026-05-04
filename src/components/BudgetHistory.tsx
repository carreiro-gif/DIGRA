import React, { useState, useEffect } from 'react';
import { BudgetHistoryService } from '../services/BudgetHistoryService';
import { SavedBudget } from '../types/SmartBudgetTypes';
import { format } from 'date-fns';
import { Search, FileText, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { formatarMoeda } from '../services/utils';

interface BudgetHistoryProps {
  onBack: () => void;
}

export const BudgetHistory: React.FC<BudgetHistoryProps> = ({ onBack }) => {
  const [history, setHistory] = useState<SavedBudget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (search?: string) => {
    setLoading(true);
    try {
      const results = await BudgetHistoryService.getHistory(search);
      setHistory(results);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchHistory(term);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Histórico de Orçamentos</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Gerencie e visualize orçamentos salvos anteriormente</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar por cliente, produto ou número..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando histórico...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="p-6 bg-slate-50 rounded-full mb-4">
            <FileText className="w-12 h-12 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum orçamento encontrado</p>
          <button 
            onClick={onBack}
            className="mt-6 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline"
          >
            Voltar para o Início
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Número</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Produto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Valor</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((budget) => (
                  <tr key={budget.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5 font-mono text-xs text-slate-500 font-bold">{budget.numeroOrcamento}</td>
                    <td className="px-8 py-5 font-black text-slate-800 tracking-tight">{budget.cliente}</td>
                    <td className="px-8 py-5 text-slate-600 font-medium">{budget.produto}</td>
                    <td className="px-8 py-5">
                      <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                        {formatarMoeda(budget.valor)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 text-xs font-bold">
                      {format(new Date(budget.data), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <a 
                        href={budget.pdfURL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        VER PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
