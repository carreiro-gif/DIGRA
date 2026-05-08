import React, { useState, useEffect, useMemo } from 'react';
import { BudgetInterpreter, OrderBrain } from '../services/SmartBudgetService';
import { ProductionInput, ProductionPaper } from '../types/SmartBudgetTypes';
import { BaseData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  UserCheck, 
  Info, 
  Layers, 
  Printer, 
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Palette,
  Calculator,
  AlertCircle,
  Check,
  Search,
  MessageSquare
} from 'lucide-react';
import { ColorOption, MixedColorLine } from '../types/SmartBudgetTypes';
import { BookletCalculator } from './BookletCalculator';
import { PDFBookletAnalyzer, PDFAnalysis } from './PDFBookletAnalyzer';

import { HelpIcon } from './HelpSystem';
import { HELP_CONTENT } from '../constants/HelpContent';

const COLOR_OPTIONS: ColorOption[] = ['1/0', '1/1', '4/0', '4/1', '4/4'];

const ESSENTIAL_FIELDS = [
  { id: 'produto', label: 'Produto', patterns: [/cartão/i, /panfleto/i, /flyer/i, /cartaz/i, /pasta/i, /credencial/i, /livro/i, /cartilha/i, /adesivo/i, /banner/i, /folder/i, /envelope/i, /talão/i, /bloco/i, /receituário/i, /tag/i, /solapa/i] },
  { id: 'quantidade', label: 'Quantidade', patterns: [/\d+\s*(un|unid|unidades|mil|cento|ex|exemplares)/i, /\b\d{1,6}\b(?!\s*x)/i, /\d+\s+x/i] },
  { id: 'tamanho', label: 'Tamanho', patterns: [/A\d/i, /\d+\s*x\s*\d+/i, /9x5/i, /10x15/i, /format/i, /tamanho/i, /medida/i] },
  { id: 'impressao', label: 'Impressão', patterns: [/digital/i, /offset/i, /laser/i, /jato/i, /tecnologia/i] },
  { id: 'cores', label: 'Cores', patterns: [/[14]\/[014]/, /colorido/i, /preto/i, /p&b/i, /4x0/i, /4x4/i, /1x0/i, /1x1/i, /cores/i] },
  { id: 'papel', label: 'Papel', patterns: [/couch[eé]/i, /offset/i, /sulfite/i, /duplex/i, /triplex/i, /adesivo/i, /vinil/i, /reciclado/i, /300g/i, /250g/i, /150g/i, /120g/i, /90g/i, /75g/i, /gramatura/i] },
];

const PLACEHOLDER_EXAMPLES = `Exemplos de como descrever seu trabalho:
- "Preciso de 1000 cartões de visita, 9x5cm, couchê 300g, 4x4 cores, com verniz total frente."
- "Orçamento para 500 panfletos A5, papel offset 90g, colorido apenas frente (4x0)."
- "Livro com 100 páginas, capa em couchê 250g colorido e miolo em offset 75g preto e branco, 50 unidades, tamanho 14x21cm."
- "10 banners em lona 440g, tamanho 60x90cm, com bastão e corda."`;

interface SmartBudgetInputProps {
  value: ProductionInput;
  onChange: (value: ProductionInput) => void;
  onAnalysisSuccess?: (form: ProductionInput, append?: boolean) => void;
  onAddImages?: (newImages: { url: string; label?: string }[]) => void;
  base: BaseData;
}

