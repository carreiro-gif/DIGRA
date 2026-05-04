import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Calculator, Edit2, Check, X } from 'lucide-react';
import { formatarMoeda } from '../services/utils';

interface PlacaPadrao {
  id: string;
  nome: string;
  width: number;
  height: number;
  qty: number;
}

interface PlacasPadraoModuleProps {
  pricePerM2: number;
  title?: string;
  customCalculate?: (w: number, h: number) => number;
}

const TAMANHOS_PADRAO = [
  { nome: '20x20 cm', width: 20, height: 20 },
  { nome: '20x35 cm', width: 20, height: 35 },
  { nome: '21x13 cm', width: 21, height: 13 },
  { nome: '21x38 cm', width: 21, height: 38 },
  { nome: '21x29,7 cm (A4)', width: 21, height: 29.7 },
  { nome: '29,7x42 cm (A3)', width: 29.7, height: 42 },
];

export const PlacasPadraoModule: React.FC<PlacasPadraoModuleProps> = ({ pricePerM2, title = "Placas Padrão Mais Utilizadas", customCalculate }) => {
  const [placas, setPlacas] = useState<PlacaPadrao[]>(
    TAMANHOS_PADRAO.map((p, i) => ({ ...p, id: `std-${i}`, qty: 1 }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');

  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');

  const updateQty = (id: string, qty: number) => {
    setPlacas(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, qty) } : p));
  };

  const startEditing = (placa: PlacaPadrao) => {
    setEditingId(placa.id);
    setEditWidth(placa.width.toString());
    setEditHeight(placa.height.toString());
  };

  const saveEdit = () => {
    const w = parseFloat(editWidth);
    const h = parseFloat(editHeight);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;

    setPlacas(prev => prev.map(p => p.id === editingId ? { 
      ...p, 
      width: w, 
      height: h, 
      nome: `${w}x${h} cm` 
    } : p));
    setEditingId(null);
  };

  const addCustomSize = () => {
    const w = parseFloat(newWidth);
    const h = parseFloat(newHeight);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;

    const newPlaca: PlacaPadrao = {
      id: `custom-${Date.now()}`,
      nome: `${w}x${h} cm`,
      width: w,
      height: h,
      qty: 1
    };

    setPlacas(prev => [...prev, newPlaca]);
    setNewWidth('');
    setNewHeight('');
  };

  const removePlaca = (id: string) => {
    if (window.confirm("Deseja realmente excluir esta placa padrão?")) {
      setPlacas(prev => prev.filter(p => p.id !== id));
    }
  };

  const calculateUnitValue = (w: number, h: number) => {
    if (customCalculate) return customCalculate(w, h);
    return (w * h / 10000) * pricePerM2;
  };

  return (
    <div className="mt-12 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {placas.map((placa) => {
          const unitValue = calculateUnitValue(placa.width, placa.height);
          const totalValue = unitValue * placa.qty;
          const isEditing = editingId === placa.id;

          return (
            <motion.div
              key={placa.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all relative group"
            >
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => startEditing(placa)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removePlaca(placa.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveEdit}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-1">Tamanho</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editWidth}
                        onChange={(e) => setEditWidth(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400 text-xs">x</span>
                      <input
                        type="number"
                        value={editHeight}
                        onChange={(e) => setEditHeight(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400 text-xs">cm</span>
                    </div>
                  ) : (
                    <p className="text-xl font-black text-slate-900">{placa.nome}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Unitário</span>
                    <p className="text-base font-black text-slate-700">{formatarMoeda(unitValue)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={placa.qty}
                      onChange={(e) => updateQty(placa.id, parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total do Item</span>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatarMoeda(totalValue)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors">
        <h4 className="text-xs font-black text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" />
          Adicionar Tamanho Personalizado
        </h4>
        <div className="flex flex-wrap gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Largura (cm)</label>
            <input
              type="number"
              value={newWidth}
              onChange={(e) => setNewWidth(e.target.value)}
              placeholder="0.00"
              className="w-36 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (cm)</label>
            <input
              type="number"
              value={newHeight}
              onChange={(e) => setNewHeight(e.target.value)}
              placeholder="0.00"
              className="w-36 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={addCustomSize}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            ADICIONAR À LISTA
          </button>
        </div>
      </div>
    </div>
  );
};
