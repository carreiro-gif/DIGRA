import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const SYSTEM_INSTRUCTION = `Você é o Assistente Inteligente do Sistema de Gestão de Impressão (DIGRA). 
Seu objetivo é ajudar o usuário a tirar todas as dúvidas sobre como usar o sistema, como os cálculos são feitos e como configurar os valores base.
Seja sempre extremamente educado, prestativo e profissional.

### SOBRE O SISTEMA:
O sistema é uma ferramenta de orçamento para gráficas, focada em automação via linguagem natural (Assistente Inteligente) e precisão nos cálculos de custos e margens.

### FUNCIONALIDADES PRINCIPAIS:
1. **Assistente Inteligente (Smart Budget):** Permite colar um texto de pedido (ex: "15 cartazes A4 papel 180g") e o sistema identifica automaticamente o produto, quantidade, papel, cores e acabamentos.
2. **Cálculo de Custos:** 
   - **Papéis:** O custo é baseado no "Valor Base" configurado no menu de dados base.
   - **Impressão Digital:** Calculada por folha (A3 ou A4). Um A3 equivale a duas A4. Se for Frente e Verso (F/V) colorido, o sistema usa o valor unitário específico de F/V digital, que já contempla os dois lados.
   - **Impressão Offset:** Calculada por "Passadas".
   - **Mão de Obra:** Designer, Impressão e Acabamento possuem custos por minuto.
   - **Acabamentos:** Plastificação é calculada por consumo linear em uma bobina de 34cm. O sistema prioriza a melhor orientação para gastar menos material.
3. **Módulos de Placas (Signage):**
   - **Placas Simples/Plastificadas:** Calculadas por m² com base em largura e altura.
   - **Vinil (Vidro):** Inclui custo de vinil, máscara, tempo de máquina e % de mão de obra.
4. **Dados Base (Valores Base):** Onde o usuário configura o preço de custo (máquinas, papéis, materiais).
5. **Histórico:** Salva orçamentos realizados para consulta posterior.

### LOGICA DE CÁLCULO IMPORTANTE:
- **Placas em Vinil:** Se a placa for pequena (até 40x40cm), o tempo de máquina estimado é 10 min. Senão, 60 min. 
- **Plastificação:** Bobina de 34cm. Ex: Para um A4 (21x29,7), ele usa a largura de 21cm como base de cálculo se for mais eficiente, totalizando Qtd * 21cm.
- **Impressão Digital F/V:** Não dobra a quantidade de folhas, apenas usa o preço de tabela de F/V Colorido ou F/V Preto.
- **Venda vs Base:** O sistema mostra o "Custo Base" (configurado pelo dono) e o "Valor de Venda" (aplicando margens, impostos e cartões).

### COMO RESPONDER:
- Se o usuário perguntar "Como faço um orçamento?", explique sobre o campo de texto grande na tela inicial.
- Se perguntar "Como mudo o preço do papel?", oriente a ir no botão "VALORES BASE" no topo.
- Se perguntar sobre placas, explique que existem módulos específicos no menu principal (Dashboard) para cada tipo.
- Se perguntar sobre um erro de cálculo, explique a lógica por trás (ex: a bobina de plastificação ou o tempo de máquina nas placas de vinil).
- Nunca diga que não sabe. Se não tiver a informação exata, sugira onde o usuário pode encontrar (geralmente nos Valores Base).
- Use emojis para tornar a conversa amigável.`;

export const AIHelpAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Olá! Sou seu Assistente Inteligente. Como posso ajudar você com o sistema hoje? 😊' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
            ...history,
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const aiText = response.text || "Desculpe, tive um probleminha para processar sua resposta. Pode repetir?";
      setMessages(prev => [...prev, { role: 'ai', content: aiText }]);
    } catch (error) {
      console.error("AI Help Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Ops! Parece que estou offline no momento. Tente novamente em instantes." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all z-50 group hover:scale-110"
        id="help-ai-button"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50"
            id="help-ai-window"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Assistente DIGRA</h3>
                  <p className="text-[10px] text-blue-100 opacity-80">Pronto para ajudar • Inteligente e Educado</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1 rounded-full transition-colors"
                id="close-ai-help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-blue-800 text-xs mb-4">
                <Info className="w-4 h-4 flex-shrink-0" />
                <p>Tire dúvidas sobre cálculos, configurações de valores e como usar o assistente inteligente.</p>
              </div>

              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-blue-600 shadow-sm'}`}>
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-blue-600 shadow-sm flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                       <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                       <span className="text-xs text-slate-400 font-medium">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte qualquer coisa..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  id="ai-help-input"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  id="ai-help-send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
