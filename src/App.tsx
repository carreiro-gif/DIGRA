import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { INITIAL_BASE_DATA } from "./constants";
import {
  AppState,
  ItemPapel,
  ItemMaterial,
  ItemImpressao,
  ItemMaoObra,
} from "./types";
import { calculateTotals, formatCurrency, generateId, formatarMoeda, formatarNumero, validateNumberInput } from "./services/utils";
import { BaseDataModal } from "./components/BaseDataModal";
import { PlacasPadraoModule } from "./components/PlacasPadraoModule";
import { SmartBudgetInput } from "./components/SmartBudgetInput";
import { ProjectImages } from "./components/ProjectImages";
import { CalculatedProduction } from "./types/SmartBudgetTypes";
import { BudgetMapper, GraphicEngine, HistoricalLearner } from "./services/SmartBudgetService";
import {
  Calculator,
  Settings,
  Printer,
  FileText,
  Layers,
  Clock,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Info,
  History,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Loader2,
  Square,
  Monitor,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BudgetHistory } from "./components/BudgetHistory";
import { LoginGate } from "./components/LoginGate";
import { Login } from "./components/Login";
import { AuthService } from "./services/AuthService";
import { BudgetHistoryService } from "./services/BudgetHistoryService";
import { User } from "firebase/auth";

// --- Sub-Components Definition (Inline for single-file structure preference as requested, but organized) ---

import { HelpIcon, SystemManual } from './components/HelpSystem';
import { HELP_CONTENT } from './constants/HelpContent';

import { AIHelpAssistant } from "./components/AIHelpAssistant";

const SectionCard = ({
  title,
  icon,
  children,
  className = "",
  helpKey,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
  helpKey?: keyof typeof HELP_CONTENT;
}) => (
  <section
    className={`
      mb-8 
      bg-white 
      rounded-2xl 
      shadow-xl 
      border 
      border-slate-200 
      overflow-visible
      print:shadow-none 
      print:rounded-none 
      print:border 
      print:border-gray-300
      print:overflow-visible
      print:break-inside-auto
      ${className}
    `}
  >
    <div className="p-5 border-b border-slate-100 bg-slate-50/50 print:bg-none flex items-center justify-between rounded-t-2xl">
      <h2 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
        <span className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</span>
        {title}
      </h2>
      {helpKey && <HelpIcon contentKey={helpKey} />}
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const InputGroup = ({
  label,
  children,
  widthClass,
}: {
  label: string;
  children: React.ReactNode;
  widthClass: string;
}) => (
  <div className={`${widthClass} flex flex-col gap-2`}>
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);

const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="h-11 w-11 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors no-print"
    title="Remover"
  >
    🗑️
  </button>
);

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-red-100 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-slate-800 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 text-sm mb-6">O sistema encontrou um erro inesperado. Tente recarregar a página.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- DASHBOARD COMPONENT ---

type View = 'DASHBOARD' | 'ORCAMENTO_GRAFICO' | 'PLACAS_SIMPLES' | 'PLACAS_PLASTIFICADAS' | 'PLACAS_VINIL';

const Dashboard = ({ onSelectView }: { onSelectView: (view: View) => void }) => {
  const menuItems = [
    { id: 'ORCAMENTO_GRAFICO', title: 'ORÇAMENTO GRÁFICO', icon: <Calculator className="w-12 h-12" />, color: 'bg-blue-600' },
    { id: 'PLACAS_SIMPLES', title: 'PLACAS DE SINALIZAÇÃO SIMPLES', icon: <Square className="w-12 h-12" />, color: 'bg-emerald-600' },
    { id: 'PLACAS_PLASTIFICADAS', title: 'PLACAS DE SINALIZAÇÃO PLASTIFICADAS', icon: <Layers className="w-12 h-12" />, color: 'bg-amber-600' },
    { id: 'PLACAS_VINIL', title: 'PLACAS EM VINIL (VIDRO)', icon: <Monitor className="w-12 h-12" />, color: 'bg-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl w-full"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6"
          >
            <img 
              src="/mascote-sorrindo.png" 
              alt="Mascote Digra" 
              className="w-40 h-40 object-contain drop-shadow-2xl" 
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-3xl font-black text-white text-center tracking-tight flex items-center gap-3">
            <span className="text-blue-500">DIGRA</span> — SISTEMA INTELIGENTE DE ORÇAMENTOS
            <HelpIcon contentKey="OVERVIEW" className="text-white/40 hover:text-white" />
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Selecione o módulo de cálculo</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id as View)}
              className={`${item.color} hover:brightness-110 transition-all p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-white group active:scale-95 transform`}
            >
              <div className="bg-white/20 p-4 rounded-xl group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <span className="text-xl font-bold text-center leading-tight">
                {item.title}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center text-white font-medium text-[10px] uppercase tracking-[0.2em] opacity-60">
          ⚡ Alexandre | DIGRA Apps
        </div>
      </motion.div>
    </div>
  );
};

const DEFAULT_PLACAS_BASE_VALUES = {
  placaSimples: 39.00,
  placaPlastificada: 52.20,
  vinil: 14.40,
  mascara: 9.90,
  maquina: 0.63,
  maoObra: 30
};