export const SmartBudgetInput: React.FC<SmartBudgetInputProps> = ({ value: form, onChange: setForm, onAnalysisSuccess, onAddImages, base }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mascotState, setMascotState] = useState<'sorrindo' | 'pensando' | 'apontando'>('sorrindo');
  const [mascotMessage, setMascotMessage] = useState<string>('Olá! Descreva o trabalho e eu te ajudo a preencher tudo.');
  const [analysisResult, setAnalysisResult] = useState<ProductionInput | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState<{
    analysis: PDFAnalysis;
    asDraft: boolean;
  } | null>(null);
  const [bookletDetails, setBookletDetails] = useState<{
    analysis: PDFAnalysis;
    capa: { folhas: number; impressoes: number; papel: string; processo: string };
    miolo: { folhas: number; impressoes: number; papel: string; processo: string; chapas: number };
    asDraft: boolean;
    cadernos?: any[];
    exibirEsquemaOrcamento?: boolean;
  } | null>(null);

  const engineResult = useMemo(() => {
    try {
      return GraphicEngine.calculate(form, base);
    } catch (e) {
      return null;
    }
  }, [form, base]);

  const updateAnalysisResult = (field: keyof ProductionInput, value: any) => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      [field]: value
    });
  };

  const updateAnalysisPapel = (index: number, field: keyof ProductionPaper, value: any) => {
    if (!analysisResult) return;
    const newPapeis = [...analysisResult.papeis];
    newPapeis[index] = { ...newPapeis[index], [field]: value };
    setAnalysisResult({
      ...analysisResult,
      papeis: newPapeis
    });
  };
  
  // Checklist and Completeness logic
  const checklistStatus = useMemo(() => {
    return ESSENTIAL_FIELDS.map(field => ({
      ...field,
      found: field.patterns.some(pattern => pattern.test(inputText))
    }));
  }, [inputText]);

  const completeness = useMemo(() => {
    const foundCount = checklistStatus.filter(f => f.found).length;
    return Math.round((foundCount / ESSENTIAL_FIELDS.length) * 100);
  }, [checklistStatus]);

  useEffect(() => {
    if (completeness === 0 && inputText.length > 0) {
      setMascotMessage('Estou ouvindo... continue descrevendo os detalhes!');
    } else if (completeness > 0 && completeness < 50) {
      setMascotMessage('Legal! Já identifiquei algumas coisas. Falta pouco!');
    } else if (completeness >= 50 && completeness < 100) {
      setMascotMessage('Quase lá! Se colocar o papel e as cores fica perfeito.');
    } else if (completeness === 100) {
      setMascotMessage('Incrível! Tenho tudo o que preciso para um orçamento preciso.');
      setMascotState('sorrindo');
    }
  }, [completeness]);

  const handleApplyPDF = (analysis: PDFAnalysis, asDraft: boolean) => {
    // Check for conflict if not draft
    const hasExistingData = form.produto || form.quantidade > 0;
    if (!asDraft && hasExistingData && !showConflictModal) {
      setShowConflictModal({ analysis, asDraft });
      return;
    }

    const isBooklet = analysis.isBooklet || 
                      analysis.produtoSugerido.toLowerCase().includes('cartilha') || 
                      analysis.produtoSugerido.toLowerCase().includes('revista');

    if (isBooklet) {
      // FASE 3: Fluxo de Cartilha (Integrado com Analisador)
      const qtd = form.quantidade || 1;
      
      // Use pre-calculated data if available, otherwise fallback to basic logic
      const mioloSheets = analysis.miolo ? analysis.miolo.folhas * qtd : Math.ceil(analysis.paginasMiolo / (analysis.tamanhoSugerido.includes('A5') ? 8 : 4)) * qtd;
      const capaSheets = analysis.capa ? analysis.capa.folhas * qtd : Math.ceil(qtd / (analysis.tamanhoSugerido.includes('A5') ? 2 : 1));

      const details = {
        analysis,
        asDraft,
        capa: {
          folhas: analysis.capa?.folhas || Math.ceil(1 / (analysis.tamanhoSugerido.includes('A5') ? 2 : 1)),
          impressoes: analysis.capa?.impressoes || (Math.ceil(1 / (analysis.tamanhoSugerido.includes('A5') ? 2 : 1)) * 2),
          papel: analysis.capa?.papel || 'Cartolina Branca 180g',
          processo: 'Digital'
        },
        miolo: {
          folhas: analysis.miolo?.folhas || Math.ceil(analysis.paginasMiolo / (analysis.tamanhoSugerido.includes('A5') ? 8 : 4)),
          impressoes: analysis.miolo?.impressoes || (Math.ceil(analysis.paginasMiolo / (analysis.tamanhoSugerido.includes('A5') ? 8 : 4)) * 2),
          papel: analysis.miolo?.papel || 'Offset 75g',
          processo: 'Offset',
          chapas: (analysis.miolo?.folhas || Math.ceil(analysis.paginasMiolo / (analysis.tamanhoSugerido.includes('A5') ? 8 : 4))) * 2 * (form.cores === '4/4' ? 4 : 1)
        },
        cadernos: analysis.cadernos,
        adjustedPages: analysis.adjustedPages,
        tamanhoImpressao: analysis.tamanhoImpressao,
        exibirEsquemaOrcamento: true
      };

      setBookletDetails(details);

      // Add thumbnail to images if present
      if (analysis.thumbnail && onAddImages) {
        onAddImages([{ url: analysis.thumbnail, label: 'Prévia automática do PDF' }]);
      }

      if (!asDraft) {
        setForm({
          ...form,
          produto: analysis.produtoSugerido,
          tamanhoFinal: analysis.tamanhoSugerido,
          frenteVerso: true,
          cores: analysis.coresSugeridas as ColorOption,
          tipoImpressao: analysis.impressaoSugerida.toUpperCase() as 'DIGITAL' | 'OFFSET',
          papeis: [
            { nome: analysis.capa?.papel || 'Cartolina Branca 180g', gramatura: 180, compraEm: 'Folha' as const, descricao: 'Capa' },
            { nome: analysis.miolo?.papel || 'Offset 75g', gramatura: 75, compraEm: 'Folha' as const, descricao: 'Miolo' }
          ]
        });
        setMascotMessage(`Cartilha aplicada! Estrutura de Capa (${analysis.paginasCapa}p) e Miolo (${analysis.paginasMiolo}p) configurada.`);
      }
    } else {
      // FASE 5: Fluxo de Produtos Simples
      
      // Add thumbnail to images if present
      if (analysis.thumbnail && onAddImages) {
        onAddImages([{ url: analysis.thumbnail, label: 'Prévia automática do PDF' }]);
      }

      if (!asDraft) {
        setForm({
          ...form,
          produto: analysis.produtoSugerido,
          tamanhoFinal: analysis.tamanhoSugerido,
          frenteVerso: analysis.estruturaSugerida === 'Frente e Verso',
          cores: analysis.coresSugeridas as ColorOption,
          tipoImpressao: analysis.impressaoSugerida.toUpperCase() as 'DIGITAL' | 'OFFSET',
          papeis: [
            { nome: analysis.papelCapa || 'Couchê 150g', gramatura: 150, compraEm: 'Folha' as const, descricao: 'Material' }
          ]
        });
        setMascotMessage(`Dados aplicados para ${analysis.produtoSugerido}!`);
      } else {
        // Aplicar como rascunho (Adicionar como novo item informativo)
        setMascotMessage(`Análise de ${analysis.produtoSugerido} salva como rascunho.`);
      }
    }

    if (asDraft) {
      // Lógica de rascunho: podemos salvar em um estado separado ou apenas mostrar no painel
      // Por enquanto, o painel de bookletDetails já serve como rascunho visual se asDraft for true
      if (!isBooklet) {
        setBookletDetails({
          analysis,
          asDraft: true,
          capa: { folhas: 0, impressoes: 0, papel: 'Sugerido', processo: analysis.impressaoSugerida },
          miolo: { folhas: 0, impressoes: 0, papel: 'Sugerido', processo: analysis.impressaoSugerida, chapas: 0 }
        });
      }
    }
  };

  const handleApplyBooklet = ({ calcForm, result }: { calcForm: any, result: any }) => {
    // Map BookletCalculator results to SmartBudgetInput form
    const newForm: ProductionInput = {
      ...form,
      produto: form.produto || 'Cartilha / Revista',
      quantidade: calcForm.quantidade,
      tamanhoFinal: calcForm.tamanho,
      paginas: calcForm.paginas,
      // We can also set default papers if they are not set
      papeis: form.papeis.length > 0 ? form.papeis : [
        { nome: calcForm.papelCapa, gramatura: 180, compraEm: 'Folha' as const, descricao: 'Capa' },
        { nome: calcForm.papelMiolo, gramatura: 75, compraEm: 'Folha' as const, descricao: 'Miolo' }
      ]
    };

    setForm(newForm);

    // Update bookletDetails for visual feedback in the UI
    const mockAnalysis: PDFAnalysis = {
      paginas: calcForm.paginas,
      width: calcForm.tamanho.includes('A5') ? 148 : 210,
      height: calcForm.tamanho.includes('A5') ? 210 : 297,
      orientacao: 'Retrato',
      tamanhoSugerido: calcForm.tamanho,
      paginasCapa: 4,
      paginasMiolo: calcForm.paginas - 4,
      papelCapa: calcForm.papelCapa,
      papelMiolo: calcForm.papelMiolo,
      produtoSugerido: newForm.produto,
      coresSugeridas: form.cores,
      estruturaSugerida: 'Multipáginas',
      impressaoSugerida: form.tipoImpressao,
      thumbnail: undefined
    };

    setBookletDetails({
      analysis: mockAnalysis,
      asDraft: false,
      capa: {
        folhas: result.capa.folhas,
        impressoes: result.capa.impressoes,
        papel: result.capa.papel,
        processo: result.capa.tipo
      },
      miolo: {
        folhas: result.miolo.folhas,
        impressoes: result.miolo.impressoes,
        papel: result.miolo.papel,
        processo: result.miolo.tipo,
        chapas: 0 
      },
      cadernos: result.cadernos,
      exibirEsquemaOrcamento: calcForm.exibirEsquemaOrcamento
    });

    setMascotMessage(`Cálculo de cartilha aplicado! ${calcForm.paginas} páginas, ${calcForm.quantidade} unidades.`);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setMascotState('pensando');
    setMascotMessage('Deixa eu analisar isso com cuidado...');
    setIsAnalyzing(true);
    
    // 1. Primeiro passamos pelo "Cérebro" de regras (Motor de Interpretação)
    const brainResult = OrderBrain.motorInterpretacaoPedido(inputText, base);
    
    // Safety timeout to prevent infinite loading if the AI call hangs
    const timeoutId = setTimeout(() => {
      setIsAnalyzing(false);
      setMascotState('sorrindo');
      setMascotMessage('Ops, demorei demais. Tente clicar novamente!');
      console.warn("AI Analysis timed out");
    }, 45000); // 45 seconds timeout

    try {
      // 2. Chamamos a IA para refinar e preencher o resto
      const result = await BudgetInterpreter.parseText(inputText);
      clearTimeout(timeoutId);
      
      // Mesclamos os resultados do Motor com os da IA (IA tem prioridade para detalhes complexos, mas Motor é mais determinístico para o básico)
      const mergedResult: ProductionInput = {
        ...result,
        produto: brainResult.produto || result.produto,
        quantidade: brainResult.quantidade || result.quantidade,
        tamanhoFinal: brainResult.tamanho || result.tamanhoFinal,
        cores: brainResult.cores || result.cores,
        tipoImpressao: brainResult.tipoImpressao || result.tipoImpressao
      };

      // Se o motor encontrou um papel específico por gramatura, usamos ele
      if (brainResult.papel && (!result.papeis || result.papeis.length === 0)) {
        mergedResult.papeis = [{
          nome: brainResult.papel,
          gramatura: brainResult.gramatura,
          compraEm: 'Folha',
          descricao: 'Papel Identificado'
        }];
      }

      setAnalysisResult(mergedResult);
      setShowConfirmation(true);
      setMascotState('apontando');
      setMascotMessage('Encontrei esses dados! Estão corretos?');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("AI Analysis Error:", error);
      
      // Fallback para o resultado do Motor se a IA falhar
      if (brainResult.produto || brainResult.quantidade) {
        const fallbackResult: ProductionInput = {
          ...form,
          produto: brainResult.produto || "",
          quantidade: brainResult.quantidade || 0,
          tamanhoFinal: brainResult.tamanho || "",
          cores: brainResult.cores || "4/0",
          tipoImpressao: brainResult.tipoImpressao || "DIGITAL",
          papeis: brainResult.papel ? [{
            nome: brainResult.papel,
            gramatura: brainResult.gramatura,
            compraEm: 'Folha',
            descricao: 'Papel Identificado'
          }] : []
        };
        setAnalysisResult(fallbackResult);
        setShowConfirmation(true);
        setMascotState('apontando');
        setMascotMessage('A IA falhou, mas consegui identificar o básico!');
      } else {
        setMascotState('sorrindo');
        setMascotMessage('Tive um probleminha técnico. Pode tentar de novo?');
        alert("Erro ao analisar orçamento. Verifique sua conexão ou tente novamente.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmAnalysis = () => {
    if (!analysisResult) return;
    
    const newForm = {
      ...form,
      ...analysisResult,
      papeis: (analysisResult.papeis && analysisResult.papeis.length) ? analysisResult.papeis : form.papeis,
      coresMistas: analysisResult.coresMistas || form.coresMistas || []
    };
    
    setForm(newForm);
    setShowConfirmation(false);
    setAnalysisResult(null);
    setMascotState('sorrindo');
    setMascotMessage('Prontinho! Tudo preenchido para você.');
    
    if (onAnalysisSuccess) {
      onAnalysisSuccess(newForm, appendMode);
    }
  };

  // Mascot Animation Variants
  const mascotVariants = {
    sorrindo: {
      y: [0, -4, 0],
      transition: { duration: 3, repeat: Infinity }
    },
    pensando: {
      scale: [1, 1.04, 1],
      opacity: [1, 0.7, 1],
      transition: { duration: 1.5, repeat: Infinity }
    },
    apontando: {
      y: [0, -8, 0],
      transition: { duration: 0.4, ease: "easeOut" as const }
    }
  };

  // Live Preview Calculation
  const [previewTotals, setPreviewTotals] = useState<{ materiais: number, maoObra: number, total: number } | null>(null);

  useEffect(() => {
    try {
      const calc = GraphicEngine.calculate(form, base);
      // We need to estimate costs. The GraphicEngine calculates production data, 
      // but the actual currency calculation might be in utils.ts or App.tsx.
      // Let's check App.tsx's calculateTotals.
      // For now, let's just show the production times or a simplified version if possible.
      // Actually, let's look at App.tsx to see how it calculates money.
    } catch (e) {}
  }, [form, base]);

  const updateForm = (field: keyof ProductionInput, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const updatePapel = (index: number, field: keyof ProductionPaper, value: any) => {
    const newPapeis = [...form.papeis];
    newPapeis[index] = { ...newPapeis[index], [field]: value };
    
    if (field === 'nome') {
      const match = value.match(/(\d+)\s*g/i);
      if (match) {
        newPapeis[index].gramatura = parseInt(match[1]);
      }
    }
    
    setForm({ ...form, papeis: newPapeis });
  };

  const addPapel = () => {
    setForm({
      ...form,
      papeis: [
        ...form.papeis,
        { nome: (base.papeis || [])[0]?.nome || '', gramatura: 0, compraEm: 'Folha', descricao: 'Outro Papel' }
      ]
    });
  };

  const removePapel = (index: number) => {
    if (form.papeis.length <= 1) return;
    setForm({
      ...form,
      papeis: form.papeis.filter((_, i) => i !== index)
    });
  };

  const updateAcabamento = (field: keyof ProductionInput['acabamentos'], value: boolean) => {
    setForm({ ...form, acabamentos: { ...form.acabamentos, [field]: value } });
  };

  const updateMaterial = (field: keyof ProductionInput['materiais'], value: any) => {
    setForm({ ...form, materiais: { ...form.materiais, [field]: value } });
  };

  const addMixedColorLine = () => {
    setForm({
      ...form,
      coresMistas: [...form.coresMistas, { tipo: '1/0', paginas: 0 }]
    });
  };

  const updateMixedColorLine = (index: number, field: keyof MixedColorLine, value: any) => {
    const newLines = [...form.coresMistas];
    newLines[index] = { ...newLines[index], [field]: value };
    setForm({ ...form, coresMistas: newLines });
  };

  const removeMixedColorLine = (index: number) => {
    setForm({
      ...form,
      coresMistas: form.coresMistas.filter((_, i) => i !== index)
    });
  };

  // Ajuste 2 & 3: Defaults para PASTA e CREDENCIAIS
  useEffect(() => {
    if (!form.produto) return;
    const prod = form.produto.toUpperCase();
    
    if (prod.includes('PASTA')) {
      // Ajuste 2: Pasta
      if (form.tamanhoFinal !== '47 x 32' && form.tamanhoFinal !== '47x32') {
        updateForm('tamanhoFinal', '47 x 32');
      }
      if (!form.acabamentos.vinco) {
        updateAcabamento('vinco', true);
      }
      if (!form.materiais.bolsaPasta) {
        updateMaterial('bolsaPasta', true);
      }
    } else if (prod.includes('CREDENCIA')) {
      // Ajuste 3: Credenciais
      if (form.tamanhoFinal !== '10,5 x 14,5' && form.tamanhoFinal !== '10.5x14.5') {
        updateForm('tamanhoFinal', '10,5 x 14,5');
      }
      if (!form.acabamentos.plastificacao) {
        updateAcabamento('plastificacao', true);
      }
      if (!form.materiais.bobinaPolietileno) {
        updateMaterial('bobinaPolietileno', true);
      }
    }
  }, [form.produto]);

  // Ajuste 4: Sincronização automática entre Acabamentos e Materiais
  useEffect(() => {
    const newMateriais = { ...form.materiais };
    let changed = false;

    if (form.acabamentos.espiral && !newMateriais.espiral) {
      newMateriais.espiral = true;
      changed = true;
    }
    if (form.acabamentos.plastificacao && !newMateriais.bobinaPolietileno) {
      newMateriais.bobinaPolietileno = true;
      changed = true;
    }
    if (form.acabamentos.vinco && !newMateriais.laserFilme) {
      // Laser Filme automático removido conforme solicitado
      // newMateriais.laserFilme = true;
      // if (!newMateriais.laserFilmeQtd) newMateriais.laserFilmeQtd = 1;
      // changed = true;
    }

    if (changed) {
      setForm({ ...form, materiais: newMateriais });
    }
  }, [form.acabamentos]);

  if (!form) return null;

  return (
    <div className="space-y-6">
      <BookletCalculator 
        base={base} 
        isOpen={isCalcOpen} 
        onClose={() => setIsCalcOpen(false)} 
        onApply={handleApplyBooklet}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Assistente Inteligente - 8 Colunas */}
        <div className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Assistente Inteligente</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[11px] font-black uppercase tracking-wider">
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                        IA Ativa
                      </div>
                      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Preenchimento Automático</span>
                      <HelpIcon contentKey="ASSISTENTE" />
                    </div>
                  </div>
                </div>
                
                {/* Mascot & Message */}
                <div className="hidden sm:flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm max-w-[240px]">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-600 font-bold leading-tight italic">
                      "{mascotMessage}"
                    </p>
                  </div>
                  <div className="w-10 h-10 relative shrink-0">
                    <motion.img 
                      key={mascotState}
                      variants={mascotVariants}
                      animate={mascotState}
                      src={`/mascote-${mascotState}.png`} 
                      alt="Mascote" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none h-40 text-sm shadow-inner font-medium"
                    placeholder={PLACEHOLDER_EXAMPLES}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (mascotState === 'apontando') setMascotState('sorrindo');
                    }}
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !inputText.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black shadow-xl shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider active:scale-95"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isAnalyzing ? 'Analisar' : 'Analisar e Preencher'}
                    </button>
                  </div>
                </div>

                {/* Completeness Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                      <Calculator className="w-3 h-3" /> Completude do Pedido
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${completeness === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {completeness}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${completeness}%` }}
                      className={`h-full transition-all duration-500 ${completeness === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setIsCalcOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calculadora de Cartilhas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist - 4 Colunas */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col h-full">
            <h3 className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-3 h-3" /> Checklist de Informações
            </h3>
            <div className="space-y-4 flex-1">
              {checklistStatus.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${item.found ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                        {item.found ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm font-bold transition-all ${item.found ? 'text-slate-700' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.found && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[11px] text-emerald-500 font-black uppercase"
                      >
                        OK
                      </motion.div>
                    )}
                  </div>
                  
                  {!item.found && inputText.length > 5 && (
                    <div className="pl-9 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                      {item.id === 'papel' && (base.papeis || []).map(p => (
                        <button 
                          key={p.nome}
                          onClick={() => setInputText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + p.nome)}
                          className="text-[10px] bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded border border-slate-100 transition-all font-bold"
                        >
                          + {p.nome}
                        </button>
                      ))}
                      {item.id === 'cores' && ['4/0', '4/4', '1/0'].map(s => (
                        <button 
                          key={s}
                          onClick={() => setInputText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + s)}
                          className="text-[10px] bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded border border-slate-100 transition-all font-bold"
                        >
                          + {s}
                        </button>
                      ))}
                      {item.id === 'impressao' && ['Digital', 'Offset'].map(s => (
                        <button 
                          key={s}
                          onClick={() => setInputText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + s)}
                          className="text-[10px] bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded border border-slate-100 transition-all font-bold"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {completeness < 100 && (
              <div className="pt-4 border-t border-slate-50 mt-4">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Dica: Adicione as informações em vermelho para um orçamento mais preciso.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Analisador PDF - 6 Colunas */}
        <div className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-xl">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">Analisador Universal PDF</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Extração automática de especificações</p>
              </div>
              <HelpIcon contentKey="PDF_ANALYZER" className="ml-auto" />
            </div>
            <div className="flex-1">
              <PDFBookletAnalyzer onApply={handleApplyPDF} />
            </div>
          </div>
        </div>

        {/* Área Complementar - 6 Colunas */}
        <div className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col h-full">
            <AnimatePresence mode="wait">
              {bookletDetails ? (
                <motion.div 
                  key="booklet-details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-xl">
                        <Printer className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">Produção da Cartilha</h3>
                        <p className="text-indigo-600 text-[9px] font-bold uppercase tracking-widest">
                          {bookletDetails.asDraft ? 'Rascunho Informativo' : 'Dados Aplicados'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setBookletDetails(null)}
                      className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Capa Section */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Layers className="w-3 h-3" /> Capa ({bookletDetails.capa.processo})
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase">Digital</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase">Papel</span>
                          <span className="text-xs font-black text-slate-700">{bookletDetails.capa.papel}</span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase">Folhas</span>
                            <span className="text-xs font-black text-slate-700">{bookletDetails.capa.folhas}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase">Impr.</span>
                            <span className="text-xs font-black text-slate-700">{bookletDetails.capa.impressoes}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Miolo Section */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <BookOpen className="w-3 h-3" /> Miolo ({bookletDetails.miolo.processo})
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase">Offset</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase">Papel</span>
                          <span className="text-xs font-black text-slate-700">{bookletDetails.miolo.papel}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase">Folhas</span>
                            <span className="text-xs font-black text-slate-700">{bookletDetails.miolo.folhas}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase">Impr.</span>
                            <span className="text-xs font-black text-slate-700">{bookletDetails.miolo.impressoes}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase">Chapas</span>
                            <span className="text-xs font-black text-slate-700">{bookletDetails.miolo.chapas}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty-complementary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Info className="w-8 h-8 text-slate-200" />
                  </div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-tight mb-2">Área Complementar</h4>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-[200px]">
                    Aqui aparecerão detalhes adicionais de produção quando você analisar um arquivo PDF.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

          {/* Conflict Modal */}
          <AnimatePresence>
            {showConflictModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                  <div className="p-6 bg-red-600 text-white flex items-center gap-3">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">Conflito de Dados</h3>
                      <p className="text-red-100 text-[10px] font-bold uppercase tracking-widest">Já existem dados no orçamento</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 font-medium">
                      Você já começou a preencher um orçamento para <strong>{form.produto || 'um produto'}</strong>. 
                      O que deseja fazer com os dados do PDF?
                    </p>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          const { analysis, asDraft } = showConflictModal;
                          setShowConflictModal(null);
                          handleApplyPDF(analysis, asDraft);
                        }}
                        className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                      >
                        Substituir Dados Existentes
                      </button>
                      <button 
                        onClick={() => {
                          const { analysis } = showConflictModal;
                          setShowConflictModal(null);
                          handleApplyPDF(analysis, true); // Force as draft
                        }}
                        className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Adicionar como Novo (Rascunho)
                      </button>
                      <button 
                        onClick={() => setShowConflictModal(null)}
                        className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Booklet Production Details */}
          <AnimatePresence>
            {bookletDetails && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-5 bg-indigo-900 rounded-3xl text-white shadow-xl shadow-indigo-200 overflow-hidden border border-indigo-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Printer className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight">Produção da Cartilha</h3>
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
                        {bookletDetails.asDraft ? 'Rascunho Informativo' : 'Dados Aplicados'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setBookletDetails(null)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-indigo-300" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Capa Section */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-2">
                          <Layers className="w-3 h-3" /> Capa ({bookletDetails.capa.processo})
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-100 rounded text-[9px] font-black uppercase">Digital</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] text-indigo-400 font-bold uppercase">Papel</span>
                          <span className="text-xs font-black">{bookletDetails.capa.papel}</span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <span className="block text-[8px] text-indigo-400 font-bold uppercase">Folhas</span>
                            <span className="text-xs font-black">{bookletDetails.capa.folhas}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-indigo-400 font-bold uppercase">Impr.</span>
                            <span className="text-xs font-black">{bookletDetails.capa.impressoes}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Miolo Section */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-2">
                          <BookOpen className="w-3 h-3" /> Miolo ({bookletDetails.miolo.processo})
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-100 rounded text-[9px] font-black uppercase">Offset</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] text-indigo-400 font-bold uppercase">Papel</span>
                          <span className="text-xs font-black">{bookletDetails.miolo.papel}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="block text-[8px] text-indigo-400 font-bold uppercase">Folhas</span>
                            <span className="text-xs font-black">{bookletDetails.miolo.folhas}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-indigo-400 font-bold uppercase">Impr.</span>
                            <span className="text-xs font-black">{bookletDetails.miolo.impressoes}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-indigo-400 font-bold uppercase">Chapas</span>
                            <span className="text-xs font-black">{bookletDetails.miolo.chapas}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {bookletDetails.analysis.thumbnail && (
                    <div className="w-full md:w-32 shrink-0 space-y-2">
                      <span className="text-[8px] text-indigo-300 font-black uppercase tracking-widest block text-center">Prévia PDF</span>
                      <div className="aspect-[3/4] bg-white/10 rounded-xl border border-white/20 overflow-hidden flex items-center justify-center p-1 shadow-inner">
                        <img 
                          src={bookletDetails.analysis.thumbnail} 
                          alt="PDF Preview" 
                          className="max-w-full max-h-full object-contain rounded-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {bookletDetails.exibirEsquemaOrcamento && bookletDetails.cadernos && (
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                          <BookOpen className="w-4 h-4 text-indigo-300" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Esquema de Montagem (Boneca)</h4>
                      </div>
                      <span className="px-3 py-1 bg-indigo-500/30 text-indigo-100 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-400/20">
                        {bookletDetails.cadernos.length} Cadernos
                      </span>
                    </div>

                    {/* Capa Separada no SmartBudget */}
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Capa & Contra Capa</span>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/5 z-10" />
                        <div className="flex items-center gap-4 relative z-0">
                          <div className="flex-1 aspect-[3/4] bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center relative">
                            <span className="text-xl font-black text-purple-300">{bookletDetails.analysis.paginas}</span>
                            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-r border-b border-purple-500/30 rounded-br-md" />
                          </div>
                          <div className="flex-1 aspect-[3/4] bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center relative">
                            <span className="text-xl font-black text-purple-300">1</span>
                            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-l border-b border-purple-500/30 rounded-bl-md" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Miolo no SmartBudget */}
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Miolo (Cadernos)</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {bookletDetails.cadernos.map((c: any) => (
                          <div key={c.id} className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2 group hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black text-indigo-300">C{c.id}</span>
                              <span className="text-[6px] font-bold text-indigo-500 uppercase">Frente</span>
                            </div>
                            <div className="flex items-center gap-2 relative">
                              <div className="absolute inset-y-0 left-1/2 w-px bg-white/5 z-10" />
                              <div className="flex-1 aspect-[3/4] bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-black text-blue-300">{c.frente[0]}</span>
                              </div>
                              <div className="flex-1 aspect-[3/4] bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-black text-blue-300">{c.frente[1]}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Info className="w-4 h-4 text-indigo-300" />
                  </div>
                  <p className="text-[10px] text-indigo-200 font-medium leading-tight">
                    Cálculo baseado em imposição técnica para {bookletDetails.analysis.tamanhoSugerido}. 
                    Produção mista otimizada para custo e qualidade.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && analysisResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/20"
            >
              <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Análise Concluída</h3>
                    <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest">Confirme os dados identificados</p>
                  </div>
                </div>
                <div className="w-12 h-12">
                  <img src="/mascote-apontando.png" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Alertas de Informações Faltantes */}
                {(!analysisResult.produto || !analysisResult.quantidade || !analysisResult.tamanhoFinal || !analysisResult.papeis.length) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                    <h4 className="text-[11px] text-amber-600 font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Informações Faltantes
                    </h4>
                    <div className="space-y-1">
                      {!analysisResult.produto && <p className="text-[11px] text-amber-700 font-bold">⚠ Falta informar o produto.</p>}
                      {!analysisResult.quantidade && <p className="text-[11px] text-amber-700 font-bold">⚠ Falta informar a quantidade.</p>}
                      {!analysisResult.tamanhoFinal && <p className="text-[11px] text-amber-700 font-bold">⚠ Falta informar o tamanho.</p>}
                      {!analysisResult.papeis.length && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-amber-700 font-bold">⚠ Falta informar o tipo de papel.</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {['Offset 120g', 'Couchê 150g', 'Couchê 170g'].map(s => (
                              <span key={s} className="text-[8px] bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-600 font-bold">Sugestão: {s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] text-slate-400 font-black uppercase mb-1">Produto</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      value={analysisResult.produto}
                      onChange={(e) => updateAnalysisResult('produto', e.target.value)}
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] text-slate-400 font-black uppercase mb-1">Quantidade</label>
                    <input 
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      value={analysisResult.quantidade}
                      onChange={(e) => updateAnalysisResult('quantidade', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] text-slate-400 font-black uppercase mb-1">Tamanho</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      value={analysisResult.tamanhoFinal}
                      onChange={(e) => updateAnalysisResult('tamanhoFinal', e.target.value)}
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] text-slate-400 font-black uppercase mb-1">Cores</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={analysisResult.cores}
                      onChange={(e) => updateAnalysisResult('cores', e.target.value)}
                    >
                      {COLOR_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[9px] text-slate-400 font-black uppercase mb-1">Papéis Identificados</span>
                  <div className="space-y-2 mt-2">
                    {analysisResult.papeis.map((p, i) => (
                      <div key={i} className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-black uppercase">Papel {i + 1} ({p.descricao})</span>
                        </div>
                        <select 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                          value={p.nome}
                          onChange={(e) => {
                            const selectedPaper = (base.papeis || []).find(bp => bp.nome === e.target.value);
                            if (selectedPaper) {
                              updateAnalysisPapel(i, 'nome', selectedPaper.nome);
                              // Se o papel selecionado tiver gramatura no nome ou em algum lugar, poderíamos atualizar, 
                              // mas por enquanto mantemos a gramatura identificada ou a do papel se disponível.
                            }
                          }}
                        >
                          <option value="">Selecione um papel...</option>
                          {(base.papeis || []).map((bp, bIdx) => (
                            <option key={bIdx} value={bp.nome}>{bp.nome}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[8px] text-slate-400 font-black uppercase">Gramatura</label>
                            <input 
                              type="number"
                              className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs font-bold"
                              value={p.gramatura}
                              onChange={(e) => updateAnalysisPapel(i, 'gramatura', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[8px] text-slate-400 font-black uppercase">Descrição</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs font-bold"
                              value={p.descricao}
                              onChange={(e) => updateAnalysisPapel(i, 'descricao', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {Object.entries(analysisResult.acabamentos).some(([_, v]) => v) && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-[9px] text-slate-400 font-black uppercase mb-1">Acabamentos</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(analysisResult.acabamentos).map(([k, v]) => v ? (
                        <span key={k} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-blue-600 uppercase">
                          {k}
                        </span>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={appendMode}
                        onChange={(e) => setAppendMode(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <span className="text-[11px] font-black uppercase text-slate-500 group-hover:text-blue-600 transition-colors">
                      Adicionar a este orçamento (Modo Misto)
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Corrigir Texto
                  </button>
                  <button 
                    onClick={confirmAnalysis}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Confirmar e Preencher Orçamento
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured Technical Form */}
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">🧾 Dados Técnicos do Orçamento</h2>
          </div>
          <motion.img 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            src="/mascote-sorrindo.png" 
            className="w-8 h-8 object-contain opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help"
            title="IA Monitorando"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUNA 1: Informações iniciais, Tamanho, Quantidade */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col space-y-6">
            <h3 className="text-[11px] text-blue-600 font-black uppercase tracking-[0.2em] flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3" /> Coluna 1: Informações Iniciais
              </div>
              <HelpIcon contentKey="INFORMACOES_INICIAIS" />
            </h3>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Produto
                </label>
                <input 
                  type="text" placeholder="Ex: Cartão de Visita" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold"
                  value={form.produto} onChange={e => updateForm('produto', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Quantidade
                  </label>
                  <input 
                    type="number" placeholder="Qtd" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold"
                    value={form.quantidade} onChange={e => updateForm('quantidade', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Tamanho Final
                  </label>
                  <input 
                    type="text" placeholder="Ex: 9x5cm" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold"
                    value={form.tamanhoFinal} onChange={e => updateForm('tamanhoFinal', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-700 font-black uppercase tracking-wider">Frente e Verso?</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Impressão em ambos os lados</span>
                </div>
                <div 
                  onClick={() => updateForm('frenteVerso', !form.frenteVerso)}
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${form.frenteVerso ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <motion.div 
                    animate={{ x: form.frenteVerso ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 2: Impressão, Papel, Páginas */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col space-y-6">
            <h3 className="text-[11px] text-blue-600 font-black uppercase tracking-[0.2em] flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-3 h-3" /> Coluna 2: Impressão & Papel
              </div>
              <HelpIcon contentKey="IMPRESSAO_DIGITAL" />
            </h3>
            
            <div className="space-y-6">
              {/* Tipo de Impressão */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Tipo de Impressão</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const maquinas = base.maquinasDigitais || [];
                      setForm({
                        ...form,
                        tipoImpressao: 'DIGITAL',
                        maquina: maquinas.length ? maquinas[0].maquina : form.maquina
                      });
                    }}
                    className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-1 ${form.tipoImpressao === 'DIGITAL' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100'}`}
                  >
                    Digital
                  </button>
                  <button 
                    onClick={() => {
                      const maquinas = base.maquinasOffset || [];
                      setForm({
                        ...form,
                        tipoImpressao: 'OFFSET',
                        maquina: maquinas.length ? maquinas[0].maquina : form.maquina
                      });
                    }}
                    className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-1 ${form.tipoImpressao === 'OFFSET' ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100'}`}
                  >
                    Offset
                  </button>
                </div>
              </div>

              {/* Máquina e Cores */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Settings className="w-3 h-3" /> Máquina
                  </label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={form.maquina} onChange={e => updateForm('maquina', e.target.value)}
                  >
                    {form.tipoImpressao === 'DIGITAL' ? (
                      (base.maquinasDigitais || []).map(m => (
                        <option key={m.maquina} value={m.maquina}>{m.maquina}</option>
                      ))
                    ) : (
                      (base.maquinasOffset || []).map(m => (
                        <option key={m.maquina} value={m.maquina}>{m.maquina}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Cores</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-black uppercase">Misto?</span>
                      <div 
                        onClick={() => updateForm('modoImpressao', form.modoImpressao === 'MISTO' ? 'SIMPLES' : 'MISTO')}
                        className={`w-8 h-4 rounded-full transition-all cursor-pointer relative ${form.modoImpressao === 'MISTO' ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: form.modoImpressao === 'MISTO' ? 16 : 4 }}
                          className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  {form.modoImpressao === 'SIMPLES' ? (
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={form.cores} onChange={e => updateForm('cores', e.target.value)}
                    >
                      {COLOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <button 
                      onClick={addMixedColorLine}
                      className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      Configurar Cores Mistas
                    </button>
                  )}
                </div>

                {/* Páginas */}
                {(form.acabamentos?.alceamento || form.produto?.toLowerCase().includes('cartilha') || form.produto?.toLowerCase().includes('livro')) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nº de Páginas</label>
                    <input 
                      type="number" placeholder="Ex: 20" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.paginas} onChange={updateForm.bind(null, 'paginas')}
                    />
                  </div>
                )}
              </div>

              {/* Papéis */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Papéis
                  </h4>
                  <button 
                    onClick={addPapel}
                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {(form.papeis || []).map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-black uppercase">{p.descricao || `Papel ${idx + 1}`}</span>
                        <button onClick={() => removePapel(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <select 
                        className="w-full bg-white border border-slate-100 rounded p-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                        value={p.nome} onChange={e => updatePapel(idx, 'nome', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {(base.papeis || []).map((bp, bIdx) => (
                          <option key={bIdx} value={bp.nome}>{bp.nome}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 3: Acabamentos, Materiais */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col space-y-6">
            <h3 className="text-[11px] text-blue-600 font-black uppercase tracking-[0.2em] flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Coluna 3: Acabamentos & Mat.
              </div>
              <HelpIcon contentKey="ACABAMENTOS" />
            </h3>
            
            <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Acabamentos */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Acabamentos</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'dobra', label: 'Dobra' },
                    { id: 'grampo', label: 'Grampo' },
                    { id: 'espiral', label: 'Espiral' },
                    { id: 'plastificacao', label: 'Plastificação' },
                    { id: 'alceamento', label: 'Alceamento' },
                    { id: 'vinco', label: 'Vinco' },
                  ].map((acab) => {
                    const key = acab.id as keyof ProductionInput['acabamentos'];
                    const val = form.acabamentos?.[key];
                    return (
                      <button 
                        key={key}
                        onClick={() => updateAcabamento(key, !val)}
                        className={`flex items-center justify-between p-3 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${val ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white'}`}
                      >
                        {acab.label}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${val ? 'bg-white border-white' : 'border-slate-200'}`}>
                          {val && <Check className="w-3 h-3 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Materiais */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Materiais</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'laserFilme', label: 'Laser Filme' },
                    { id: 'espiral', label: 'Espiral' },
                    { id: 'capaEncadernacao', label: 'Capa Encad.' },
                  ].map((mat) => {
                    const key = mat.id as keyof ProductionInput['materiais'];
                    const val = form.materiais?.[key];
                    return (
                      <button 
                        key={key}
                        onClick={() => updateMaterial(key, !val)}
                        className={`flex items-center justify-between p-3 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${val ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white'}`}
                      >
                        {mat.label}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${val ? 'bg-white border-white' : 'border-slate-200'}`}>
                          {val && <Check className="w-3 h-3 text-indigo-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RESUMO VISUAL (NEW) */}
        <div className="mt-10 pt-8 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Calculator className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Resumo do Orçamento</h4>
                  <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">Estimativa de produção em tempo real</p>
                </div>
              </div>
              
              <div className="flex gap-8">
                <div className="text-center">
                  <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Status do Motor</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Ativo
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Cálculo Reativo</span>
                  <span className="text-white font-black text-lg tracking-tighter">100%</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-6">
            Motor de Engenharia Reativo • DIGRA v3.5
          </p>
        </div>
      </div>
    </div>
  );
};
