import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Info, ArrowRight, BookOpen, Layers, X, Check, Palette, Printer, Search, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

import { HelpIcon } from './HelpSystem';

export interface PDFAnalysis {
  paginas: number;
  width: number;
  height: number;
  orientacao: 'Retrato' | 'Paisagem';
  tamanhoSugerido: string;
  paginasCapa: number;
  paginasMiolo: number;
  papelCapa: string;
  papelMiolo: string;
  produtoSugerido: string;
  coresSugeridas: string;
  estruturaSugerida: string;
  impressaoSugerida: string;
  thumbnail?: string;
  isBooklet?: boolean;
  tamanhoImpressao?: 'A4' | 'A3';
  adjustedPages?: number;
  cadernos?: any[];
  miolo?: {
    folhas: number;
    impressoes: number;
    papel: string;
  };
  capa?: {
    folhas: number;
    impressoes: number;
    papel: string;
  };
}

interface PDFBookletAnalyzerProps {
  onApply?: (analysis: PDFAnalysis, asDraft: boolean) => void;
}

export const PDFBookletAnalyzer: React.FC<PDFBookletAnalyzerProps> = ({ onApply }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMultiPageAlert, setShowMultiPageAlert] = useState(false);
  const [asDraft, setAsDraft] = useState(false);
  const [tamanhoImpressao, setTamanhoImpressao] = useState<'A4' | 'A3'>('A4');
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<PDFAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapToStandardSize = (w: number, h: number) => {
    const widthMm = Math.round(w * (25.4 / 72));
    const heightMm = Math.round(h * (25.4 / 72));
    
    const min = Math.min(widthMm, heightMm);
    const max = Math.max(widthMm, heightMm);

    if (Math.abs(min - 210) < 10 && Math.abs(max - 297) < 10) return 'A4';
    if (Math.abs(min - 148) < 10 && Math.abs(max - 210) < 10) return 'A5';
    if (Math.abs(min - 105) < 10 && Math.abs(max - 148) < 10) return 'A6';
    
    return `${widthMm} x ${heightMm} mm`;
  };

  const suggestProduct = (w: number, h: number, pages: number) => {
    const widthMm = Math.round(w * (25.4 / 72));
    const heightMm = Math.round(h * (25.4 / 72));
    const min = Math.min(widthMm, heightMm);
    const max = Math.max(widthMm, heightMm);

    if (pages >= 8) return 'CARTILHA / LIVRETO';
    if (pages > 4) return 'Cartilha / Revista';
    
    // Cartão de Visita: ~90x50mm
    if (min >= 45 && min <= 55 && max >= 85 && max <= 95) return 'Cartão de Visita';
    
    // Credencial: ~100x140mm
    if (min >= 90 && min <= 110 && max >= 130 && max <= 150) return 'Credencial';

    // A4: 210x297
    if (Math.abs(min - 210) < 15 && Math.abs(max - 297) < 15) {
      return pages === 1 ? 'Cartaz / Papel Timbrado' : 'Folder / Panfleto';
    }

    // A3: 297x420
    if (Math.abs(min - 297) < 15 && Math.abs(max - 420) < 15) return 'Cartaz';

    // A5: 148x210
    if (Math.abs(min - 148) < 15 && Math.abs(max - 210) < 15) return 'Panfleto / Folder';

    return 'Trabalho Personalizado';
  };

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Formato inválido. Envie um arquivo PDF.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    const reader = new FileReader();

    reader.onload = async function () {
      try {
        if (!this.result) throw new Error("Falha ao ler o arquivo");
        
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        
        const { width, height } = viewport;
        const orientacao = height >= width ? 'Retrato' : 'Paisagem';
        const tamanhoSugerido = mapToStandardSize(width, height);

        const totalPaginas = pdf.numPages;
        const isBooklet = totalPaginas >= 8;
        const produtoSugerido = suggestProduct(width, height, totalPaginas);
        
        let adjustedPages = totalPaginas;
        if (isBooklet && adjustedPages % 4 !== 0) {
          adjustedPages = Math.ceil(adjustedPages / 4) * 4;
        }

        let paginasCapa = 0;
        let paginasMiolo = totalPaginas;

        if (isBooklet) {
          paginasCapa = 2;
          paginasMiolo = adjustedPages - 2;
        }

        // Basic color detection on first page
        let isColor = false;
        try {
          const opList = await page.getOperatorList();
          // Check for common color operators
          // OPS.setFillRGBColor = 14, OPS.setStrokeRGBColor = 15, OPS.paintImageXObject = 85
          const colorOps = [14, 15, 82, 85]; 
          isColor = opList.fnArray.some(fn => colorOps.includes(fn));
        } catch (e) {
          console.warn("Could not analyze colors, defaulting to color");
          isColor = true;
        }

        const estruturaSugerida = totalPaginas === 1 ? 'Frente' : (totalPaginas === 2 ? 'Frente e Verso' : 'Multipáginas');
        
        const coresSugeridas = isColor 
          ? (totalPaginas === 1 ? '4/0' : '4/4')
          : (totalPaginas === 1 ? '1/0' : '1/1');
          
        const impressaoSugerida = totalPaginas > 50 ? 'Offset' : 'Digital';

        // Booklet specific calculations
        let cadernos: any[] = [];
        let mioloData = undefined;
        let capaData = undefined;

        if (isBooklet) {
          const finalSize = tamanhoSugerido;
          let pagesPerSheet = 4;
          let itemsPerSheetCapa = 1;

          if (finalSize === 'A5') {
            if (tamanhoImpressao === 'A4') {
              pagesPerSheet = 4;
              itemsPerSheetCapa = 1;
            } else {
              pagesPerSheet = 8;
              itemsPerSheetCapa = 2;
            }
          } else if (finalSize === 'A4') {
            if (tamanhoImpressao === 'A4') {
              pagesPerSheet = 1;
              itemsPerSheetCapa = 1;
            } else {
              pagesPerSheet = 2;
              itemsPerSheetCapa = 2;
            }
          }

          const mioloSheets = Math.ceil(((adjustedPages / pagesPerSheet) * 1) / 2); // 1 unit for analysis
          const mioloImpressions = mioloSheets * 2;
          const capaSheets = Math.ceil(1 / itemsPerSheetCapa);
          const capaImpressions = capaSheets * 2;

          mioloData = { folhas: mioloSheets, impressoes: mioloImpressions, papel: 'Offset 75g' };
          capaData = { folhas: capaSheets, impressoes: capaImpressions, papel: 'Cartolina Branca 180g' };

          if (tamanhoImpressao === 'A4') {
            const numCadernos = adjustedPages / 4;
            for (let i = 0; i < numCadernos; i++) {
              const p_start = (i * 2) + 1;
              const p_end = adjustedPages - (i * 2);
              cadernos.push({
                id: i + 1,
                frente: [p_end, p_start],
                verso: [p_start + 1, p_end - 1]
              });
            }
          } else {
            const numFolhasA3 = Math.ceil(adjustedPages / 8);
            for (let i = 0; i < numFolhasA3; i++) {
              const base_p = (i * 4);
              const getP = (p: number) => (p <= 0 || p > adjustedPages) ? '-' : p;
              const f1 = adjustedPages - base_p;
              const f2 = base_p + 1;
              const f3 = adjustedPages - base_p - 2;
              const f4 = base_p + 3;
              const v1 = base_p + 2;
              const v2 = adjustedPages - base_p - 1;
              const v3 = base_p + 4;
              const v4 = adjustedPages - base_p - 3;
              if (f2 <= adjustedPages / 2) {
                cadernos.push({
                  id: i + 1,
                  frente: [getP(f1), getP(f2), getP(f3), getP(f4)].filter(v => v !== '-'),
                  verso: [getP(v1), getP(v2), getP(v3), getP(v4)].filter(v => v !== '-')
                });
              }
            }
          }
        }

        // Render thumbnail of first page
        let thumbnail = '';
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          // Target max dimension of 600px for performance/quality balance
          const maxDim = 600;
          const scale = Math.min(1, maxDim / Math.max(viewport.width, viewport.height));
          const thumbViewport = page.getViewport({ scale });
          
          canvas.width = thumbViewport.width;
          canvas.height = thumbViewport.height;
          
          if (context) {
            await page.render({
              canvasContext: context,
              viewport: thumbViewport
            }).promise;
            thumbnail = canvas.toDataURL('image/png', 0.8); // 0.8 quality for PNG (though PNG doesn't support quality param in toDataURL, some browsers might use it if it were jpeg)
          }
        } catch (thumbErr) {
          console.warn("Could not generate thumbnail:", thumbErr);
        }

        setAnalysis({
          paginas: totalPaginas,
          width: Math.round(width * (25.4 / 72)),
          height: Math.round(height * (25.4 / 72)),
          orientacao,
          tamanhoSugerido,
          paginasCapa,
          paginasMiolo,
          papelCapa: 'Cartolina Branca 180g',
          papelMiolo: 'Offset 75g',
          produtoSugerido,
          coresSugeridas,
          estruturaSugerida,
          impressaoSugerida,
          thumbnail,
          isBooklet,
          tamanhoImpressao,
          adjustedPages,
          cadernos,
          miolo: mioloData,
          capa: capaData
        });
      } catch (err) {
        console.error('Erro ao processar PDF:', err);
        setError('Erro ao carregar PDF (worker não configurado ou arquivo inválido)');
      } finally {
        setIsAnalyzing(false);
      }
    };

    reader.onerror = () => {
      setError('Erro ao ler o arquivo do disco.');
      setIsAnalyzing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const toggleTamanhoImpressao = () => {
    const newSize = tamanhoImpressao === 'A4' ? 'A3' : 'A4';
    setTamanhoImpressao(newSize);
    if (analysis && analysis.isBooklet) {
      // Re-calculate booklet data with new print size
      const totalPaginas = analysis.paginas;
      const adjustedPages = analysis.adjustedPages || totalPaginas;
      const finalSize = analysis.tamanhoSugerido;
      
      let pagesPerSheet = 4;
      let itemsPerSheetCapa = 1;

      if (finalSize === 'A5') {
        if (newSize === 'A4') {
          pagesPerSheet = 4;
          itemsPerSheetCapa = 1;
        } else {
          pagesPerSheet = 8;
          itemsPerSheetCapa = 2;
        }
      } else if (finalSize === 'A4') {
        if (newSize === 'A4') {
          pagesPerSheet = 1;
          itemsPerSheetCapa = 1;
        } else {
          pagesPerSheet = 2;
          itemsPerSheetCapa = 2;
        }
      }

      const mioloSheets = Math.ceil(((adjustedPages / pagesPerSheet) * 1) / 2);
      const mioloImpressions = mioloSheets * 2;
      const capaSheets = Math.ceil(1 / itemsPerSheetCapa);
      const capaImpressions = capaSheets * 2;

      const cadernos: any[] = [];
      if (newSize === 'A4') {
        const numCadernos = adjustedPages / 4;
        for (let i = 0; i < numCadernos; i++) {
          const p_start = (i * 2) + 1;
          const p_end = adjustedPages - (i * 2);
          cadernos.push({
            id: i + 1,
            frente: [p_end, p_start],
            verso: [p_start + 1, p_end - 1]
          });
        }
      } else {
        const numFolhasA3 = Math.ceil(adjustedPages / 8);
        for (let i = 0; i < numFolhasA3; i++) {
          const base_p = (i * 4);
          const getP = (p: number) => (p <= 0 || p > adjustedPages) ? '-' : p;
          const f1 = adjustedPages - base_p;
          const f2 = base_p + 1;
          const f3 = adjustedPages - base_p - 2;
          const f4 = base_p + 3;
          const v1 = base_p + 2;
          const v2 = adjustedPages - base_p - 1;
          const v3 = base_p + 4;
          const v4 = adjustedPages - base_p - 3;
          if (f2 <= adjustedPages / 2) {
            cadernos.push({
              id: i + 1,
              frente: [getP(f1), getP(f2), getP(f3), getP(f4)].filter(v => v !== '-'),
              verso: [getP(v1), getP(v2), getP(v3), getP(v4)].filter(v => v !== '-')
            });
          }
        }
      }

      setAnalysis({
        ...analysis,
        tamanhoImpressao: newSize,
        cadernos,
        miolo: { ...analysis.miolo!, folhas: mioloSheets, impressoes: mioloImpressions },
        capa: { ...analysis.capa!, folhas: capaSheets, impressoes: capaImpressions }
      });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div 
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
        isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 shadow-sm'
      }`}
    >
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Search className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Analisador Universal de PDF</h3>
          <HelpIcon contentKey="PDF_ANALYZER" />
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          <FileUp className="w-3 h-3" />
          {isAnalyzing ? 'Analisando...' : 'Importar PDF'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-bold">{error}</p>
            </motion.div>
          )}

          {analysis && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center relative group">
                  <span className="block text-[7px] text-indigo-400 font-black uppercase mb-1">Páginas</span>
                  <span className="text-base font-black text-indigo-900 leading-none">{analysis.paginas}</span>
                  {analysis.isBooklet && analysis.adjustedPages && analysis.adjustedPages !== analysis.paginas && (
                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-[6px] font-bold text-indigo-500 uppercase leading-tight">
                        Ajustado: {analysis.adjustedPages}p
                      </span>
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[6px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Páginas ajustadas automaticamente para fechamento do caderno
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center overflow-hidden">
                  <span className="block text-[7px] text-indigo-400 font-black uppercase mb-1">Tamanho</span>
                  <span className="text-[11px] font-black text-indigo-900 leading-tight break-words w-full">
                    {analysis.tamanhoSugerido}
                  </span>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                  <span className="block text-[7px] text-indigo-400 font-black uppercase mb-1">Orientação</span>
                  <span className="text-[11px] font-black text-indigo-900 leading-none">{analysis.orientacao}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                    <Search className="w-3 h-3" /> Análise Universal
                  </h4>
                  {analysis.isBooklet && (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Imprimir em:</span>
                      <button 
                        onClick={toggleTamanhoImpressao}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-indigo-600 hover:border-indigo-300 transition-all"
                      >
                        {tamanhoImpressao}
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                      <Layers className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7px] text-slate-400 font-bold uppercase">Produto</span>
                      <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.produtoSugerido}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0">
                      <Palette className="w-3 h-3 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7px] text-slate-400 font-bold uppercase">Cores</span>
                      <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.coresSugeridas}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                      <ArrowRight className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7px] text-slate-400 font-bold uppercase">Estrutura</span>
                      <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.estruturaSugerida}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg shrink-0">
                      <Printer className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7px] text-slate-400 font-bold uppercase">Impressão</span>
                      <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.impressaoSugerida}</span>
                    </div>
                  </div>
                </div>
              </div>

              {analysis.isBooklet && analysis.cadernos && (
                <div className="p-6 bg-slate-100 rounded-3xl space-y-6 shadow-inner border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                        Esquema de Montagem (Boneca)
                      </h4>
                    </div>
                    <span className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                      {analysis.cadernos.length} Cadernos
                    </span>
                  </div>

                  {/* Capa Separada */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Capa & Contra Capa
                      </h5>
                    </div>
                    
                    <div className="relative group">
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
                        {/* Simulação de dobra central */}
                        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100 z-10 shadow-[0_0_10px_rgba(0,0,0,0.05)]" />
                        
                        <div className="flex items-center gap-4 relative z-0">
                          {/* Contra Capa */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Contra Capa</span>
                            <div className="w-full aspect-[3/4] bg-purple-50 border-2 border-purple-200 rounded-xl flex items-center justify-center relative group-hover:border-purple-400 transition-colors">
                              <span className="text-3xl font-black text-purple-600">{analysis.paginas}</span>
                              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-purple-200 rounded-br-lg" />
                            </div>
                          </div>

                          {/* Capa */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Capa</span>
                            <div className="w-full aspect-[3/4] bg-purple-50 border-2 border-purple-200 rounded-xl flex items-center justify-center relative group-hover:border-purple-400 transition-colors">
                              <span className="text-3xl font-black text-purple-600">1</span>
                              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-purple-200 rounded-bl-lg" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Miolo Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Miolo (Cadernos Internos)
                      </h5>
                    </div>

                    <div className="grid grid-cols-1 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {analysis.cadernos.map((c: any) => (
                        <div key={c.id} className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caderno {c.id}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase">Imposição {analysis.tamanhoImpressao}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Frente */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Frente</span>
                              </div>
                              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
                                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100 z-10" />
                                <div className="flex items-center gap-3">
                                  {c.frente.map((p: any, idx: number) => (
                                    <div key={idx} className="flex-1 aspect-[3/4] bg-blue-50/50 border-2 border-blue-100 rounded-xl flex items-center justify-center relative">
                                      <span className="text-2xl font-black text-blue-600">{p}</span>
                                      <div className={`absolute bottom-1.5 ${idx === 0 ? 'right-1.5' : 'left-1.5'} w-3 h-3 border-${idx === 0 ? 'r' : 'l'}-2 border-b-2 border-blue-100 rounded-b-md`} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Verso */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Verso</span>
                              </div>
                              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
                                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100 z-10" />
                                <div className="flex items-center gap-3">
                                  {c.verso.map((p: any, idx: number) => (
                                    <div key={idx} className="flex-1 aspect-[3/4] bg-emerald-50/50 border-2 border-emerald-100 rounded-xl flex items-center justify-center relative">
                                      <span className="text-2xl font-black text-emerald-600">{p}</span>
                                      <div className={`absolute bottom-1.5 ${idx === 0 ? 'right-1.5' : 'left-1.5'} w-3 h-3 border-${idx === 0 ? 'r' : 'l'}-2 border-b-2 border-emerald-100 rounded-b-md`} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3 h-3" /> Sugestão de Materiais
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {analysis.paginasCapa > 0 ? (
                    <>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase">Miolo</span>
                          <span className="text-[10px] font-black text-slate-700 truncate block">Offset 75g</span>
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 rounded-lg shrink-0">
                          <Layers className="w-3 h-3 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[7px] text-slate-400 font-bold uppercase">Capa</span>
                          <span className="text-[10px] font-black text-slate-700 truncate block">Cartolina Branca 180g</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 col-span-2">
                      <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                        <Layers className="w-3 h-3 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[7px] text-slate-400 font-bold uppercase">Papel Sugerido</span>
                        <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.papelCapa || 'Couchê 150g'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {analysis.thumbnail && (
                <div className="space-y-2">
                  <h4 className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Prévia do Documento
                  </h4>
                  <div className="relative aspect-video bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center group shadow-sm">
                    <img 
                      src={analysis.thumbnail} 
                      alt="Thumbnail" 
                      className="max-w-full max-h-full object-contain p-1"
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                      Página 1
                    </div>
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none" />
                  </div>
                  <p className="text-[8px] text-slate-400 font-bold text-center italic">Prévia automática do PDF</p>
                </div>
              )}

              <div className="flex items-center gap-2 px-1">
                <button 
                  onClick={() => setAsDraft(!asDraft)}
                  className="flex items-center gap-2 group"
                >
                  <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${asDraft ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                    {asDraft && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">Aplicar como rascunho</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  if (analysis.paginas > 4 && !analysis.produtoSugerido.toLowerCase().includes('cartilha')) {
                    setShowMultiPageAlert(true);
                  } else {
                    setEditedAnalysis({ ...analysis });
                    setShowConfirm(true);
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                Usar dados no orçamento
                <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {!analysis && !isAnalyzing && !error && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
              <div className="p-3 bg-slate-100 rounded-full">
                <FileUp className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Arraste ou Importe PDF</p>
                <p className="text-[9px] font-bold text-slate-400">Análise técnica automática</p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">Analisando PDF...</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-page Alert Modal */}
      <AnimatePresence>
        {showMultiPageAlert && analysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/20"
            >
              <div className="p-6 bg-amber-500 text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Múltiplas Páginas</h3>
                  <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest">Deseja tratar como cartilha?</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Detectamos que este arquivo possui <strong>{analysis.paginas} páginas</strong>. 
                  Deseja utilizar o fluxo de orçamento para cartilhas/revistas ou continuar como material simples?
                </p>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      const newAnalysis = {
                        ...analysis,
                        produtoSugerido: 'Cartilha / Revista',
                        paginasCapa: 2,
                        paginasMiolo: analysis.paginas - 2
                      };
                      setAnalysis(newAnalysis);
                      setEditedAnalysis(newAnalysis);
                      setShowMultiPageAlert(false);
                      setShowConfirm(true);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                  >
                    Sim, tratar como Cartilha
                  </button>
                  <button 
                    onClick={() => {
                      setEditedAnalysis({ ...analysis });
                      setShowMultiPageAlert(false);
                      setShowConfirm(true);
                    }}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Não, continuar como Material Simples
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation & Edit Modal */}
      <AnimatePresence>
        {showConfirm && analysis && editedAnalysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-white/20 my-8"
            >
              <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Revisar e Editar Dados</h3>
                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Ajuste os dados técnicos antes de aplicar</p>
                  </div>
                </div>
                <button onClick={() => setShowConfirm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Produto */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tipo de Produto</label>
                      {editedAnalysis.produtoSugerido !== analysis.produtoSugerido && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.produtoSugerido}</p>
                    <div className="flex gap-2">
                      <select 
                        value={editedAnalysis.produtoSugerido}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isBooklet = val === 'CARTILHA / LIVRETO' || val.toLowerCase().includes('cartilha') || val.toLowerCase().includes('revista');
                          
                          let updatedAnalysis = {
                            ...editedAnalysis, 
                            produtoSugerido: val,
                            isBooklet,
                            paginasCapa: isBooklet ? 2 : 0,
                            paginasMiolo: isBooklet ? Math.max(0, (editedAnalysis.adjustedPages || editedAnalysis.paginas) - 2) : editedAnalysis.paginas,
                            estruturaSugerida: isBooklet ? 'Multipáginas' : (editedAnalysis.paginas > 1 ? 'Frente e Verso' : 'Frente')
                          };

                          if (isBooklet) {
                            // Recalculate booklet data
                            const totalPaginas = updatedAnalysis.paginas;
                            let adjustedPages = totalPaginas;
                            if (adjustedPages % 4 !== 0) {
                              adjustedPages = Math.ceil(adjustedPages / 4) * 4;
                            }
                            updatedAnalysis.adjustedPages = adjustedPages;
                            updatedAnalysis.paginasMiolo = adjustedPages - 2;

                            const finalSize = updatedAnalysis.tamanhoSugerido;
                            let pagesPerSheet = 4;
                            let itemsPerSheetCapa = 1;

                            if (finalSize === 'A5') {
                              if (tamanhoImpressao === 'A4') {
                                pagesPerSheet = 4;
                                itemsPerSheetCapa = 1;
                              } else {
                                pagesPerSheet = 8;
                                itemsPerSheetCapa = 2;
                              }
                            } else if (finalSize === 'A4') {
                              if (tamanhoImpressao === 'A4') {
                                pagesPerSheet = 1;
                                itemsPerSheetCapa = 1;
                              } else {
                                pagesPerSheet = 2;
                                itemsPerSheetCapa = 2;
                              }
                            }

                            const mioloSheets = Math.ceil(((adjustedPages / pagesPerSheet) * 1) / 2);
                            const mioloImpressions = mioloSheets * 2;
                            const capaSheets = Math.ceil(1 / itemsPerSheetCapa);
                            const capaImpressions = capaSheets * 2;

                            const cadernos: any[] = [];
                            if (tamanhoImpressao === 'A4') {
                              const numCadernos = adjustedPages / 4;
                              for (let i = 0; i < numCadernos; i++) {
                                const p_start = (i * 2) + 1;
                                const p_end = adjustedPages - (i * 2);
                                cadernos.push({
                                  id: i + 1,
                                  frente: [p_end, p_start],
                                  verso: [p_start + 1, p_end - 1]
                                });
                              }
                            } else {
                              const numFolhasA3 = Math.ceil(adjustedPages / 8);
                              for (let i = 0; i < numFolhasA3; i++) {
                                const base_p = (i * 4);
                                const getP = (p: number) => (p <= 0 || p > adjustedPages) ? '-' : p;
                                const f1 = adjustedPages - base_p;
                                const f2 = base_p + 1;
                                const f3 = adjustedPages - base_p - 2;
                                const f4 = base_p + 3;
                                const v1 = base_p + 2;
                                const v2 = adjustedPages - base_p - 1;
                                const v3 = base_p + 4;
                                const v4 = adjustedPages - base_p - 3;
                                if (f2 <= adjustedPages / 2) {
                                  cadernos.push({
                                    id: i + 1,
                                    frente: [getP(f1), getP(f2), getP(f3), getP(f4)].filter(v => v !== '-'),
                                    verso: [getP(v1), getP(v2), getP(v3), getP(v4)].filter(v => v !== '-')
                                  });
                                }
                              }
                            }
                            updatedAnalysis.cadernos = cadernos;
                            updatedAnalysis.miolo = { folhas: mioloSheets, impressoes: mioloImpressions, papel: 'Offset 75g' };
                            updatedAnalysis.capa = { folhas: capaSheets, impressoes: capaImpressions, papel: 'Cartolina Branca 180g' };
                          }

                          setEditedAnalysis(updatedAnalysis);
                        }}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Cartão de Visita">Cartão de Visita</option>
                        <option value="Panfleto / Folder">Panfleto / Folder</option>
                        <option value="Cartaz">Cartaz</option>
                        <option value="CARTILHA / LIVRETO">CARTILHA / LIVRETO</option>
                        <option value="Cartilha / Revista">Cartilha / Revista</option>
                        <option value="Credencial">Credencial</option>
                        <option value="Adesivo">Adesivo</option>
                        <option value="Envelope">Envelope</option>
                        <option value="Trabalho Personalizado">Trabalho Personalizado</option>
                      </select>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, produtoSugerido: analysis.produtoSugerido})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tamanho */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tamanho (mm)</label>
                      {(editedAnalysis.width !== analysis.width || editedAnalysis.height !== analysis.height) && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.width} x {analysis.height} mm ({analysis.tamanhoSugerido})</p>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number"
                        value={editedAnalysis.width}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, width: parseInt(e.target.value) || 0})}
                        className="w-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-400 font-bold">x</span>
                      <input 
                        type="number"
                        value={editedAnalysis.height}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, height: parseInt(e.target.value) || 0})}
                        className="w-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, width: analysis.width, height: analysis.height})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Orientação */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Orientação</label>
                      {editedAnalysis.orientacao !== analysis.orientacao && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.orientacao}</p>
                    <div className="flex gap-2">
                      <select 
                        value={editedAnalysis.orientacao}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, orientacao: e.target.value as 'Retrato' | 'Paisagem'})}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Retrato">Retrato</option>
                        <option value="Paisagem">Paisagem</option>
                      </select>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, orientacao: analysis.orientacao})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Páginas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Número de Páginas</label>
                      {editedAnalysis.paginas !== analysis.paginas && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.paginas}</p>
                    <div className="flex gap-2">
                      <div className="relative group">
                        <input 
                          type="number"
                          value={editedAnalysis.paginas}
                          onChange={(e) => {
                            const p = parseInt(e.target.value) || 1;
                            const isBooklet = editedAnalysis.produtoSugerido === 'CARTILHA / LIVRETO' || editedAnalysis.produtoSugerido.toLowerCase().includes('cartilha') || editedAnalysis.produtoSugerido.toLowerCase().includes('revista');
                            
                            let updatedAnalysis = {
                              ...editedAnalysis, 
                              paginas: p,
                              paginasCapa: isBooklet ? 2 : 0,
                              paginasMiolo: isBooklet ? Math.max(0, p - 2) : p
                            };

                            if (isBooklet) {
                              // Recalculate booklet data
                              let adjustedPages = p;
                              if (adjustedPages % 4 !== 0) {
                                adjustedPages = Math.ceil(adjustedPages / 4) * 4;
                              }
                              updatedAnalysis.adjustedPages = adjustedPages;
                              updatedAnalysis.paginasMiolo = adjustedPages - 2;

                              const finalSize = updatedAnalysis.tamanhoSugerido;
                              let pagesPerSheet = 4;
                              let itemsPerSheetCapa = 1;

                              if (finalSize === 'A5') {
                                if (tamanhoImpressao === 'A4') {
                                  pagesPerSheet = 4;
                                  itemsPerSheetCapa = 1;
                                } else {
                                  pagesPerSheet = 8;
                                  itemsPerSheetCapa = 2;
                                }
                              } else if (finalSize === 'A4') {
                                if (tamanhoImpressao === 'A4') {
                                  pagesPerSheet = 1;
                                  itemsPerSheetCapa = 1;
                                } else {
                                  pagesPerSheet = 2;
                                  itemsPerSheetCapa = 2;
                                }
                              }

                              const mioloSheets = Math.ceil(((adjustedPages / pagesPerSheet) * 1) / 2);
                              const mioloImpressions = mioloSheets * 2;
                              const capaSheets = Math.ceil(1 / itemsPerSheetCapa);
                              const capaImpressions = capaSheets * 2;

                              const cadernos: any[] = [];
                              if (tamanhoImpressao === 'A4') {
                                const numCadernos = adjustedPages / 4;
                                for (let i = 0; i < numCadernos; i++) {
                                  const p_start = (i * 2) + 1;
                                  const p_end = adjustedPages - (i * 2);
                                  cadernos.push({
                                    id: i + 1,
                                    frente: [p_end, p_start],
                                    verso: [p_start + 1, p_end - 1]
                                  });
                                }
                              } else {
                                const numFolhasA3 = Math.ceil(adjustedPages / 8);
                                for (let i = 0; i < numFolhasA3; i++) {
                                  const base_p = (i * 4);
                                  const getP = (p: number) => (p <= 0 || p > adjustedPages) ? '-' : p;
                                  const f1 = adjustedPages - base_p;
                                  const f2 = base_p + 1;
                                  const f3 = adjustedPages - base_p - 2;
                                  const f4 = base_p + 3;
                                  const v1 = base_p + 2;
                                  const v2 = adjustedPages - base_p - 1;
                                  const v3 = base_p + 4;
                                  const v4 = adjustedPages - base_p - 3;
                                  if (f2 <= adjustedPages / 2) {
                                    cadernos.push({
                                      id: i + 1,
                                      frente: [getP(f1), getP(f2), getP(f3), getP(f4)].filter(v => v !== '-'),
                                      verso: [getP(v1), getP(v2), getP(v3), getP(v4)].filter(v => v !== '-')
                                    });
                                  }
                                }
                              }
                              updatedAnalysis.cadernos = cadernos;
                              updatedAnalysis.miolo = { folhas: mioloSheets, impressoes: mioloImpressions, papel: 'Offset 75g' };
                              updatedAnalysis.capa = { folhas: capaSheets, impressoes: capaImpressions, papel: 'Cartolina Branca 180g' };
                            }

                            setEditedAnalysis(updatedAnalysis);
                          }}
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {editedAnalysis.isBooklet && editedAnalysis.adjustedPages && editedAnalysis.adjustedPages !== editedAnalysis.paginas && (
                          <div className="absolute -top-6 left-0 right-0 text-[7px] font-bold text-indigo-500 uppercase text-center animate-pulse">
                            Páginas ajustadas automaticamente para fechamento do caderno
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, paginas: analysis.paginas, paginasCapa: analysis.paginasCapa, paginasMiolo: analysis.paginasMiolo})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Cores */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tipo de Cor</label>
                      {editedAnalysis.coresSugeridas !== analysis.coresSugeridas && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.coresSugeridas}</p>
                    <div className="flex gap-2">
                      <select 
                        value={editedAnalysis.coresSugeridas}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, coresSugeridas: e.target.value})}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="4/0">4/0 (Colorido Frente)</option>
                        <option value="4/4">4/4 (Colorido Frente e Verso)</option>
                        <option value="1/0">1/0 (Preto Frente)</option>
                        <option value="1/1">1/1 (Preto Frente e Verso)</option>
                        <option value="4/1">4/1 (Colorido Frente / Preto Verso)</option>
                      </select>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, coresSugeridas: analysis.coresSugeridas})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Impressão */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tipo de Impressão</label>
                      {editedAnalysis.impressaoSugerida !== analysis.impressaoSugerida && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.impressaoSugerida}</p>
                    <div className="flex gap-2">
                      <select 
                        value={editedAnalysis.impressaoSugerida}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, impressaoSugerida: e.target.value})}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Digital">Digital</option>
                        <option value="Offset">Offset</option>
                      </select>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, impressaoSugerida: analysis.impressaoSugerida})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Estrutura */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Estrutura</label>
                      {editedAnalysis.estruturaSugerida !== analysis.estruturaSugerida && (
                        <span className="text-[8px] text-amber-600 font-bold uppercase">Valor ajustado manualmente</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Detectado: {analysis.estruturaSugerida}</p>
                    <div className="flex gap-2">
                      <select 
                        value={editedAnalysis.estruturaSugerida}
                        onChange={(e) => setEditedAnalysis({...editedAnalysis, estruturaSugerida: e.target.value})}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Frente">Frente</option>
                        <option value="Frente e Verso">Frente e Verso</option>
                        <option value="Multipáginas">Multipáginas</option>
                      </select>
                      <button 
                        onClick={() => setEditedAnalysis({...editedAnalysis, estruturaSugerida: analysis.estruturaSugerida})}
                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                        title="Restaurar valor detectado"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                    {asDraft 
                      ? "Os dados editados serão adicionados como um rascunho informativo."
                      : "O orçamento será preenchido com os dados revisados. A quantidade atual será mantida."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      // Basic validation
                      if (editedAnalysis.width <= 0 || editedAnalysis.height <= 0 || editedAnalysis.paginas <= 0) {
                        alert("Por favor, insira valores válidos para tamanho e páginas.");
                        return;
                      }

                      // Final validation before applying
                      const finalAnalysis = {
                        ...editedAnalysis,
                        // Update tamanhoSugerido if width/height changed
                        tamanhoSugerido: (editedAnalysis.width === analysis.width && editedAnalysis.height === analysis.height) 
                          ? analysis.tamanhoSugerido 
                          : `${editedAnalysis.width} x ${editedAnalysis.height} mm`
                      };
                      onApply?.(finalAnalysis, asDraft);
                      setShowConfirm(false);
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Confirmar e aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