const usePlacasBaseValues = () => {
  const [baseValues, setBaseValues] = useState(DEFAULT_PLACAS_BASE_VALUES);

  useEffect(() => {
    const saved = localStorage.getItem('digra_placas_base_values');
    if (saved) {
      try {
        setBaseValues({ ...DEFAULT_PLACAS_BASE_VALUES, ...JSON.parse(saved) });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateValue = (key: keyof typeof DEFAULT_PLACAS_BASE_VALUES, value: number) => {
    const newValues = { ...baseValues, [key]: value };
    setBaseValues(newValues);
    localStorage.setItem('digra_placas_base_values', JSON.stringify(newValues));
  };

  const restoreDefaults = () => {
    setBaseValues(DEFAULT_PLACAS_BASE_VALUES);
    localStorage.removeItem('digra_placas_base_values');
  };

  return { baseValues, updateValue, restoreDefaults };
};

const ValoresBasePlacas = ({ baseValues, updateValue, restoreDefaults }: ReturnType<typeof usePlacasBaseValues>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          <span className="font-bold text-slate-700">Valores Base (Configurações)</span>
          <HelpIcon contentKey="VALORES_BASE" />
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t-2 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Placa Simples (m²)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  value={baseValues.placaSimples}
                  onChange={(e) => updateValue('placaSimples', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Placa Plastificada (m²)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  value={baseValues.placaPlastificada}
                  onChange={(e) => updateValue('placaPlastificada', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Adesivo Vinil (m²)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  value={baseValues.vinil}
                  onChange={(e) => updateValue('vinil', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Máscara Transferência (m²)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  value={baseValues.mascara}
                  onChange={(e) => updateValue('mascara', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Custo Máquina (min)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  value={baseValues.maquina}
                  onChange={(e) => updateValue('maquina', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase tracking-widest">Mão de Obra (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={baseValues.maoObra}
                  onChange={(e) => updateValue('maoObra', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 pr-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-right"
                  step="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={restoreDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar Valores Padrão
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CalculatorShell = ({ title, onBack, children }: { title: string, onBack: () => void, children?: React.ReactNode }) => (
  <div className="min-h-screen bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#1e40af] flex flex-col font-sans">
    <header className="bg-white/5 backdrop-blur-md text-white py-6 shadow-2xl no-print border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
            title="Voltar ao Menu"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{title}</h1>
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Módulo de Cálculo Especializado</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none">DIGRA APPS</div>
            <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-1">v2.5.0</div>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
            <Calculator className="w-5 h-5 text-blue-300" />
          </div>
        </div>
      </div>
    </header>
    
    <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#f8fafc] rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex-1 flex flex-col"
      >
        <div className="p-10 flex-1 flex flex-col">
          {children || (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
              <div className="w-32 h-32 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-8">
                <Calculator className="w-16 h-16 text-slate-400" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tight">Área de Cálculo</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aguardando implementação do módulo</p>
            </div>
          )}
        </div>
      </motion.div>

      <footer className="py-8 text-center no-print">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">
          ⚡ Alexandre | DIGRA Apps
        </p>
      </footer>
    </main>
  </div>
);

const PlacaSimplesCalculator = ({ onBack }: { onBack: () => void }) => {
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [resultado, setResultado] = useState<{ area: number, custo: number, total: number } | null>(null);
  
  const placasBase = usePlacasBaseValues();

  const calcular = () => {
    const l = validateNumberInput(largura.replace(',', '.'));
    const a = validateNumberInput(altura.replace(',', '.'));
    const q = validateNumberInput(quantidade) || 1;

    if (isNaN(l) || isNaN(a) || l <= 0 || a <= 0) {
      alert("Por favor, insira valores válidos para largura e altura.");
      return;
    }

    const area = (l * a) / 10000;
    const custo = area * placasBase.baseValues.placaSimples;
    setResultado({ area, custo, total: custo * q });
  };

  const limpar = () => {
    setLargura("");
    setAltura("");
    setQuantidade("1");
    setResultado(null);
  };

  return (
    <CalculatorShell title="PLACAS DE SINALIZAÇÃO SIMPLES" onBack={onBack}>
      <div className="w-full text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Largura (cm)</label>
            <input 
              type="text" 
              value={largura}
              onChange={(e) => setLargura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 20"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Altura (cm)</label>
            <input 
              type="text" 
              value={altura}
              onChange={(e) => setAltura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 35"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-10">
          <button onClick={calcular} className="flex-1 bg-blue-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5" /> CALCULAR ORÇAMENTO
          </button>
          <button onClick={limpar} className="bg-slate-100 text-slate-500 font-bold py-4 px-8 rounded-2xl hover:bg-slate-200 transition-all">
            LIMPAR
          </button>
        </div>

        {resultado && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-blue-50 p-8 rounded-3xl border-2 border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-blue-600/60 font-bold text-xs uppercase tracking-widest mb-1">Área Total</p>
                <p className="text-2xl font-black text-blue-900">{formatarNumero(resultado.area)} m²</p>
              </div>
              <div className="text-center">
                <p className="text-blue-600/60 font-bold text-xs uppercase tracking-widest mb-1">Custo Base</p>
                <p className="text-2xl font-black text-blue-900">{formatarMoeda(resultado.custo)}</p>
              </div>
              <div className="text-center">
                <p className="text-blue-600/60 font-bold text-xs uppercase tracking-widest mb-1">Valor Unitário</p>
                <p className="text-2xl font-black text-blue-600">{formatarMoeda(resultado.custo)}</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-100">
              <div className="flex flex-col md:flex-row items-end gap-8">
                <div className="w-full md:w-1/3">
                  <label className="block text-emerald-700/60 font-bold mb-2 uppercase text-xs tracking-widest">Quantidade</label>
                  <input 
                    type="number" 
                    value={quantidade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantidade(val);
                      if (resultado) {
                        const q = parseInt(val) || 1;
                        setResultado({ ...resultado, total: resultado.custo * q });
                      }
                    }}
                    className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-lg text-emerald-900"
                    min="1"
                  />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-emerald-700/60 font-bold text-xs uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <p className="text-5xl font-black text-emerald-600">{formatarMoeda(resultado.total)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <PlacasPadraoModule pricePerM2={placasBase.baseValues.placaSimples} />
        <ValoresBasePlacas {...placasBase} />
      </div>
    </CalculatorShell>
  );
};

const PlacaPlastificadaCalculator = ({ onBack }: { onBack: () => void }) => {
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [resultado, setResultado] = useState<{ area: number, custo: number, total: number } | null>(null);
  
  const placasBase = usePlacasBaseValues();

  const calcular = () => {
    const l = validateNumberInput(largura.replace(',', '.'));
    const a = validateNumberInput(altura.replace(',', '.'));
    const q = validateNumberInput(quantidade) || 1;

    if (isNaN(l) || isNaN(a) || l <= 0 || a <= 0) {
      alert("Por favor, insira valores válidos para largura e altura.");
      return;
    }

    const area = (l * a) / 10000;
    const custo = area * placasBase.baseValues.placaPlastificada;
    setResultado({ area, custo, total: custo * q });
  };

  const limpar = () => {
    setLargura("");
    setAltura("");
    setQuantidade("1");
    setResultado(null);
  };

  return (
    <CalculatorShell title="PLACAS DE SINALIZAÇÃO PLASTIFICADAS" onBack={onBack}>
      <div className="w-full text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Largura (cm)</label>
            <input 
              type="text" 
              value={largura}
              onChange={(e) => setLargura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 20"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Altura (cm)</label>
            <input 
              type="text" 
              value={altura}
              onChange={(e) => setAltura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 35"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-10">
          <button onClick={calcular} className="flex-1 bg-amber-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5" /> CALCULAR ORÇAMENTO
          </button>
          <button onClick={limpar} className="bg-slate-100 text-slate-500 font-bold py-4 px-8 rounded-2xl hover:bg-slate-200 transition-all">
            LIMPAR
          </button>
        </div>

        {resultado && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-amber-50 p-8 rounded-3xl border-2 border-amber-100 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-amber-600/60 font-bold text-xs uppercase tracking-widest mb-1">Área Total</p>
                <p className="text-2xl font-black text-amber-900">{formatarNumero(resultado.area)} m²</p>
              </div>
              <div className="text-center">
                <p className="text-amber-600/60 font-bold text-xs uppercase tracking-widest mb-1">Custo Base</p>
                <p className="text-2xl font-black text-amber-900">{formatarMoeda(resultado.custo)}</p>
              </div>
              <div className="text-center">
                <p className="text-amber-600/60 font-bold text-xs uppercase tracking-widest mb-1">Valor Unitário</p>
                <p className="text-2xl font-black text-amber-600">{formatarMoeda(resultado.custo)}</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-100">
              <div className="flex flex-col md:flex-row items-end gap-8">
                <div className="w-full md:w-1/3">
                  <label className="block text-emerald-700/60 font-bold mb-2 uppercase text-xs tracking-widest">Quantidade</label>
                  <input 
                    type="number" 
                    value={quantidade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantidade(val);
                      if (resultado) {
                        const q = parseInt(val) || 1;
                        setResultado({ ...resultado, total: resultado.custo * q });
                      }
                    }}
                    className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-lg text-emerald-900"
                    min="1"
                  />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-emerald-700/60 font-bold text-xs uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <p className="text-5xl font-black text-emerald-600">{formatarMoeda(resultado.total)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <PlacasPadraoModule pricePerM2={placasBase.baseValues.placaPlastificada} />
        <ValoresBasePlacas {...placasBase} />
      </div>
    </CalculatorShell>
  );
};

const VinilVidroCalculator = ({ onBack }: { onBack: () => void }) => {
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [resultado, setResultado] = useState<{ 
    area: number, 
    custoVinil: number, 
    custoMascara: number, 
    tempoMaquina: number, 
    maoObra: number, 
    valorUnitario: number, 
    total: number 
  } | null>(null);

  const placasBase = usePlacasBaseValues();

  const calcular = () => {
    const l = validateNumberInput(largura.replace(',', '.'));
    const a = validateNumberInput(altura.replace(',', '.'));
    const q = validateNumberInput(quantidade) || 1;

    if (isNaN(l) || isNaN(a) || l <= 0 || a <= 0) {
      alert("Por favor, insira valores válidos para largura e altura.");
      return;
    }

    const area = (l * a) / 10000;
    const custoVinil = area * placasBase.baseValues.vinil;
    const custoMascara = area * placasBase.baseValues.mascara;
    const tempoMaquina = (l <= 40 && a <= 40) ? 10 : 60;
    const custoMaquina = tempoMaquina * placasBase.baseValues.maquina;
    const subtotal = custoVinil + custoMascara + custoMaquina;
    const maoObra = subtotal * (placasBase.baseValues.maoObra / 100);
    const valorUnitario = subtotal + maoObra;

    setResultado({ 
      area, 
      custoVinil, 
      custoMascara, 
      tempoMaquina, 
      maoObra, 
      valorUnitario, 
      total: valorUnitario * q 
    });
  };

  const calculateStandardVinil = (w: number, h: number) => {
    const area = (w * h) / 10000;
    const custoVinil = area * placasBase.baseValues.vinil;
    const custoMascara = area * placasBase.baseValues.mascara;
    const tempoMaquina = (w <= 40 && h <= 40) ? 10 : 60;
    const custoMaquina = tempoMaquina * placasBase.baseValues.maquina;
    const subtotal = custoVinil + custoMascara + custoMaquina;
    const maoObra = subtotal * (placasBase.baseValues.maoObra / 100);
    return subtotal + maoObra;
  };

  const limpar = () => {
    setLargura("");
    setAltura("");
    setQuantidade("1");
    setResultado(null);
  };

  return (
    <CalculatorShell title="PLACAS EM VINIL (VIDRO)" onBack={onBack}>
      <div className="w-full text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Largura (cm)</label>
            <input 
              type="text" 
              value={largura}
              onChange={(e) => setLargura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 30"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-2 uppercase text-xs tracking-widest">Altura (cm)</label>
            <input 
              type="text" 
              value={altura}
              onChange={(e) => setAltura(e.target.value.replace(/[^0-9,.]/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-lg"
              placeholder="Ex: 25"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-10">
          <button onClick={calcular} className="flex-1 bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5" /> CALCULAR ORÇAMENTO
          </button>
          <button onClick={limpar} className="bg-slate-100 text-slate-500 font-bold py-4 px-8 rounded-2xl hover:bg-slate-200 transition-all">
            LIMPAR
          </button>
        </div>

        {resultado && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-indigo-50 p-8 rounded-3xl border-2 border-indigo-100 grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Área Total</p>
                <p className="text-xl font-black text-indigo-900">{formatarNumero(resultado.area)} m²</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Custo Vinil</p>
                <p className="text-xl font-black text-indigo-900">{formatarMoeda(resultado.custoVinil)}</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Custo Máscara</p>
                <p className="text-xl font-black text-indigo-900">{formatarMoeda(resultado.custoMascara)}</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Tempo Máquina</p>
                <p className="text-xl font-black text-indigo-900">{resultado.tempoMaquina} min</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Mão de Obra ({placasBase.baseValues.maoObra}%)</p>
                <p className="text-xl font-black text-indigo-900">{formatarMoeda(resultado.maoObra)}</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-widest mb-1">Valor Unitário</p>
                <p className="text-2xl font-black text-indigo-600">{formatarMoeda(resultado.valorUnitario)}</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-100">
              <div className="flex flex-col md:flex-row items-end gap-8">
                <div className="w-full md:w-1/3">
                  <label className="block text-emerald-700/60 font-bold mb-2 uppercase text-xs tracking-widest">Quantidade</label>
                  <input 
                    type="number" 
                    value={quantidade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantidade(val);
                      if (resultado) {
                        const q = parseInt(val) || 1;
                        setResultado({ ...resultado, total: resultado.valorUnitario * q });
                      }
                    }}
                    className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-lg text-emerald-900"
                    min="1"
                  />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-emerald-700/60 font-bold text-xs uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <p className="text-5xl font-black text-emerald-600">{formatarMoeda(resultado.total)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <PlacasPadraoModule 
          pricePerM2={placasBase.baseValues.vinil} 
          customCalculate={calculateStandardVinil}
        />
        <ValoresBasePlacas {...placasBase} />
      </div>
    </CalculatorShell>
  );
};

// --- MAIN COMPONENT ---

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  // -- STATE --
  const [state, setState] = useState<AppState>(() => {
    const DEFAULT_STATE: AppState = {
      info: {
        qtTotal: 100,
        tamanhoFinal: "A4",
        tec: "DIGITAL",
        descricao: "",
        dadosTecnicos: "",
        materialReferencia: "",
      },
      itens: { papeis: [], materiais: [], impressoes: [], maoObra: [] },
      imagens: [],
      base: INITIAL_BASE_DATA,
      historico_orcamentos: [],
      technicalForm: {
        produto: "",
        quantidade: 100,
        tamanhoFinal: "A4",
        frenteVerso: false,
        cores: "4/0",
        modoImpressao: "SIMPLES",
        coresMistas: [],
        tipoImpressao: "DIGITAL",
        maquina: "RICOH / PROGRAMAÇÃO VISUAL",
        papeis: [
          {
            nome: INITIAL_BASE_DATA.papeis[0]?.nome || "Couchê",
            gramatura: 150,
            compraEm: "Folha",
            descricao: "Papel Principal",
          },
        ],
        paginas: 4,
        materiais: {
          laserFilme: false,
          laserFilmeQtd: 0,
          espiral: false,
          espiralFolhasUnidade: 0,
          capaEncadernacao: false,
          fitaDuplaFace: false,
          bobinaPolietileno: false,
          adesivoVinil: false,
          bolsaPasta: false,
        },
        acabamentos: {
          plastificacao: false,
          espiral: false,
          grampo: false,
          dobra: false,
          alceamento: false,
          colagemCapa: false,
          vinco: false,
        },
      },
    };

    try {
      const saved = localStorage.getItem("digra_orcamento_v2_react");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved state with default state to ensure new properties are present
        return {
          ...DEFAULT_STATE,
          ...parsed,
          info: { ...DEFAULT_STATE.info, ...parsed.info },
          itens: { ...DEFAULT_STATE.itens, ...parsed.itens },
          base: { 
            ...DEFAULT_STATE.base, 
            ...parsed.base,
            maquinasDigitais: (parsed.base?.maquinasDigitais || DEFAULT_STATE.base.maquinasDigitais).map((m: any) => {
              const defMachine = DEFAULT_STATE.base.maquinasDigitais.find((dm: any) => dm.maquina === m.maquina);
              return {
                ...defMachine,
                ...m,
                a3Minuto: m.a3Minuto !== undefined ? m.a3Minuto : (defMachine?.a3Minuto || Math.ceil(m.a4Minuto / 2)),
                a3FvMinuto: m.a3FvMinuto !== undefined ? m.a3FvMinuto : (defMachine?.a3FvMinuto || Math.ceil(m.a4FvMinuto / 2))
              };
            })
          },
          technicalForm: parsed.technicalForm ? { 
            ...DEFAULT_STATE.technicalForm, 
            ...parsed.technicalForm,
            materiais: { ...DEFAULT_STATE.technicalForm.materiais, ...parsed.technicalForm.materiais },
            acabamentos: { ...DEFAULT_STATE.technicalForm.acabamentos, ...parsed.technicalForm.acabamentos }
          } : DEFAULT_STATE.technicalForm
        };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totals, setTotals] = useState(calculateTotals(state));
  const [logoError, setLogoError] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [resetKey, setResetKey] = useState(0);

  // -- EFFECTS --
  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

   useEffect(() => {
    localStorage.setItem("digra_orcamento_v2_react", JSON.stringify(state));
    setTotals(calculateTotals(state));
  }, [state]);

  // Reactive Effect for Technical Form -> Budget Items
  useEffect(() => {
    if (!state.technicalForm) return;

    // Run calculation engine
    try {
      const calc = GraphicEngine.calculate(state.technicalForm, state.base);

      // Apply Historical Learning (Module 2)
      let historicalInfo = null;
      if (calc.producaoEngine && state.technicalForm?.produto) {
        const suggestion = HistoricalLearner.suggestTime(
          state.technicalForm,
          state.historico_orcamentos || [],
          calc.producaoEngine.tempo_total
        );
        
        if (suggestion.average !== null) {
          historicalInfo = {
            original: calc.producaoEngine.tempo_total,
            average: suggestion.average,
            suggested: suggestion.suggested
          };
          calc.producaoEngine.tempo_total = suggestion.suggested;
          calc.resumoTecnico.historicalInfo = historicalInfo;
        }
      }

      // Map to App State Items
      const newPapeis: ItemPapel[] = [];
      const newImpressoes: ItemImpressao[] = [];
      const newMaoObra: ItemMaoObra[] = [];
      const newMateriais: ItemMaterial[] = [];

      // 1. Process Components (Paper + Impressions)
      calc.componentes.forEach((comp) => {
        const papelIndex = BudgetMapper.findPapel(
          { nome: comp.papelSugerido, gramatura: comp.gramatura },
          state.base.papeis,
        );

        if (papelIndex >= 0) {
          const basePapel = state.base.papeis[papelIndex];
          const formato = comp.formatoFolha; // "A3" ou "A4"
          const unitPrice = formato === "A3" ? basePapel.a3 : basePapel.a4;

          newPapeis.push({
            id: generateId(),
            papelIndex: papelIndex,
            tamanho: formato as any,
            qtd: comp.totalFolhas,
            unit: unitPrice,
          });
        }

        // Add Impressions
        if (comp.totalImpressoes > 0) {
          const formato = comp.formatoFolha; // "A3" ou "A4"

          if (
            calc.input.modoImpressao === "MISTO" &&
            comp.nome.toUpperCase().includes("MIOLO")
          ) {
            calc.input.coresMistas.forEach((line) => {
              const sheetsPerUnit = line.paginas / 4; // A5 em A4
              const totalSheets = Math.ceil(
                sheetsPerUnit * calc.input.quantidade,
              );
              const totalImps = calc.input.frenteVerso
                ? totalSheets * 2
                : totalSheets;

              if (totalImps > 0) {
                const isColor = line.tipo.startsWith("4");
                const isFrenteVerso =
                  line.tipo.endsWith("/1") || line.tipo.endsWith("/4");

                let tipoStr = isColor ? "COLORIDO" : "PRETO";
                tipoStr += isFrenteVerso ? " (FRENTE E VERSO)" : " (1 lado)";

                const baseImp = state.base.impressoes.find(
                  (b) => b.tipo === tipoStr && b.formato === formato,
                );

                newImpressoes.push({
                  id: generateId(),
                  tipo: tipoStr,
                  formato: formato,
                  qtd: totalImps,
                  unit: baseImp ? baseImp.valor : 0,
                });
              }
            });
          } else {
            const cores = calc.input.cores.toLowerCase();
            const isColor = cores.includes("4") || cores.includes("color");
            const isFrenteVerso = calc.input.frenteVerso;

            let tipoStr = isColor ? "COLORIDO" : "PRETO";
            tipoStr += isFrenteVerso ? " (FRENTE E VERSO)" : " (1 lado)";

            const baseImp = state.base.impressoes.find(
              (b) => b.tipo === tipoStr && b.formato === formato,
            );

            newImpressoes.push({
              id: generateId(),
              tipo: tipoStr,
              formato: formato,
              qtd: comp.totalImpressoes,
              unit: baseImp ? baseImp.valor : 0,
            });
          }
        }
      });

      // 2. Process Labor
      const laborMap = new Map<string, number>();
      if (calc.tempoDesignerMin > 0)
        laborMap.set("DESIGNER GRÁFICO", calc.tempoDesignerMin);
      
      // Sempre adiciona Orçamentista com pelo menos 10 minutos
      laborMap.set("ORÇAMENTISTA GRÁFICO", Math.max(10, calc.tempoOrcamentistaMin || 10));

      const somaAcabamentos = Object.values(calc.temposAcabamento).reduce(
        (a, b) => (a as number) + (b as number),
        0,
      ) as number;

      if (somaAcabamentos > 0) {
        laborMap.set("OPERADOR DE ACABAMENTO GRÁFICO", somaAcabamentos);
      }

      if (calc.tempoGuilhotinaMin > 0) {
        laborMap.set("OPERADOR DE GUILHOTINA", calc.tempoGuilhotinaMin);
      }

      if (calc.tempoImpressorMin > 0) {
        const prof =
          calc.input.tipoImpressao === "OFFSET"
            ? "IMPRESSOR OFFSET"
            : "IMPRESSOR DIGITAL";
        laborMap.set(prof, (laborMap.get(prof) || 0) + calc.tempoImpressorMin);
      }

      laborMap.forEach((minutos, profName) => {
        const profIndex = BudgetMapper.findProfissional(
          profName,
          state.base.maoObra,
        );
        if (profIndex >= 0) {
          const baseMo = state.base.maoObra[profIndex];
          newMaoObra.push({
            id: generateId(),
            profIndex: profIndex,
            minutos: minutos,
            minutoValor: baseMo.hora / 60,
          });
        }
      });

      // 3. Process Materials
      calc.materiais.forEach((cMat) => {
        const matIndex = state.base.materiais.findIndex(
          (m) =>
            cMat.nome.toUpperCase().includes(m.nome.toUpperCase()) ||
            m.nome.toUpperCase().includes(cMat.nome.toUpperCase()),
        );

        if (matIndex >= 0) {
          const baseMat = state.base.materiais[matIndex];
          let tipoIndex = baseMat.tipos.findIndex(
            (t) =>
              cMat.nome.toUpperCase().includes(t.nome.toUpperCase()) ||
              t.nome.toUpperCase().includes(cMat.nome.toUpperCase()),
          );
          if (tipoIndex < 0) tipoIndex = 0;

          newMateriais.push({
            id: generateId(),
            materialIndex: matIndex,
            tipoIndex: tipoIndex,
            qtd: cMat.quantidade,
            unit: baseMat.tipos[tipoIndex].valor,
          });
        }
      });

      // 4. Batch Update State (Avoid infinite loop by checking if items actually changed)
      // We use a functional update to ensure we have the latest state
      setState((prev) => {
        // Store the last calculation for saving
        // @ts-ignore
        window.lastCalc = calc;

        // OFFSET RULE: Se tipo de impressão = OFFSET: → NÃO enviar NADA para: 'Impressão Digital'
        const filteredImpressoes = calc.input.tipoImpressao === "OFFSET" ? [] : newImpressoes;

        return {
          ...prev,
          info: {
            ...prev.info,
            qtTotal: calc.input.quantidade,
            tamanhoFinal: calc.input.tamanhoFinal,
            tec: calc.input.tipoImpressao,
            descricao: calc.input.observacoes || prev.info.descricao,
          },
          itens: {
            ...prev.itens,
            papeis: newPapeis,
            impressoes: filteredImpressoes,
            maoObra: newMaoObra,
            materiais: newMateriais,
          },
          producaoTecnica: calc.resumoTecnico,
        };
      });
    } catch (err) {
      console.error("Erro no motor de cálculo:", err);
    }
  }, [state.technicalForm, state.base]);

  // -- HANDLERS --

  // Função: NOVOOrcamento
  const NOVOOrcamento = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.currentTarget.blur();
    }

    if (
      !window.confirm(
        "Tem certeza que deseja iniciar um novo orçamento? Esta ação limpará os dados atuais.",
      )
    ) {
      return;
    }

    const keys = [
      "orcamentoAtual",
      "itens",
      "totais",
      "cliente",
      "config",
      "digra_orcamento_v2_react",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();

    const freshState: AppState = {
      info: {
        qtTotal: 100,
        tamanhoFinal: "A4",
        tec: "DIGITAL",
        descricao: "",
        dadosTecnicos: "",
        materialReferencia: "",
      },
      itens: { papeis: [], materiais: [], impressoes: [], maoObra: [] },
      imagens: [],
      base: state.base,
      producaoTecnica: undefined,
      historico_orcamentos: state.historico_orcamentos || [],
      technicalForm: {
        produto: "",
        quantidade: 100,
        tamanhoFinal: "A4",
        frenteVerso: false,
        cores: "4/0",
        modoImpressao: "SIMPLES",
        coresMistas: [],
        tipoImpressao: "DIGITAL",
        maquina: "RICOH / PROGRAMAÇÃO VISUAL",
        papeis: [
          {
            nome: state.base.papeis[0]?.nome || "Couchê",
            gramatura: 150,
            compraEm: "Folha",
            descricao: "Papel Principal",
          },
        ],
        paginas: 4,
        materiais: {
          laserFilme: false,
          laserFilmeQtd: 0,
          espiral: false,
          espiralFolhasUnidade: 0,
          capaEncadernacao: false,
          fitaDuplaFace: false,
          bobinaPolietileno: false,
          adesivoVinil: false,
          bolsaPasta: false,
        },
        acabamentos: {
          plastificacao: false,
          espiral: false,
          grampo: false,
          dobra: false,
          alceamento: false,
          colagemCapa: false,
          vinco: false,
        },
      },
    };

    setState(freshState);
    setTotals(calculateTotals(freshState));
    setLogoError(false);
    setResetKey(prev => prev + 1);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const updateInfo = (field: keyof AppState["info"], value: any) => {
    let validatedValue = value;
    if (field === "qtTotal") {
      validatedValue = validateNumberInput(String(value));
    }
    setState((prev) => {
      const newState = { ...prev, info: { ...prev.info, [field]: validatedValue } };
      
      // Sync with Technical Form (Master Rule)
      if (prev.technicalForm) {
        const newTech = { ...prev.technicalForm };
        if (field === "qtTotal") newTech.quantidade = validatedValue;
        if (field === "tamanhoFinal") newTech.tamanhoFinal = validatedValue;
        if (field === "tec") newTech.tipoImpressao = validatedValue;
        newState.technicalForm = newTech;
      }
      
      return newState;
    });
  };

  // Generic Item handlers
  const addItem = (type: keyof AppState["itens"], item: any) => {
    setState((prev) => ({
      ...prev,
      itens: { ...prev.itens, [type]: [...prev.itens[type], item] },
    }));
  };

  const removeItem = (type: keyof AppState["itens"], id: string) => {
    setState((prev) => ({
      ...prev,
      itens: {
        ...prev.itens,
        [type]: prev.itens[type].filter((i: any) => i.id !== id),
      },
    }));
  };

  const updateItem = (
    type: keyof AppState["itens"],
    id: string,
    field: string,
    value: any,
  ) => {
    setState((prev) => {
      const list = prev.itens[type].map((item: any) => {
        if (item.id !== id) return item;
        let validatedValue = value;
        if (field === "qtd" || field === "unit" || field === "minutos" || field === "minutoValor") {
          validatedValue = validateNumberInput(String(value));
        }
        return { ...item, [field]: validatedValue };
      });

      // Recalculate Unit Prices based on Base Data selection
      const updatedList = list.map((item: any) => {
        if (item.id !== id) return item; // Only process the changed item deeply if needed

        let unit = item.unit;
        if (type === "papeis") {
          const pItem = item as ItemPapel;
          if (pItem.papelIndex !== "" && pItem.tamanho) {
            const baseP = prev.base.papeis[pItem.papelIndex as number];
            if (baseP) {
              if (pItem.tamanho === "A4") unit = baseP.a4;
              else if (pItem.tamanho === "A3") unit = baseP.a3;
              else if (pItem.tamanho === "Folha") unit = baseP.folha;
              else if (pItem.tamanho === "Pacote") unit = baseP.pacote;
            }
          }
        } else if (type === "materiais") {
          const mItem = item as ItemMaterial;
          if (mItem.materialIndex !== "" && mItem.tipoIndex !== "") {
            const baseM = prev.base.materiais[mItem.materialIndex as number];
            const baseT = baseM?.tipos[mItem.tipoIndex as number];
            if (baseT) unit = baseT.valor;
          }
        } else if (type === "impressoes") {
          const iItem = item as ItemImpressao;
          const baseImp = prev.base.impressoes.find(
            (b) => b.tipo === iItem.tipo && b.formato === iItem.formato,
          );
          if (baseImp) unit = baseImp.valor;
        } else if (type === "maoObra") {
          const moItem = item as ItemMaoObra;
          if (moItem.profIndex !== "") {
            const baseMo = prev.base.maoObra[moItem.profIndex as number];
            if (baseMo) unit = baseMo.hora / 60;
            return { ...item, minutoValor: unit }; // Special case for maoObra field name
          }
        }
        return { ...item, unit };
      });

      return { ...prev, itens: { ...prev.itens, [type]: updatedList } };
    });
  };

  // Image Handlers
  // --- SMART BUDGET HANDLER ---
  const handleSmartBudgetApply = (calc: CalculatedProduction, append: boolean = false) => {
    // 1. Update Info
    const newInfo = { ...state.info };
    newInfo.qtTotal = calc.input.quantidade;
    newInfo.tamanhoFinal = calc.input.tamanhoFinal;
    newInfo.tec = calc.input.tipoImpressao;
    newInfo.descricao = calc.input.observacoes || "";
    
    // Store the last calculation for saving
    // @ts-ignore
    window.lastCalc = calc;

    // 2. Map Items
    const newPapeis: ItemPapel[] = [];
    const newImpressoes: ItemImpressao[] = [];
    const newMaoObra: ItemMaoObra[] = [];
    const newMateriais: ItemMaterial[] = [];

    // Process Components (Paper + Impressions)
    calc.componentes.forEach((comp) => {
      let papelIndex = BudgetMapper.findPapel(
        { nome: comp.papelSugerido, gramatura: comp.gramatura },
        state.base.papeis,
      );

      // Fallback: Se não encontrou, tenta achar um papel Offset como padrão ou usa o primeiro da lista
      if (papelIndex < 0 && state.base.papeis.length > 0) {
        papelIndex = state.base.papeis.findIndex((p) =>
          p.nome.toLowerCase().includes("offset"),
        );
        if (papelIndex < 0) papelIndex = 0; // Último recurso: primeiro papel da lista
      }

      if (papelIndex >= 0) {
        const basePapel = state.base.papeis[papelIndex];
        const formato = comp.formatoFolha; // "A3" ou "A4"
        const unitPrice = formato === "A3" ? basePapel.a3 : basePapel.a4;

        newPapeis.push({
          id: generateId(),
          papelIndex: papelIndex,
          tamanho: formato as any,
          qtd: comp.totalFolhas,
          unit: unitPrice,
        });
      }

      // Add Impressions
      if (comp.totalImpressoes > 0) {
        const formato = comp.formatoFolha; // "A3" ou "A4"

        if (
          calc.input.modoImpressao === "MISTO" &&
          comp.nome.toUpperCase().includes("MIOLO")
        ) {
          // No modo misto para o miolo, adicionamos uma linha de impressão para cada tipo de cor
          calc.input.coresMistas.forEach((line) => {
            // No modo misto, assumimos que o cálculo já foi feito pelo motor
            // Mas precisamos recalcular as folhas por tipo de cor aqui para a listagem
            const sheetsPerUnit = line.paginas / 4; // A5 em A4
            const totalSheets = Math.ceil(
              sheetsPerUnit * calc.input.quantidade,
            );
            const totalImps = calc.input.frenteVerso
              ? totalSheets * 2
              : totalSheets;

            if (totalImps > 0) {
              const isColor = line.tipo.startsWith("4");
              const isFrenteVerso =
                line.tipo.endsWith("/1") || line.tipo.endsWith("/4");

              let tipoStr = isColor ? "COLORIDO" : "PRETO";
              tipoStr += isFrenteVerso ? " (FRENTE E VERSO)" : " (1 lado)";

              const baseImp = state.base.impressoes.find(
                (b) => b.tipo === tipoStr && b.formato === formato,
              );

              newImpressoes.push({
                id: generateId(),
                tipo: tipoStr,
                formato: formato,
                qtd: totalImps,
                unit: baseImp ? baseImp.valor : 0,
              });
            }
          });
        } else {
          // Modo simples ou outros componentes (Capa, etc)
          const cores = calc.input.cores.toLowerCase();
          const isColor = cores.includes("4") || cores.includes("color");
          const isFrenteVerso = calc.input.frenteVerso;

          let tipoStr = isColor ? "COLORIDO" : "PRETO";
          tipoStr += isFrenteVerso ? " (FRENTE E VERSO)" : " (1 lado)";

          const baseImp = state.base.impressoes.find(
            (b) => b.tipo === tipoStr && b.formato === formato,
          );

          newImpressoes.push({
            id: generateId(),
            tipo: tipoStr,
            formato: formato,
            qtd: comp.totalImpressoes,
            unit: baseImp ? baseImp.valor : 0,
          });
        }
      }
    });

    // Process Labor
    const laborMap = new Map<string, number>();

    if (calc.tempoDesignerMin > 0)
      laborMap.set("DESIGNER GRÁFICO", calc.tempoDesignerMin);
    
    // Sempre adiciona Orçamentista com pelo menos 10 minutos
    laborMap.set("ORÇAMENTISTA GRÁFICO", Math.max(10, calc.tempoOrcamentistaMin || 10));

    // Soma todos os acabamentos + guilhotina para o operador de acabamento
    const somaAcabamentos = Object.values(calc.temposAcabamento).reduce(
      (a, b) => (a as number) + (b as number),
      0,
    ) as number;

    if (somaAcabamentos > 0) {
      laborMap.set("OPERADOR DE ACABAMENTO GRÁFICO", somaAcabamentos);
    }

    if (calc.tempoGuilhotinaMin > 0) {
      laborMap.set("OPERADOR DE GUILHOTINA", calc.tempoGuilhotinaMin);
    }

    if (calc.tempoImpressorMin > 0) {
      const prof =
        calc.input.tipoImpressao === "OFFSET"
          ? "IMPRESSOR OFFSET"
          : "IMPRESSOR DIGITAL";
      laborMap.set(prof, (laborMap.get(prof) || 0) + calc.tempoImpressorMin);
    }

    laborMap.forEach((minutos, profName) => {
      const profIndex = BudgetMapper.findProfissional(
        profName,
        state.base.maoObra,
      );
      if (profIndex >= 0) {
        const baseMo = state.base.maoObra[profIndex];
        newMaoObra.push({
          id: generateId(),
          profIndex: profIndex,
          minutos: minutos,
          minutoValor: baseMo.hora / 60,
        });
      }
    });

    // Process Materials
    calc.materiais.forEach((cMat) => {
      // Tenta encontrar o material na base
      const matIndex = state.base.materiais.findIndex(
        (m) =>
          cMat.nome.toUpperCase().includes(m.nome.toUpperCase()) ||
          m.nome.toUpperCase().includes(cMat.nome.toUpperCase()),
      );

      if (matIndex >= 0) {
        const baseMat = state.base.materiais[matIndex];
        // Tenta encontrar o tipo mais próximo
        let tipoIndex = baseMat.tipos.findIndex(
          (t) =>
            cMat.nome.toUpperCase().includes(t.nome.toUpperCase()) ||
            t.nome.toUpperCase().includes(cMat.nome.toUpperCase()),
        );
        if (tipoIndex < 0) tipoIndex = 0;

        newMateriais.push({
          id: generateId(),
          materialIndex: matIndex,
          tipoIndex: tipoIndex,
          qtd: cMat.quantidade,
          unit: baseMat.tipos[tipoIndex].valor,
        });
      }
    });

    // 3. Apply State
    setState((prev) => {
      // OFFSET RULE: Se tipo de impressão = OFFSET: → NÃO enviar NADA para: 'Impressão Digital'
      const filteredImpressoes = calc.input.tipoImpressao === "OFFSET" ? [] : newImpressoes;

      return {
        ...prev,
        info: append ? prev.info : newInfo,
        itens: {
          ...prev.itens,
          papeis: append ? [...prev.itens.papeis, ...newPapeis] : newPapeis,
          impressoes: append ? [...prev.itens.impressoes, ...filteredImpressoes] : filteredImpressoes,
          maoObra: append ? [...prev.itens.maoObra, ...newMaoObra] : newMaoObra,
          materiais: append ? [...prev.itens.materiais, ...newMateriais] : newMateriais,
        },
        producaoTecnica: calc.resumoTecnico,
        technicalForm: calc.input
      };
    });

    alert(
      `Orçamento inteligente ${append ? 'adicionado' : 'aplicado'}! Máquina: ${calc.resumoTecnico.maquina}.`,
    );
  };

  const handleSaveBudget = async () => {
    // @ts-ignore
    const calc = window.lastCalc;
    if (!calc) {
      alert("Gere um orçamento primeiro!");
      return;
    }

    const cliente = prompt("Nome do Cliente:");
    if (!cliente) return;

    setIsSaving(true);
    try {
      const currentTotals = calculateTotals(state);
      const imageDataUrl = state.imagens && state.imagens.length > 0 ? state.imagens[0].url : undefined;
      // @ts-ignore
      if (state.imagens && state.imagens.length > 1) {
        calc.extraImages = state.imagens.slice(1).map((img: any) => img.url);
      }
      await BudgetHistoryService.saveBudget(calc, cliente, imageDataUrl, currentTotals);
      alert("Orçamento salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      alert("Erro ao salvar orçamento. Verifique o console.");
    } finally {
      setIsSaving(false);
    }
  };

  // -- RENDER --

  const renderView = () => {
    if (currentView === 'DASHBOARD') {
      return <Dashboard onSelectView={setCurrentView} />;
    }

    if (currentView === 'PLACAS_SIMPLES') {
      return <PlacaSimplesCalculator onBack={() => setCurrentView('DASHBOARD')} />;
    }

    if (currentView === 'PLACAS_PLASTIFICADAS') {
      return <PlacaPlastificadaCalculator onBack={() => setCurrentView('DASHBOARD')} />;
    }

    if (currentView === 'PLACAS_VINIL') {
      return <VinilVidroCalculator onBack={() => setCurrentView('DASHBOARD')} />;
    }

    return (
      <div className="print-area font-sans text-slate-800 pb-12 print:pb-0 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-blue-900 sticky top-0 z-40 shadow-xl print:static print:shadow-none print:bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
          {/* Linha 1: Logo e Botão Principal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('DASHBOARD')}
                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors no-print"
                title="Voltar ao Menu"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              {/* Logo Logic: Tries to load image, falls back to CSS styled logo if missing */}
              {!logoError ? (
                <img
                  src="logo-digra.png"
                  onError={() => setLogoError(true)}
                  alt="Logo DIGRA"
                  className="h-16 w-16 object-contain pointer-events-none"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border-[3px] border-white flex items-center justify-center bg-blue-600 shadow-sm shrink-0">
                  <span className="text-white font-bold text-[14px] tracking-tighter">
                    DIGRA
                  </span>
                </div>
              )}

              {/* Modified Title Style */}
              <h1 className="text-3xl font-extrabold text-white tracking-wide print:text-black">
                Orçamento Gráfico
              </h1>
            </div>

            {/* Botão NOVO (Principal Destaque) */}
            <div className="flex items-center gap-1 no-print">
              <button
                type="button"
                onClick={NOVOOrcamento}
                className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 border-2 border-white/30 text-lg"
              >
                <Plus className="w-6 h-6" /> NOVO
              </button>
              <HelpIcon contentKey="NOVO_ORCAMENTO" className="text-white/60 hover:text-white" />
            </div>
          </div>

          {/* Linha 2: Barra de Ações */}
          <div className="flex flex-wrap items-center justify-between gap-4 no-print border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Valores Base (Neutro) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-11 px-6 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" /> VALORES BASE
                </button>
                <HelpIcon contentKey="VALORES_BASE" className="text-white/60 hover:text-white" />
              </div>

              {/* Histórico (Médio Destaque) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsHistoryView(true)}
                  className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" /> HISTÓRICO
                </button>
                <HelpIcon contentKey="HISTORICO" className="text-white/60 hover:text-white" />
              </div>

              {/* Imprimir (Destaque Secundário) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.print()}
                  className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> IMPRIMIR
                </button>
                <HelpIcon contentKey="IMPRIMIR" className="text-white/60 hover:text-white" />
              </div>
            </div>

            {/* Manual do Sistema (Discreto, por último) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsManualOpen(true)}
                className="h-11 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center gap-2 border border-white/20 whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4" /> Manual do Sistema
              </button>
              <HelpIcon contentKey="MANUAL" className="text-white/60 hover:text-white" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 print:mt-0 print:w-full print:max-w-full">
        {isHistoryView ? (
          <BudgetHistory 
          onBack={() => setIsHistoryView(false)}
          onEdit={(budget) => {
            try {
              const calc = JSON.parse(budget.calcSnapshot!);
              // @ts-ignore
              window.lastCalc = calc;
              setState(prev => ({
                ...prev,
                technicalForm: calc.input,
                info: {
                  ...prev.info,
                  qtTotal: calc.input.quantidade,
                  tamanhoFinal: calc.input.tamanhoFinal,
                  tec: calc.input.tipoImpressao,
                  descricao: calc.input.observacoes || '',
                },
              }));
              setIsHistoryView(false);
              alert(`Orçamento ${budget.numeroOrcamento} reaberto! Faça as alterações e salve novamente.`);
            } catch(e) {
              alert('Erro ao reabrir orçamento.');
            }
          }}
        />
        ) : (
          <>
            {/* SMART BUDGET SECTION (NEW) */}
            <section className="mb-8 no-print">
          <SmartBudgetInput
            key={resetKey}
            value={state.technicalForm!}
            onChange={(val) =>
              setState((prev) => ({ ...prev, technicalForm: val }))
            }
            onAddImages={(newImgs) => setState(prev => ({ ...prev, imagens: [...prev.imagens, ...newImgs] }))}
            onAnalysisSuccess={(newForm, append) => {
              try {
                const calc = GraphicEngine.calculate(newForm, state.base);

                // Apply Historical Learning (Module 2)
                if (calc.producaoEngine && newForm.produto) {
                  const suggestion = HistoricalLearner.suggestTime(
                    newForm,
                    state.historico_orcamentos || [],
                    calc.producaoEngine.tempo_total
                  );
                  
                  if (suggestion.average !== null) {
                    const historicalInfo = {
                      original: calc.producaoEngine.tempo_total,
                      average: suggestion.average,
                      suggested: suggestion.suggested
                    };
                    calc.producaoEngine.tempo_total = suggestion.suggested;
                    // @ts-ignore - historicalInfo property might be missing in type definition but exists in runtime
                    calc.resumoTecnico.historicalInfo = historicalInfo;
                  }
                }

                handleSmartBudgetApply(calc, append);
              } catch (error) {
                console.error("Erro ao calcular orçamento:", error);
                alert("Erro ao calcular orçamento. Verifique os dados.");
              }
            }}
            base={state.base}
          />
        </section>

        {/* Info Card */}
        <SectionCard title="Informações Iniciais" icon="📑" helpKey="INFORMACOES_INICIAIS">
          <div className="grid grid-cols-12 gap-6">
            <InputGroup label="Quantidade Total *" widthClass="col-span-3">
              <input
                type="number"
                min="1"
                value={state.info.qtTotal}
                onChange={(e) =>
                  updateInfo("qtTotal", e.target.value)
                }
                className="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </InputGroup>
            <InputGroup label="Tamanho Final *" widthClass="col-span-4">
              <input
                type="text"
                placeholder="Ex.: 210 × 297 mm (A4)"
                value={state.info.tamanhoFinal}
                onChange={(e) => updateInfo("tamanhoFinal", e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </InputGroup>
            <InputGroup
              label="Tecnologia de Impressão *"
              widthClass="col-span-5"
            >
              <div className="flex gap-3 mb-2">
                <button
                  onClick={() => updateInfo("tec", "OFFSET")}
                  className={`flex-1 py-3 rounded-xl border-2 font-extrabold transition-all ${
                    state.info.tec === "OFFSET"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]"
                      : "border-slate-200 bg-white text-slate-700 hover:shadow-md"
                  }`}
                >
                  ⚙️ OFFSET
                </button>
                <button
                  onClick={() => updateInfo("tec", "DIGITAL")}
                  className={`flex-1 py-3 rounded-xl border-2 font-extrabold transition-all ${
                    state.info.tec === "DIGITAL"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                      : "border-slate-200 bg-white text-slate-700 hover:shadow-md"
                  }`}
                >
                  🖨️ DIGITAL
                </button>
              </div>
              {state.info.tec === "OFFSET" && (
                <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-lg text-center">
                  Tecnologia Offset — acréscimo de 10% aplicado
                </div>
              )}
              {state.info.tec === "DIGITAL" && (
                <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-lg text-center">
                  Tecnologia Digital — isento dos 10%
                </div>
              )}
            </InputGroup>

            {/* Adjusted Widths: Reduced to col-span-6 to fit perfectly side-by-side */}
            <InputGroup label="Descrição do Serviço" widthClass="col-span-6">
              <textarea
                rows={3}
                value={state.info.descricao}
                onChange={(e) => updateInfo("descricao", e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              ></textarea>
            </InputGroup>
            <InputGroup label="Dados Técnicos" widthClass="col-span-6">
              <textarea
                rows={3}
                value={state.info.dadosTecnicos}
                onChange={(e) => updateInfo("dadosTecnicos", e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              ></textarea>
            </InputGroup>
            <InputGroup label="Material de Referência" widthClass="col-span-12">
              <textarea
                rows={2}
                value={state.info.materialReferencia}
                onChange={(e) => updateInfo("materialReferencia", e.target.value)}
                placeholder="Observações sobre o material de referência..."
                className="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              ></textarea>
            </InputGroup>
          </div>
        </SectionCard>

        {/* Images Card */}
        <SectionCard title="Imagens do Projeto / Material de Referência" icon="🖼️" helpKey="IMAGENS_PROJETO">
          <ProjectImages 
            images={state.imagens}
            onAddImages={(newImgs) => setState(prev => ({ ...prev, imagens: [...prev.imagens, ...newImgs] }))}
            onRemoveImage={(idx) => setState(prev => ({ ...prev, imagens: prev.imagens.filter((_, i) => i !== idx) }))}
          />
        </SectionCard>

        {/* Papeis */}
        <SectionCard title="Papéis Utilizados" icon="📄" helpKey="PAPEIS">
          <div className="mb-4 no-print">
            <button
              onClick={() =>
                addItem("papeis", {
                  id: generateId(),
                  papelIndex: "",
                  tamanho: "",
                  qtd: 0,
                  unit: 0,
                })
              }
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
              + Adicionar Papel
            </button>
          </div>
          <div className="space-y-3">
            {state.itens.papeis.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr_48px] gap-3 items-center"
              >
                <select
                  className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                  value={item.papelIndex}
                  onChange={(e) =>
                    updateItem(
                      "papeis",
                      item.id,
                      "papelIndex",
                      e.target.value === "" ? "" : parseInt(e.target.value),
                    )
                  }
                >
                  <option value="">Selecione o tipo...</option>
                  {state.base.papeis.map((p, i) => (
                    <option key={i} value={i}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                  value={item.tamanho}
                  onChange={(e) =>
                    updateItem("papeis", item.id, "tamanho", e.target.value)
                  }
                >
                  <option value="">Tamanho...</option>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Folha">Folha</option>
                  <option value="Pacote">Pacote</option>
                </select>
                <input
                  type="number"
                  placeholder="Qtd"
                  className="h-11 px-3 border border-slate-200 rounded-lg"
                  value={item.qtd || ""}
                  onChange={(e) =>
                    updateItem(
                      "papeis",
                      item.id,
                      "qtd",
                      parseFloat(e.target.value),
                    )
                  }
                />
                <div className="h-11 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 select-none">
                  {formatCurrency(item.unit)}
                </div>
                <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 select-none">
                  {formatCurrency(item.qtd * item.unit)}
                </div>
                <DeleteBtn onClick={() => removeItem("papeis", item.id)} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Materiais */}
        <SectionCard title="Materiais Utilizados" icon="🔧" helpKey="MATERIAIS">
          <div className="mb-4 no-print">
            <button
              onClick={() =>
                addItem("materiais", {
                  id: generateId(),
                  materialIndex: "",
                  tipoIndex: "",
                  qtd: 0,
                  unit: 0,
                })
              }
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
              + Adicionar Material
            </button>
          </div>
          <div className="space-y-3">
            {state.itens.materiais.map((item) => {
              const material =
                typeof item.materialIndex === "number"
                  ? state.base.materiais[item.materialIndex]
                  : null;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr_48px] gap-3 items-center"
                >
                  <select
                    className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                    value={item.materialIndex}
                    onChange={(e) => {
                      // Reset sub-selection when main changes
                      const val = e.target.value;
                      const newIndex: number | "" =
                        val === "" ? "" : parseInt(val);
                      setState((prev) => {
                        const list = prev.itens.materiais.map((m) => {
                          if (m.id !== item.id) return m;
                          const updated: ItemMaterial = {
                            ...m,
                            materialIndex: newIndex,
                            tipoIndex: "" as const,
                            unit: 0,
                          };
                          return updated;
                        });
                        return {
                          ...prev,
                          itens: { ...prev.itens, materiais: list },
                        };
                      });
                    }}
                  >
                    <option value="">Selecione material...</option>
                    {state.base.materiais.map((m, i) => (
                      <option key={i} value={i}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                    value={item.tipoIndex}
                    onChange={(e) =>
                      updateItem(
                        "materiais",
                        item.id,
                        "tipoIndex",
                        e.target.value === "" ? "" : parseInt(e.target.value),
                      )
                    }
                    disabled={!material}
                  >
                    <option value="">Selecione o tipo...</option>
                    {material?.tipos.map((t, i) => (
                      <option key={i} value={i}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qtd"
                    className="h-11 px-3 border border-slate-200 rounded-lg"
                    value={item.qtd || ""}
                    onChange={(e) =>
                      updateItem(
                        "materiais",
                        item.id,
                        "qtd",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                  <div className="h-11 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 select-none">
                    {formatCurrency(item.unit)}
                  </div>
                  <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 select-none">
                    {formatCurrency(item.qtd * item.unit)}
                  </div>
                  <DeleteBtn onClick={() => removeItem("materiais", item.id)} />
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Impressão Digital */}
        {state.info.tec !== "OFFSET" && (
          <SectionCard title="Impressão Digital" icon="🖨️" helpKey="IMPRESSAO_DIGITAL">
            <div className="mb-4 no-print">
              <button
                onClick={() =>
                  addItem("impressoes", {
                    id: generateId(),
                    tipo: "",
                    formato: "",
                    qtd: 0,
                    unit: 0,
                  })
                }
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
              >
                + Adicionar Impressão
              </button>
            </div>
            <div className="space-y-3">
              {state.itens.impressoes.map((item) => {
                const uniqueTypes = Array.from(
                  new Set(state.base.impressoes.map((i) => i.tipo)),
                );
                const availableFormats = state.base.impressoes
                  .filter((i) => i.tipo === item.tipo)
                  .map((i) => i.formato);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr_48px] gap-3 items-center"
                  >
                    <select
                      className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                      value={item.tipo}
                      onChange={(e) =>
                        updateItem("impressoes", item.id, "tipo", e.target.value)
                      }
                    >
                      <option value="">Selecione o tipo...</option>
                      {uniqueTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                      value={item.formato}
                      onChange={(e) =>
                        updateItem(
                          "impressoes",
                          item.id,
                          "formato",
                          e.target.value,
                        )
                      }
                      disabled={!item.tipo}
                    >
                      <option value="">Formato...</option>
                      {Array.from(new Set(availableFormats)).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qtd"
                      className="h-11 px-3 border border-slate-200 rounded-lg"
                      value={item.qtd || ""}
                      onChange={(e) =>
                        updateItem(
                          "impressoes",
                          item.id,
                          "qtd",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                    <div className="h-11 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 select-none">
                      {formatCurrency(item.unit)}
                    </div>
                    <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 select-none">
                      {formatCurrency(item.qtd * item.unit)}
                    </div>
                    <DeleteBtn
                      onClick={() => removeItem("impressoes", item.id)}
                    />
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Mao de Obra */}
        <SectionCard title="Mão de Obra" icon="👷" helpKey="MAO_OBRA">
          <div className="mb-4 no-print">
            <button
              onClick={() =>
                addItem("maoObra", {
                  id: generateId(),
                  profIndex: "",
                  minutes: 0,
                  minutoValor: 0,
                })
              }
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
              + Adicionar Profissional
            </button>
          </div>
          <div className="space-y-3">
            {state.itens.maoObra.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr_48px] gap-3 items-center"
              >
                <select
                  className="h-11 px-3 border border-slate-200 rounded-lg bg-white"
                  value={item.profIndex}
                  onChange={(e) =>
                    updateItem(
                      "maoObra",
                      item.id,
                      "profIndex",
                      e.target.value === "" ? "" : parseInt(e.target.value),
                    )
                  }
                >
                  <option value="">Profissional...</option>
                  {state.base.maoObra.map((o, i) => (
                    <option key={i} value={i}>
                      {o.profissional}
                    </option>
                  ))}
                </select>
                <div className="invisible">—</div>
                <input
                  type="number"
                  placeholder="Minutos"
                  className="h-11 px-3 border border-slate-200 rounded-lg"
                  value={item.minutos || ""}
                  onChange={(e) =>
                    updateItem(
                      "maoObra",
                      item.id,
                      "minutos",
                      parseFloat(e.target.value),
                    )
                  }
                />
                <div className="h-11 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 select-none">
                  {formatCurrency(item.minutoValor)} / min
                </div>
                <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 select-none">
                  {formatCurrency(item.minutos * item.minutoValor)}
                </div>
                <DeleteBtn onClick={() => removeItem("maoObra", item.id)} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Financial Summary */}
        <section className="mb-8 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-visible print:overflow-visible print:shadow-none print:rounded-none print:break-inside-auto">
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between font-black text-lg uppercase tracking-tight">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-blue-400" />
              Resumo Financeiro
            </div>
            <HelpIcon contentKey="RESUMO_FINANCEIRO" className="text-white/40" />
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4">
              {[
                {
                  l: "Papéis",
                  v: totals.totalPapeis,
                  icon: <FileText className="w-4 h-4" />,
                  color: "blue",
                },
                {
                  l: "Materiais",
                  v: totals.totalMateriais,
                  icon: <Layers className="w-4 h-4" />,
                  color: "indigo",
                },
                {
                  l: "Impressão",
                  v: totals.totalImpressoes,
                  icon: <Printer className="w-4 h-4" />,
                  color: "amber",
                },
                {
                  l: "Mão de Obra",
                  v: totals.totalMaoObra,
                  icon: <Clock className="w-4 h-4" />,
                  color: "emerald",
                },
                {
                  l: "Acréscimo 10%",
                  v: totals.acrescimo,
                  icon: <Plus className="w-4 h-4" />,
                  color: "rose",
                },
                {
                  l: "TOTAL GERAL",
                  v: totals.totalGeral,
                  highlight: true,
                  icon: <Calculator className="w-4 h-4" />,
                  color: "blue",
                },
                {
                  l: "Valor Unitário",
                  v: totals.valorUnitario,
                  highlight: true,
                  icon: <Info className="w-4 h-4" />,
                  color: "blue",
                },
                {
                  l: "Tecnologia",
                  v: state.info.tec,
                  text: true,
                  icon: <Settings className="w-4 h-4" />,
                  color: "slate",
                },
              ].map((k, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 transition-all hover:bg-white/10 group"
                >
                  <div className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3 flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                    {k.icon}
                    {k.l}
                  </div>
                  <div
                    className={`text-2xl ${k.highlight ? "font-black text-white" : "font-bold text-slate-100"}`}
                  >
                    {k.text ? k.v : formatCurrency(k.v as number)}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <span className="relative z-10 block font-black text-blue-100 text-[10px] uppercase tracking-[0.4em] mb-3">
                Valor Unitário Final
              </span>
              <div className="relative z-10 font-black text-6xl text-white drop-shadow-2xl">
                {formatCurrency(totals.valorUnitario)}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border-t border-white/10 px-8 py-6 flex flex-col lg:flex-row justify-between items-center gap-6 print:bg-transparent print:border-black print:text-black">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-blue-300 text-[10px] uppercase font-black tracking-widest mb-1">Total do Projeto</span>
                <span className="text-3xl font-black text-white">
                  {formatCurrency(totals.totalGeral)}
                </span>
              </div>
              <div className="w-px h-10 bg-white/10 hidden lg:block"></div>
              <div className="flex flex-col">
                <span className="text-blue-300 text-[10px] uppercase font-black tracking-widest mb-1">Custo Unitário</span>
                <b className="text-3xl font-black text-white">
                  {formatCurrency(totals.valorUnitario)}
                </b>
              </div>
            </div>

            <div className="flex gap-4 no-print w-full lg:w-auto">
              <button
                onClick={handleSaveBudget}
                disabled={isSaving}
                className="flex-1 lg:flex-none h-14 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 border-b-4 border-blue-800"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Save className="w-6 h-6" />
                )}
                SALVAR ORÇAMENTO
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 lg:flex-none h-14 px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 border-b-4 border-slate-900"
              >
                <Printer className="w-5 h-5" />
                IMPRIMIR
              </button>
            </div>
          </div>
        </section>

        {/* Aba Técnica: Máquinas Utilizadas */}
        {state.producaoTecnica && (
          <section className="mb-12 bg-white rounded-2xl shadow-xl p-8 border border-slate-200 relative overflow-hidden print:shadow-none print:border-slate-300">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Settings className="w-48 h-48 text-slate-900" />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    Máquinas Utilizadas
                  </h3>
                  <HelpIcon contentKey="MAQUINAS" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Ficha Técnica de Produção
                  </p>
                  <HelpIcon contentKey="FICHA_TECNICA" />
                </div>
              </div>
              <button
                onClick={() =>
                  setState((prev) => ({ ...prev, producaoTecnica: undefined }))
                }
                className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-widest transition-colors flex items-center gap-2 no-print"
              >
                <Trash2 className="w-3 h-3" />
                Limpar Ficha
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 relative z-10">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Tecnologia
                </span>
                <p className="text-sm text-blue-600 font-black">
                  {state.producaoTecnica.tipoProducao}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Equipamento
                </span>
                <p className="text-sm text-slate-800 font-black">
                  {state.producaoTecnica.maquina}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Velocidade
                </span>
                <p className="text-sm text-slate-600 font-bold">
                  {state.producaoTecnica.velocidadeAplicada}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Quantidade
                </span>
                <p className="text-sm text-slate-600 font-bold">
                  {state.producaoTecnica.quantidadeProduzida} un
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Passadas
                </span>
                <p className="text-sm text-slate-600 font-bold">
                  {state.producaoTecnica.passadas}
                </p>
              </div>
              {state.producaoTecnica.tipoProducao === "OFFSET" && (
                <div className="space-y-2">
                  <span className="text-[10px] text-emerald-600 uppercase font-black tracking-[0.2em] block">
                    Chapas
                  </span>
                  <p className="text-sm text-emerald-600 font-black">
                    {state.producaoTecnica.chapas}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Tempo Impressão
                </span>
                <p className="text-sm text-slate-600 font-bold">
                  {state.producaoTecnica.tempoImpressaoMin} min
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                  Tempo Operadores
                </span>
                <p className="text-sm text-slate-600 font-bold">
                  {state.producaoTecnica.tempoOperadoresMin} min
                </p>
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <span className="text-[10px] text-blue-600 uppercase font-black tracking-[0.2em] block">
                  Tempo Total
                </span>
                <p className="text-sm text-blue-700 font-black">
                  {state.producaoTecnica.tempoTotalMin} min
                </p>
              </div>

              {state.producaoTecnica.detalhesCorte && (
                <div className="space-y-2 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                    Corte / Guilhotina
                  </span>
                  <p className="text-xs text-slate-600 font-medium">
                    {state.producaoTecnica.detalhesCorte}
                  </p>
                </div>
              )}

              {state.producaoTecnica.temposAcabamento && Object.keys(state.producaoTecnica.temposAcabamento).length > 0 && (
                <div className="space-y-2 col-span-2 md:col-span-3">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">
                    Tempos de Acabamento
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(state.producaoTecnica.temposAcabamento).map(([proc, min]) => (
                      <div key={proc} className="flex justify-between text-xs border-b border-slate-100 pb-1">
                        <span className="text-slate-500 capitalize">{proc}:</span>
                        <span className="font-bold text-slate-700">{min} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MOTOR DE PRODUÇÃO (NEW) */}
            {state.producaoTecnica.producaoEngine && (
              <div className="mt-12 pt-8 border-t border-slate-100 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">
                    Planejamento de Produção
                  </h4>
                  <HelpIcon contentKey="PLANEJAMENTO" />
                  {state.producaoTecnica.historicalInfo && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
                      <History className="w-3 h-3" />
                      Ajustado por Histórico
                    </div>
                  )}
                </div>

                {state.producaoTecnica.historicalInfo && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs font-medium">
                      O tempo total foi ajustado de <span className="font-bold line-through opacity-50">{state.producaoTecnica.historicalInfo.original} min</span> para <span className="font-bold">{state.producaoTecnica.historicalInfo.suggested} min</span> com base na média histórica de <span className="font-bold">{state.producaoTecnica.historicalInfo.average} min</span> para este tipo de produto e quantidade.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Preparação', time: state.producaoTecnica.producaoEngine.tempo_preparacao, color: 'blue' },
                    { label: 'Impressão', time: state.producaoTecnica.producaoEngine.tempo_impressao, color: 'indigo' },
                    { label: 'Corte', time: state.producaoTecnica.producaoEngine.tempo_corte, color: 'amber' },
                    { label: 'Acabamento', time: state.producaoTecnica.producaoEngine.tempo_acabamento, color: 'emerald' },
                    
                  ].map((block) => (
                    <div key={block.label} className={`bg-${block.color}-50/50 border border-${block.color}-100 rounded-xl p-4`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-${block.color}-600 mb-3 block`}>
                        Bloco: {block.label}
                      </span>
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1">Tempo Total</span>
                          <span className="text-xl font-black text-slate-800">{block.time} <small className="text-[10px] font-bold text-slate-400">min</small></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-1 gap-4">
  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 block mb-2">Tempo Total Produção</span>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-black">{state.producaoTecnica.producaoEngine.tempo_total}</span>
      <span className="text-sm font-bold text-blue-300 uppercase">Minutos</span>
    </div>
  </div>
</div>
            
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center gap-3">
              <Info className="w-4 h-4 text-slate-600" />
              <p className="text-[10px] text-slate-500 font-medium italic">
                Esta ficha técnica é gerada automaticamente pela IA e serve como
                guia de produção interna.
              </p>
            </div>
          </section>
        )}
      </>
    )}
  </main>

      <footer className="text-center text-slate-500 font-medium py-6">
        ⚡ Alexandre | DIGRA Apps
      </footer>
    </div>
    );
  };

  if (!user) {
    return <LoginGate onLogin={(u) => setUser(u)} />;
  }

  return (
    <>
      <ErrorBoundary>
        {renderView()}
      </ErrorBoundary>
      
      {/* Helper components moved outside renderView to be globally available */}
      <SystemManual isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      <BaseDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        baseData={state.base}
        onSave={(newData) => {
          const oldPapeis = state.base.papeis;
          const newPapeis = newData.papeis;

          setState((prev) => {
            const updatedItensPapeis = prev.itens.papeis.map((item) => {
              if (item.papelIndex === "" || item.papelIndex >= oldPapeis.length) return item;
              const paperName = oldPapeis[item.papelIndex].nome;
              const newIndex = newPapeis.findIndex((p) => p.nome === paperName);
              return { ...item, papelIndex: (newIndex !== -1 ? newIndex : "") as number | "" };
            });

            return {
              ...prev,
              base: newData,
              itens: { ...prev.itens, papeis: updatedItensPapeis },
            };
          });
          setIsModalOpen(false);
        }}
      />
      
      {/* Global AI Assistant - hidden only on Dashboard if desired, but here we keep it simple */}
      <AIHelpAssistant />
    </>
  );
}

export default App;
