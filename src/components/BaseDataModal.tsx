import React, { useState, useEffect } from 'react';
import { BaseData, PapelBase, MaterialBase, ImpressaoBase, MaoObraBase } from '../types';
import { validateNumberInput } from '../services/utils';

import { HelpIcon } from './HelpSystem';

interface BaseDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseData: BaseData;
  onSave: (newData: BaseData) => void;
}

export const BaseDataModal: React.FC<BaseDataModalProps> = ({ isOpen, onClose, baseData, onSave }) => {
  const [data, setData] = useState<BaseData>(baseData);
  const [activeTab, setActiveTab] = useState<'papeis' | 'materiais' | 'impressoes' | 'maoObra' | 'maquinasDigitais' | 'maquinasOffset' | 'corteGuilhotina' | 'parametrosProducao' | 'temposAcabamento'>('papeis');

  useEffect(() => {
    if (isOpen) {
      setData(JSON.parse(JSON.stringify(baseData))); // Deep copy
    }
  }, [isOpen, baseData]);

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            ⚙️ Configurar Base de Valores Industrial
            <HelpIcon contentKey="VALORES_BASE" className="text-white/60 hover:text-white" />
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 overflow-x-auto">
          {[
            { id: 'papeis', label: '📄 Papéis', count: data.papeis.length },
            { id: 'materiais', label: '🔧 Materiais', count: data.materiais.length },
            { id: 'impressoes', label: '🖨️ Impressão', count: data.impressoes.length },
            { id: 'maoObra', label: '👷 Mão de Obra', count: data.maoObra.length },
            { id: 'maquinasDigitais', label: '🖨️ Maq. Digitais', count: data.maquinasDigitais?.length || 0 },
            { id: 'maquinasOffset', label: '⚙️ Maq. Offset', count: data.maquinasOffset?.length || 0 },
            { id: 'corteGuilhotina', label: '✂️ Corte', count: data.corteGuilhotina?.length || 0 },
            { id: 'parametrosProducao', label: '⚙️ Parâmetros', count: data.parametrosProducao?.length || 0 },
            { id: 'temposAcabamento', label: '🔧 Acabamento', count: data.temposAcabamento?.length || 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-xs whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-700 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label} <span className="ml-1 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          
          {activeTab === 'papeis' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800 mb-4">
                💡 <strong>Dica:</strong> Altere os valores unitários. O sistema recalculará automaticamente todos os orçamentos que usam estes papéis. 
                Use as setas para organizar os papéis que você mais usa no topo da lista.
              </div>
              <div className="grid gap-4">
                {data.papeis.map((papel, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[48px_2fr_1fr_1fr_1fr_1fr_48px] gap-4 items-end">
                    <div className="flex flex-col gap-1">
                      <button 
                        disabled={idx === 0}
                        onClick={() => {
                          const newData = [...data.papeis];
                          const item = newData.splice(idx, 1)[0];
                          newData.splice(idx - 1, 0, item);
                          setData({ ...data, papeis: newData });
                        }}
                        className={`p-1 rounded text-xs ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                        title="Mover para Cima"
                      >
                        ▲
                      </button>
                      <button 
                        disabled={idx === data.papeis.length - 1}
                        onClick={() => {
                          const newData = [...data.papeis];
                          const item = newData.splice(idx, 1)[0];
                          newData.splice(idx + 1, 0, item);
                          setData({ ...data, papeis: newData });
                        }}
                        className={`p-1 rounded text-xs ${idx === data.papeis.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                        title="Mover para Baixo"
                      >
                        ▼
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Papel</label>
                      <input 
                        type="text" 
                        value={papel.nome}
                        onChange={e => {
                          const newData = [...data.papeis];
                          newData[idx].nome = e.target.value;
                          setData({ ...data, papeis: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A4 (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={papel.a4}
                        onChange={e => {
                          const newData = [...data.papeis];
                          newData[idx].a4 = validateNumberInput(e.target.value);
                          setData({ ...data, papeis: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A3 (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={papel.a3}
                        onChange={e => {
                          const newData = [...data.papeis];
                          newData[idx].a3 = validateNumberInput(e.target.value);
                          setData({ ...data, papeis: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Folha (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={papel.folha}
                        onChange={e => {
                          const newData = [...data.papeis];
                          newData[idx].folha = validateNumberInput(e.target.value);
                          setData({ ...data, papeis: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pacote (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={papel.pacote}
                        onChange={e => {
                          const newData = [...data.papeis];
                          newData[idx].pacote = validateNumberInput(e.target.value);
                          setData({ ...data, papeis: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.papeis];
                        newData.splice(idx, 1);
                        setData({ ...data, papeis: newData });
                      }}
                      className="text-red-500 hover:bg-red-50 p-2 rounded mt-5"
                      title="Excluir Papel"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, papeis: [...data.papeis, { nome: "Novo Papel", a4: 0, a3: 0, folha: 0, pacote: 0, folhasPacote: null }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Novo Papel
              </button>
            </div>
          )}

          {activeTab === 'materiais' && (
            <div className="space-y-6">
              {data.materiais.map((material, mIdx) => (
                <div key={mIdx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <input 
                      type="text" 
                      value={material.nome}
                      onChange={e => {
                        const newData = [...data.materiais];
                        newData[mIdx].nome = e.target.value;
                        setData({ ...data, materiais: newData });
                      }}
                      className="text-lg font-bold text-gray-800 border-none focus:ring-0 p-0 w-full"
                    />
                    <button 
                      onClick={() => {
                        const newData = [...data.materiais];
                        newData.splice(mIdx, 1);
                        setData({ ...data, materiais: newData });
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-bold px-2"
                    >
                      Excluir
                    </button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                    {material.tipos.map((tipo, tIdx) => (
                      <div key={tIdx} className="flex gap-3 items-center">
                        <input 
                          type="text" 
                          value={tipo.nome}
                          onChange={e => {
                            const newData = [...data.materiais];
                            newData[mIdx].tipos[tIdx].nome = e.target.value;
                            setData({ ...data, materiais: newData });
                          }}
                          className="flex-1 p-2 border rounded text-sm"
                          placeholder="Nome do Tipo/Variação"
                        />
                        <div className="w-32 relative">
                          <span className="absolute left-2 top-2 text-gray-400 text-sm">R$</span>
                          <input 
                            type="number" step="0.01"
                            value={tipo.valor}
                            onChange={e => {
                              const newData = [...data.materiais];
                              newData[mIdx].tipos[tIdx].valor = validateNumberInput(e.target.value);
                              setData({ ...data, materiais: newData });
                            }}
                            className="w-full p-2 pl-8 border rounded text-sm text-right font-mono"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newData = [...data.materiais];
                            newData[mIdx].tipos.splice(tIdx, 1);
                            setData({ ...data, materiais: newData });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newData = [...data.materiais];
                        newData[mIdx].tipos.push({ nome: "Novo Tipo", valor: 0 });
                        setData({ ...data, materiais: newData });
                      }}
                      className="text-sm text-blue-600 hover:underline mt-2"
                    >
                      + Adicionar Variação
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setData({ ...data, materiais: [...data.materiais, { nome: "Novo Material", tipos: [{ nome: "Padrão", valor: 0 }] }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Novo Grupo de Material
              </button>
            </div>
          )}

          {activeTab === 'impressoes' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.impressoes.map((imp, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Impressão</label>
                      <input 
                        type="text" 
                        value={imp.tipo}
                        onChange={e => {
                          const newData = [...data.impressoes];
                          newData[idx].tipo = e.target.value;
                          setData({ ...data, impressoes: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Formato</label>
                      <input 
                        type="text" 
                        value={imp.formato}
                        onChange={e => {
                          const newData = [...data.impressoes];
                          newData[idx].formato = e.target.value;
                          setData({ ...data, impressoes: newData });
                        }}
                        className="w-full p-2 border rounded text-center"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Unit.</label>
                      <input 
                        type="number" step="0.01"
                        value={imp.valor}
                        onChange={e => {
                          const newData = [...data.impressoes];
                          newData[idx].valor = validateNumberInput(e.target.value);
                          setData({ ...data, impressoes: newData });
                        }}
                        className="w-full p-2 border rounded text-right font-mono"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.impressoes];
                        newData.splice(idx, 1);
                        setData({ ...data, impressoes: newData });
                      }}
                      className="text-red-500 hover:bg-red-50 p-2 rounded mt-5"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, impressoes: [...data.impressoes, { tipo: "NOVA IMPRESSÃO", formato: "A4", valor: 0 }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Nova Impressão
              </button>
            </div>
          )}

          {activeTab === 'maoObra' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.maoObra.map((mo, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profissional / Serviço</label>
                      <input 
                        type="text" 
                        value={mo.profissional}
                        onChange={e => {
                          const newData = [...data.maoObra];
                          newData[idx].profissional = e.target.value;
                          setData({ ...data, maoObra: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Hora (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={mo.hora}
                        onChange={e => {
                          const newData = [...data.maoObra];
                          newData[idx].hora = validateNumberInput(e.target.value);
                          setData({ ...data, maoObra: newData });
                        }}
                        className="w-full p-2 border rounded text-right font-mono"
                      />
                    </div>
                    <div className="w-32 pt-5 text-sm text-gray-500">
                      = R$ {(mo.hora / 60).toFixed(2)} / min
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.maoObra];
                        newData.splice(idx, 1);
                        setData({ ...data, maoObra: newData });
                      }}
                      className="text-red-500 hover:bg-red-50 p-2 rounded mt-5"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, maoObra: [...data.maoObra, { profissional: "NOVO PROFISSIONAL", hora: 0 }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Novo Profissional
              </button>
            </div>
          )}

          {activeTab === 'maquinasDigitais' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.maquinasDigitais?.map((maq, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1.5fr_48px] gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Máquina</label>
                      <input 
                        type="text" 
                        value={maq.maquina}
                        onChange={e => {
                          const newData = [...data.maquinasDigitais];
                          newData[idx].maquina = e.target.value;
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A4/min</label>
                      <input 
                        type="number" 
                        value={maq.a4Minuto}
                        onChange={e => {
                          const val = validateNumberInput(e.target.value);
                          const newData = [...data.maquinasDigitais];
                          newData[idx].a4Minuto = val;
                          // Auto calculate A3 (half rounded up)
                          newData[idx].a3Minuto = Math.ceil(val / 2);
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A4 FV/min</label>
                      <input 
                        type="number" 
                        value={maq.a4FvMinuto}
                        onChange={e => {
                          const val = validateNumberInput(e.target.value);
                          const newData = [...data.maquinasDigitais];
                          newData[idx].a4FvMinuto = val;
                          // Auto calculate A3 FV (half rounded up)
                          newData[idx].a3FvMinuto = Math.ceil(val / 2);
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A3/min</label>
                      <input 
                        type="number" 
                        value={maq.a3Minuto}
                        onChange={e => {
                          const newData = [...data.maquinasDigitais];
                          newData[idx].a3Minuto = validateNumberInput(e.target.value);
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">A3 FV/min</label>
                      <input 
                        type="number" 
                        value={maq.a3FvMinuto}
                        onChange={e => {
                          const newData = [...data.maquinasDigitais];
                          newData[idx].a3FvMinuto = validateNumberInput(e.target.value);
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operador</label>
                      <select 
                        value={maq.operador}
                        onChange={e => {
                          const newData = [...data.maquinasDigitais];
                          newData[idx].operador = e.target.value;
                          setData({ ...data, maquinasDigitais: newData });
                        }}
                        className="w-full p-2 border rounded"
                      >
                        {data.maoObra.map(mo => <option key={mo.profissional} value={mo.profissional}>{mo.profissional}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.maquinasDigitais];
                        newData.splice(idx, 1);
                        setData({ ...data, maquinasDigitais: newData });
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, maquinasDigitais: [...(data.maquinasDigitais || []), { maquina: "Nova Máquina", a4Minuto: 0, a4FvMinuto: 0, a3Minuto: 0, a3FvMinuto: 0, operador: data.maoObra[0]?.profissional || "" }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Máquina Digital
              </button>
            </div>
          )}

          {activeTab === 'maquinasOffset' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.maquinasOffset?.map((maq, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_48px] gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Máquina</label>
                      <input 
                        type="text" 
                        value={maq.maquina}
                        onChange={e => {
                          const newData = [...data.maquinasOffset];
                          newData[idx].maquina = e.target.value;
                          setData({ ...data, maquinasOffset: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prod./Hora</label>
                      <input 
                        type="number" 
                        value={maq.producaoHora}
                        onChange={e => {
                          const newData = [...data.maquinasOffset];
                          newData[idx].producaoHora = validateNumberInput(e.target.value);
                          setData({ ...data, maquinasOffset: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cores/Rodada</label>
                      <input 
                        type="number" 
                        value={maq.coresRodada}
                        onChange={e => {
                          const newData = [...data.maquinasOffset];
                          newData[idx].coresRodada = validateNumberInput(e.target.value);
                          setData({ ...data, maquinasOffset: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.maquinasOffset];
                        newData.splice(idx, 1);
                        setData({ ...data, maquinasOffset: newData });
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, maquinasOffset: [...(data.maquinasOffset || []), { maquina: "Nova Máquina Offset", producaoHora: 0, coresRodada: 1 }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Máquina Offset
              </button>
            </div>
          )}

          {activeTab === 'corteGuilhotina' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.corteGuilhotina?.map((corte, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_48px] gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Produto</label>
                      <input 
                        type="text" 
                        value={corte.tipoProduto}
                        onChange={e => {
                          const newData = [...data.corteGuilhotina];
                          newData[idx].tipoProduto = e.target.value;
                          setData({ ...data, corteGuilhotina: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tempo Min (min)</label>
                      <input 
                        type="number" 
                        value={corte.tempoMin}
                        onChange={e => {
                          const newData = [...data.corteGuilhotina];
                          newData[idx].tempoMin = validateNumberInput(e.target.value);
                          setData({ ...data, corteGuilhotina: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tempo Max (min)</label>
                      <input 
                        type="number" 
                        value={corte.tempoMax}
                        onChange={e => {
                          const newData = [...data.corteGuilhotina];
                          newData[idx].tempoMax = validateNumberInput(e.target.value);
                          setData({ ...data, corteGuilhotina: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.corteGuilhotina];
                        newData.splice(idx, 1);
                        setData({ ...data, corteGuilhotina: newData });
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, corteGuilhotina: [...(data.corteGuilhotina || []), { tipoProduto: "Novo Produto", tempoMin: 0, tempoMax: 0 }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Regra de Corte
              </button>
            </div>
          )}

          {activeTab === 'parametrosProducao' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.parametrosProducao?.map((param, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_48px] gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Parâmetro</label>
                      <input 
                        type="text" 
                        value={param.chave}
                        onChange={e => {
                          const newData = [...data.parametrosProducao];
                          newData[idx].chave = e.target.value;
                          setData({ ...data, parametrosProducao: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                      <input 
                        type="number" 
                        value={param.valor}
                        onChange={e => {
                          const newData = [...data.parametrosProducao];
                          newData[idx].valor = validateNumberInput(e.target.value);
                          setData({ ...data, parametrosProducao: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade</label>
                      <input 
                        type="text" 
                        value={param.unidade}
                        onChange={e => {
                          const newData = [...data.parametrosProducao];
                          newData[idx].unidade = e.target.value;
                          setData({ ...data, parametrosProducao: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.parametrosProducao];
                        newData.splice(idx, 1);
                        setData({ ...data, parametrosProducao: newData });
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, parametrosProducao: [...(data.parametrosProducao || []), { chave: "Novo Parâmetro", valor: 0, unidade: "min" }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Parâmetro
              </button>
            </div>
          )}

          {activeTab === 'temposAcabamento' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {data.temposAcabamento?.map((tempo, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_48px] gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Processo</label>
                      <input 
                        type="text" 
                        value={tempo.processo}
                        onChange={e => {
                          const newData = [...data.temposAcabamento];
                          newData[idx].processo = e.target.value;
                          setData({ ...data, temposAcabamento: newData });
                        }}
                        className="w-full p-2 border rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Velocidade</label>
                      <input 
                        type="number" step="0.01"
                        value={tempo.velocidade}
                        onChange={e => {
                          const newData = [...data.temposAcabamento];
                          newData[idx].velocidade = validateNumberInput(e.target.value);
                          setData({ ...data, temposAcabamento: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade</label>
                      <input 
                        type="text" 
                        value={tempo.unidade}
                        onChange={e => {
                          const newData = [...data.temposAcabamento];
                          newData[idx].unidade = e.target.value;
                          setData({ ...data, temposAcabamento: newData });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newData = [...data.temposAcabamento];
                        newData.splice(idx, 1);
                        setData({ ...data, temposAcabamento: newData });
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setData({ ...data, temposAcabamento: [...(data.temposAcabamento || []), { processo: "Novo Processo", velocidade: 0, unidade: "un/min" }] })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-colors"
              >
                + Adicionar Tempo de Acabamento
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 p-4 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
          >
            💾 Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};
