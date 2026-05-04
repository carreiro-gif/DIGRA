import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Clipboard, Upload, X, Maximize2, Trash2 } from 'lucide-react';

interface ProjectImagesProps {
  images: { url: string; label?: string }[];
  onAddImages: (newImages: { url: string; label?: string }[]) => void;
  onRemoveImage: (index: number) => void;
}

export const ProjectImages: React.FC<ProjectImagesProps> = ({ images, onAddImages, onRemoveImage }) => {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showPasteHint, setShowPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => 
      ['image/jpeg', 'image/png', 'image/bmp'].includes(file.type)
    );

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onAddImages([{ url: e.target.result as string }]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [onAddImages]);

  const handlePasteEvent = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) processFiles([file]);
      }
    }
  }, [processFiles]);

  useEffect(() => {
    window.addEventListener('paste', handlePasteEvent);
    return () => window.removeEventListener('paste', handlePasteEvent);
  }, [handlePasteEvent]);

  const triggerPasteHint = () => {
    setShowPasteHint(true);
    setTimeout(() => setShowPasteHint(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 no-print relative">
        <button
          onClick={triggerPasteHint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-slate-300 shadow-sm active:scale-95"
          title="Colar imagem da área de transferência"
        >
          <Clipboard className="w-4 h-4" />
          📋 Colar Imagem
        </button>
        
        {showPasteHint && (
          <div className="absolute top-full left-0 mt-2 z-10 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-xl animate-bounce">
            Pressione CTRL + V para colar
          </div>
        )}
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-slate-300 shadow-sm active:scale-95"
          title="Selecionar arquivos de imagem"
        >
          <Upload className="w-4 h-4" />
          📁 Adicionar Imagem
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/bmp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          grid gap-4 
          min-h-[100px] p-4 rounded-xl border-2 border-dashed 
          ${images.length === 0 ? 'border-slate-200 bg-slate-50/50' : 'border-transparent bg-transparent'}
          transition-colors relative
        `}
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {images.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-400 pointer-events-none">
            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm font-medium">Arraste imagens aqui ou use os botões acima</p>
          </div>
        )}

        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[240px] flex items-center justify-center"
          >
            <img 
              src={img.url} 
              alt={`Projeto ${idx + 1}`} 
              className="max-w-full max-h-full object-contain cursor-zoom-in"
              onClick={() => setZoomImage(img.url)}
            />
            
            {img.label && (
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-lg border border-indigo-400/30">
                  {img.label}
                </div>
              </div>
            )}
            
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
              <button
                onClick={() => setZoomImage(img.url)}
                className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-md border border-slate-200 transition-colors"
                title="Ampliar"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRemoveImage(idx)}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-colors"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Imagem {idx + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Zoom Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out no-print"
          onClick={() => setZoomImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={zoomImage} 
            alt="Zoom" 
            className="max-w-full max-h-full object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Print View: Material de Referência */}
      <div className="hidden print:block mt-8 border-t-2 border-slate-200 pt-6">
        <h4 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">Material de Referência</h4>
        <div className="grid grid-cols-2 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden p-2 bg-white space-y-2">
              <img src={img.url} alt={`Ref ${idx}`} className="max-w-full h-auto object-contain mx-auto" />
              {img.label && (
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-t pt-1">{img.label}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
