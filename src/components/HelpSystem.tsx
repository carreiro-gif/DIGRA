import React, { useState } from 'react';
import { HelpCircle, X, Search, Book, Info, AlertCircle, CheckCircle2, HelpCircle as HelpIconLucide } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HELP_CONTENT, MANUAL_SECTIONS } from '../constants/HelpContent';

interface HelpIconProps {
  contentKey: keyof typeof HELP_CONTENT;
  className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({ contentKey, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const help = HELP_CONTENT[contentKey];

  if (!help) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`p-1 hover:bg-indigo-100 rounded-full transition-colors text-indigo-400 hover:text-indigo-600 ${className}`}
        title="Ajuda"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-indigo-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpIconLucide className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-widest">{help.title}</h4>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {help.content}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface SystemManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemManual: React.FC<SystemManualProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = MANUAL_SECTIONS.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-[32px] shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Book className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Manual do Sistema</h2>
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Guia completo de uso e regras técnicas</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar no manual..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => (
                  <div key={section.id} className="space-y-3">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                      {section.title}
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Search className="w-12 h-12 text-slate-400" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">Nenhum resultado encontrado</p>
                    <p className="text-xs font-bold text-slate-400">Tente pesquisar por outros termos</p>
                  </div>
                </div>
              )}

              {/* FAQ Section (Always visible if no search or if matches) */}
              {(!searchQuery || 'faq'.includes(searchQuery.toLowerCase())) && (
                <div className="pt-8 border-t border-slate-100">
                  <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Dica Importante
                    </h4>
                    <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                      Sempre revise o orçamento final antes de imprimir. O sistema é uma ferramenta de apoio técnico, mas a validação humana é essencial para garantir a viabilidade da produção.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Fechar Manual
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
