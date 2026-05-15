import { GoogleGenAI, Type } from "@google/genai";
import { ProductionInput, CalculatedProduction, CalculatedComponent, TechnicalSummary, CalculatedMaterial, ProductionEngineOutput, BudgetHistoryEntry } from '../types/SmartBudgetTypes';
import { BaseData } from '../types';

const SYSTEM_INSTRUCTION = `
Você é um especialista em orçamento e produção gráfica profissional para o sistema DIGRA.
Sua única função é converter o texto livre do cliente em um JSON estruturado seguindo rigorosamente as regras da indústria gráfica.

REGRAS DE INTERPRETAÇÃO:
1. Identifique: quantidade, formato final, tipo de cor (1/0, 1/1, 4/0, 4/4), produto, papel e tipo de impressão (digital ou offset).
2. INTERPRETAÇÃO DE PAPEL:
   - Se o usuário mencionar apenas a gramatura (ex: "75g", "90 gramas"), identifique o papel correspondente (ex: "Offset 75g", "Couchê 90g").
   - Priorize papéis comuns: 75g/90g -> Offset; 115g/150g/170g/230g/250g/300g -> Couchê.
3. CONVERSÃO DE CORES:
   - 1/0 -> cores = "1/0", frenteVerso = false
   - 1/1 -> cores = "1/1", frenteVerso = true
   - 4/0 -> cores = "4/0", frenteVerso = false
   - 4/4 -> cores = "4/4", frenteVerso = true

REGRAS DE PRODUÇÃO:
- NÃO faça cálculos de folhas. O motor de cálculo fará isso.
- Se o cliente não especificar a máquina, sugira a mais adequada:
  * DIGITAL: "RICOH / PROGRAMAÇÃO VISUAL", "XEROX / PROGRAMAÇÃO VISUAL", "XEROX / HAMILTON".
  * OFFSET: "Heidelberg Bicolor", "Sakurai".
  * Priorize "Heidelberg Bicolor" para Offset se não houver preferência.
- NUNCA sugira "MESTRE IMPRESSOR". Para OFFSET, use sempre "IMPRESSOR OFFSET". Para DIGITAL, use "IMPRESSOR DIGITAL".
- PADRÃO DE PAPEL: Se o produto for "Folder", use sempre "Offset 120g" como papel padrão, a menos que o cliente especifique outro.
- Se não especificar o papel para outros produtos, sugira o mais comum.
- Extraia acabamentos mencionados (GRAMPO, DOBRA, VINCO, PLASTIFICAÇÃO, ALCEAMENTO).
- SEPARAÇÃO DE IMPRESSÃO:
  * Se tipoImpressao for OFFSET: NÃO marque materiais de impressão digital (como laserFilme se for usado apenas para digital, etc).
  * Se tipoImpressao for DIGITAL: Marque os materiais digitais normalmente.
  * IMPORTANTE: OFFSET e DIGITAL são processos distintos. Não misture as configurações de materiais automáticos entre eles.

Estrutura de saída esperada:
{
  "produto": string,
  "quantidade": number,
  "tamanhoFinal": string,
  "frenteVerso": boolean,
  "cores": "1/0" | "1/1" | "4/0" | "4/1" | "4/4",
  "modoImpressao": "SIMPLES" | "MISTO",
  "coresMistas": [{ "tipo": string, "paginas": number }],
  "tipoImpressao": "DIGITAL" | "OFFSET",
  "maquina": string,
  "papeis": [{ "nome": string, "gramatura": number, "compraEm": "Folha" | "Pacote", "descricao": string }],
  "paginas": number,
  "materiais": { "laserFilme": boolean, "espiral": boolean, "capaEncadernacao": boolean, "fitaDuplaFace": boolean, "bobinaPolietileno": boolean, "adesivoVinil": boolean, "bolsaPasta": boolean },
  "acabamentos": { "plastificacao": boolean, "espiral": boolean, "grampo": boolean, "dobra": boolean, "alceamento": boolean, "colagemCapa": boolean, "vinco": boolean },
  "observacoes": string
}
`;

export class BudgetInterpreter {
  static async parseText(text: string): Promise<ProductionInput> {
    // Lazy initialization to ensure API key is available
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Interprete este pedido gráfico e gere o JSON: "${text}"`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              produto: { type: Type.STRING },
              quantidade: { type: Type.NUMBER },
              tamanhoFinal: { type: Type.STRING },
              frenteVerso: { type: Type.BOOLEAN },
              cores: { type: Type.STRING, enum: ["1/0", "1/1", "4/0", "4/1", "4/4"] },
              modoImpressao: { type: Type.STRING, enum: ["SIMPLES", "MISTO"] },
              coresMistas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tipo: { type: Type.STRING, enum: ["1/0", "1/1", "4/0", "4/1", "4/4"] },
                    paginas: { type: Type.NUMBER }
                  }
                }
              },
              tipoImpressao: { type: Type.STRING, enum: ["DIGITAL", "OFFSET"] },
              maquina: { type: Type.STRING },
              papeis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    gramatura: { type: Type.NUMBER },
                    compraEm: { type: Type.STRING, enum: ["Folha", "Pacote"] },
                    descricao: { type: Type.STRING }
                  },
                  required: ["nome", "gramatura", "compraEm"]
                }
              },
              paginas: { type: Type.NUMBER },
              materiais: {
                type: Type.OBJECT,
                properties: {
                  laserFilme: { type: Type.BOOLEAN },
                  espiral: { type: Type.BOOLEAN },
                  capaEncadernacao: { type: Type.BOOLEAN },
                  fitaDuplaFace: { type: Type.BOOLEAN },
                  bobinaPolietileno: { type: Type.BOOLEAN },
                  adesivoVinil: { type: Type.BOOLEAN },
                  bolsaPasta: { type: Type.BOOLEAN }
                }
              },
              acabamentos: {
                type: Type.OBJECT,
                properties: {
                  plastificacao: { type: Type.BOOLEAN },
                  espiral: { type: Type.BOOLEAN },
                  grampo: { type: Type.BOOLEAN },
                  dobra: { type: Type.BOOLEAN },
                  alceamento: { type: Type.BOOLEAN },
                  colagemCapa: { type: Type.BOOLEAN },
                  vinco: { type: Type.BOOLEAN }
                }
              },
              observacoes: { type: Type.STRING }
            },
            required: ["produto", "quantidade", "tamanhoFinal", "tipoImpressao", "maquina", "papeis", "acabamentos"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Resposta vazia da IA");
      }

      const parsed = JSON.parse(response.text);
      
      // REGRA: Se o produto for Folder, o papel padrão deve ser Offset 120g se não especificado
      if (parsed.produto && parsed.produto.toLowerCase().includes('folder')) {
        if (!parsed.papeis || parsed.papeis.length === 0) {
          parsed.papeis = [{ nome: "Offset 120g", gramatura: 120, compraEm: "Folha", descricao: "Papel padrão para folder" }];
        }
      }
      // REGRA: Cartilha/Livro -> Capa 180g + Miolo 75g como padrão
      if (parsed.produto && (parsed.produto.toLowerCase().includes('cartilha') || parsed.produto.toLowerCase().includes('livro'))) {
        if (!parsed.papeis || parsed.papeis.length === 0) {
          parsed.papeis = [
            { nome: "Cartolina Branca", gramatura: 180, compraEm: "Folha", descricao: "CAPA" },
            { nome: "Offset", gramatura: 75, compraEm: "Folha", descricao: "MIOLO" }
          ];
        }
      }
      // Ensure all required structures exist to prevent UI crashes
      const result: ProductionInput = {
        produto: parsed.produto || "",
        quantidade: parsed.quantidade || 0,
        tamanhoFinal: parsed.tamanhoFinal || "",
        frenteVerso: !!parsed.frenteVerso,
        cores: parsed.cores || "4/0",
        modoImpressao: parsed.modoImpressao || "SIMPLES",
        coresMistas: Array.isArray(parsed.coresMistas) ? parsed.coresMistas : [],
        tipoImpressao: parsed.tipoImpressao || "DIGITAL",
        maquina: parsed.maquina || "",
        papeis: Array.isArray(parsed.papeis) ? parsed.papeis : [],
        paginas: parsed.paginas || 0,
        materiais: {
          laserFilme: !!parsed.materiais?.laserFilme,
          laserFilmeQtd: parsed.materiais?.laserFilmeQtd || 0,
          espiral: !!parsed.materiais?.espiral,
          espiralFolhasUnidade: parsed.materiais?.espiralFolhasUnidade || 0,
          capaEncadernacao: !!parsed.materiais?.capaEncadernacao,
          fitaDuplaFace: !!parsed.materiais?.fitaDuplaFace,
          bobinaPolietileno: !!parsed.materiais?.bobinaPolietileno,
          adesivoVinil: !!parsed.materiais?.adesivoVinil,
          bolsaPasta: !!parsed.materiais?.bolsaPasta,
        },
        acabamentos: {
          plastificacao: !!parsed.acabamentos?.plastificacao,
          espiral: !!parsed.acabamentos?.espiral,
          grampo: !!parsed.acabamentos?.grampo,
          dobra: !!parsed.acabamentos?.dobra,
          alceamento: !!parsed.acabamentos?.alceamento,
          colagemCapa: !!parsed.acabamentos?.colagemCapa,
          vinco: !!parsed.acabamentos?.vinco,
        },
        observacoes: parsed.observacoes || ""
      };

      return result;
    } catch (error) {
      console.error("Erro ao interpretar texto com IA:", error);
      throw error;
    }
  }
}

export class GraphicEngine {
  static calculate(input: ProductionInput, base: BaseData): CalculatedProduction {
    // Safety check for input
    if (!input) throw new Error("Input de produção não fornecido");
    if (!input.papeis) input.papeis = [];
    if (!input.acabamentos) input.acabamentos = { plastificacao: false, espiral: false, grampo: false, dobra: false, alceamento: false, colagemCapa: false, vinco: false };
    if (!input.materiais) input.materiais = { laserFilme: false, espiral: false, capaEncadernacao: false, fitaDuplaFace: false, bobinaPolietileno: false, adesivoVinil: false, bolsaPasta: false };
    if (!input.produto) input.produto = "Produto Indefinido";

    // 1. Identificar se é livreto/cartilha
    const isBooklet = (input.paginas && input.paginas > 0) || 
                      input.produto.toUpperCase().includes('CARTILHA') || 
                      input.produto.toUpperCase().includes('LIVRO');

    const { unidades: unidadesPorFolha, formato: formatoFolha } = this.calculateImposition(input.tamanhoFinal);
    
    // 2. Calcular componentes e folhas
    const componentes: CalculatedComponent[] = input.papeis.map(p => {
      let compFolhas = 0;
      const desc = (p.descricao || '').toUpperCase();
      
      if (isBooklet && input.paginas) {
        if (desc.includes('MIOLO')) {
          if (input.modoImpressao === 'MISTO') {
            const totalPaginasMistas = input.coresMistas.reduce((acc, c) => acc + c.paginas, 0);
            compFolhas = Math.ceil((totalPaginasMistas / 4) * input.quantidade);
          } else {
            compFolhas = Math.ceil((input.paginas / 4) * input.quantidade);
          }
        } else if (desc.includes('CAPA')) {
          compFolhas = input.quantidade;
        } else {
          compFolhas = Math.ceil(input.quantidade / unidadesPorFolha);
        }
      } else {
        compFolhas = Math.ceil(input.quantidade / unidadesPorFolha);
      }

      // REGRA: Em impressão digital Frente e Verso, a quantidade de "impressões" para custo 
      // deve ser igual à de folhas, pois o preço unitário F/V já contempla os dois lados.
      // Em Offset, cada lado é uma passada/impressão distinta.
      const compImpressoes = (input.tipoImpressao === 'DIGITAL' && input.frenteVerso) ? compFolhas : (input.frenteVerso ? compFolhas * 2 : compFolhas);
      
      return {
        nome: p.descricao || input.produto,
        papelSugerido: p.nome,
        gramatura: p.gramatura,
        unidadesPorFolha,
        totalFolhas: compFolhas,
        formatoFolha,
        totalImpressoes: compImpressoes,
        folhas66x96Necessarias: 0
      };
    });

    // Total para cálculo de tempo (normalizado para A4 se necessário)
    let totalFolhasA4Equivalentes = 0;
    componentes.forEach(c => {
      if (c.formatoFolha === 'A3') {
        totalFolhasA4Equivalentes += c.totalFolhas * 2;
      } else {
        totalFolhasA4Equivalentes += c.totalFolhas;
      }
    });
    
    // 3. Offset Specifics (Chapas e Passadas)
    let chapas = 0;
    let passadas = 0;
    let folhas66x96 = 0;

    if (input.tipoImpressao === 'OFFSET') {
      folhas66x96 = Math.ceil(totalFolhasA4Equivalentes / 8); 
      
      componentes.forEach(c => {
        const equivA4 = c.formatoFolha === 'A3' ? c.totalFolhas * 2 : c.totalFolhas;
        c.folhas66x96Necessarias = Math.ceil(equivA4 / 8);
      });

      if (input.modoImpressao === 'MISTO') {
        chapas = (input.coresMistas || []).reduce((acc, c) => acc + this.calculatePlates(c.tipo), 0);
      } else {
        chapas = this.calculatePlates(input.cores);
      }

      const maquinaOffset = (base.maquinasOffset || []).find(m => 
        m.maquina.toUpperCase().includes(input.maquina.toUpperCase()) ||
        input.maquina.toUpperCase().includes(m.maquina.toUpperCase())
      );
      
      const maquinaNome = maquinaOffset ? maquinaOffset.maquina : input.maquina;

      if (maquinaOffset) {
        passadas = Math.ceil(chapas / maquinaOffset.coresRodada);
      } else {
        passadas = chapas;
      }
    }

    // 4. Tempos de Máquina e Mão de Obra
    let tempoImpressaoMin = 0;
    let velocidadeStr = "";
    let tempoImpressorMin = 0;
    let tempoDesignerMin = 0;
    let tempoOrcamentistaMin = Math.max(10, (base.parametrosProducao || []).find(p => p.chave.includes('Orçamentista'))?.valor || 10);

    if (input.tipoImpressao === 'DIGITAL') {
      const maquinaDigital = (base.maquinasDigitais || []).find(m => 
        m.maquina.toUpperCase().includes(input.maquina.toUpperCase()) ||
        input.maquina.toUpperCase().includes(m.maquina.toUpperCase())
      );

      // Calcula tempo componente a componente usando as velocidades A3 ou A4 conforme definido na base
      componentes.forEach(c => {
        let vel = 45;
        if (maquinaDigital) {
          if (c.formatoFolha === 'A3') {
            vel = input.frenteVerso ? maquinaDigital.a3FvMinuto : maquinaDigital.a3Minuto;
          } else {
            vel = input.frenteVerso ? maquinaDigital.a4FvMinuto : maquinaDigital.a4Minuto;
          }
        }
        
        // Proteção contra velocidade zero para evitar divisão por zero
        if (vel <= 0) vel = 45;
        
        const compTime = Math.ceil(c.totalFolhas / vel);
        tempoImpressaoMin += compTime;
      });

      if (maquinaDigital) {
        velocidadeStr = `Dinâmica (${maquinaDigital.maquina})`;
      } else {
        velocidadeStr = "45 A4/min (padrão)";
      }

      const prepDesigner = (base.parametrosProducao || []).find(p => p.chave.includes('Designer'))?.valor || 20;

      // Se a máquina é operada pelo designer ou é da programação visual
      if (maquinaDigital?.operador === "DESIGNER GRÁFICO" || input.maquina.toUpperCase().includes('PROGRAMAÇÃO VISUAL')) {
        tempoDesignerMin = tempoImpressaoMin + prepDesigner;
     } else if (input.maquina.toUpperCase().includes('HAMILTON') || maquinaDigital?.operador.toUpperCase().includes('IMPRESSOR DIGITAL')) {
        tempoImpressorMin = tempoImpressaoMin + 15;
      } else {
        tempoImpressorMin = tempoImpressaoMin;
      }
    } else {
      const maquinaOffset = (base.maquinasOffset || []).find(m => m.maquina === input.maquina);
      let velHora = maquinaOffset?.producaoHora || 5000;
      const tempoBaseHoras = totalFolhasA4Equivalentes / velHora;
      tempoImpressaoMin = Math.ceil(tempoBaseHoras * passadas * 60);
      velocidadeStr = `${velHora}/hora`;

      const acerto = (base.parametrosProducao || []).find(p => p.chave.includes('Acerto offset'))?.valor || 30;
      const trocaCor = (base.parametrosProducao || []).find(p => p.chave.includes('Troca de cor offset'))?.valor || 30;
      
      let numTrocas = 0;
      if (maquinaOffset) {
        numTrocas = Math.max(0, passadas - 1);
      }
      
      tempoImpressorMin = tempoImpressaoMin + acerto + (numTrocas * trocaCor);
    }

    // 5. Tempos de Acabamento
    const temposAcabamento = {
      plastificacao: 0,
      espiral: 0,
      grampo: 0,
      dobra: 0,
      alceamento: 0,
      colagemCapa: 0,
      vinco: 0
    };

    const getVelAcab = (proc: string) => (base.temposAcabamento || []).find(t => t.processo.toLowerCase().includes(proc.toLowerCase()))?.velocidade || 10;

    if (input.acabamentos.plastificacao) {
      temposAcabamento.plastificacao = Math.ceil(input.quantidade / getVelAcab('Plastificação'));
    }
    if (input.acabamentos.espiral) {
      temposAcabamento.espiral = Math.ceil(input.quantidade / getVelAcab('Espiral'));
    }
    if (input.acabamentos.grampo) {
      temposAcabamento.grampo = Math.ceil(input.quantidade / getVelAcab('Grampo'));
    }
    if (input.acabamentos.dobra) {
      const isCartilha = input.produto.toUpperCase().includes('CARTILHA');
      const vel = isCartilha ? getVelAcab('Dobra cartilha') : getVelAcab('Dobra folder');
      temposAcabamento.dobra = Math.ceil(input.quantidade / vel);
    }
    if (input.acabamentos.alceamento) {
      const paginas = input.paginas || 4;
      const cadernos = Math.ceil(paginas / 4);
      temposAcabamento.alceamento = Math.ceil((input.quantidade * cadernos) / getVelAcab('Alceamento'));
    }
    if (input.acabamentos.colagemCapa) {
      temposAcabamento.colagemCapa = Math.ceil(input.quantidade / getVelAcab('Colagem capa livro'));
    }
    if (input.acabamentos.vinco) {
      temposAcabamento.vinco = Math.ceil(input.quantidade / getVelAcab('Vinco'));
    }

    // 6. Corte / Guilhotina
    let tempoGuilhotinaMin = 0;
    const findCorte = (prod: string) => {
      const p = prod.toLowerCase();
      const corteTable = base.corteGuilhotina || [];
      if (p.includes('cartão')) return corteTable.find(c => c.tipoProduto.includes('Cartões'));
      if (p.includes('adesivo')) return corteTable.find(c => c.tipoProduto.includes('Adesivos'));
      if (p.includes('capa')) return corteTable.find(c => c.tipoProduto.includes('Capas'));
      if (p.includes('panfleto') || p.includes('revista')) return corteTable.find(c => c.tipoProduto.includes('Revistas'));
      if (p.includes('cartaz')) return corteTable.find(c => c.tipoProduto.includes('Cartazes'));
      return corteTable.find(c => c.tipoProduto.includes('Refile'));
    };

    const corteParam = findCorte(input.produto);
    if (corteParam) {
      const setup = (base.parametrosProducao || []).find(p => p.chave.includes('Preparação corte'))?.valor || 10;
      
      // 1. Corte de Estoque (Preparar o papel para a impressora)
      // Estimativa: 10 minutos para cada 100 folhas grandes (66x96)
      const tempoCorteEstoque = Math.ceil(folhas66x96 / 100) * 10;

      // 2. Refile Final (Dar o acabamento no material impresso)
      // Estimativa: O tempo médio da tabela é aplicado a cada lote de 500 unidades
      const tempoMedio = (corteParam.tempoMin + corteParam.tempoMax) / 2;
      const fatorEscala = Math.ceil(input.quantidade / 500);
      const tempoRefileFinal = tempoMedio * fatorEscala;

      let tempoBase = setup + tempoCorteEstoque + tempoRefileFinal;
      
      const isPapelDificil = input.papeis.some(p => p.gramatura > 240);
      if (isPapelDificil) tempoBase *= 1.2;
      tempoBase *= 1.1; // Margem de segurança
      
      tempoGuilhotinaMin = Math.ceil(tempoBase);
    }

    const somaAcabamentos = Object.values(temposAcabamento).reduce((a, b) => a + b, 0);
    const tempoOperadoresMin = tempoGuilhotinaMin + somaAcabamentos;
    const tempoTotalMin = tempoOperadoresMin + tempoDesignerMin + tempoOrcamentistaMin + tempoImpressorMin;

    const resumoTecnico: TechnicalSummary = {
      tipoProducao: input.tipoImpressao,
      maquina: input.maquina,
      velocidadeAplicada: velocidadeStr,
      quantidadeProduzida: input.quantidade,
      passadas: passadas,
      chapas: chapas,
      tempoImpressaoMin: tempoImpressaoMin,
      tempoOperadoresMin: tempoOperadoresMin,
      tempoTotalMin: tempoTotalMin,
      detalhesCorte: corteParam ? `${corteParam.tipoProduto} (${tempoGuilhotinaMin} min)` : undefined,
      temposAcabamento: Object.fromEntries(Object.entries(temposAcabamento).filter(([_, v]) => v > 0))
    };

    const materiais = this.calculateMaterials(input, chapas);

    const result: CalculatedProduction = {
      input,
      componentes,
      chapas,
      passadas,
      tempoImpressaoMin,
      tempoGuilhotinaMin,
      tempoDesignerMin,
      tempoOrcamentistaMin,
      tempoImpressorMin,
      temposAcabamento,
      materiais,
      resumoTecnico,
      acrescimoOffset: input.tipoImpressao === 'OFFSET' ? 0.1 : 0,
    };

    result.producaoEngine = ProductionEngine.calculate(input, base, result);
    resumoTecnico.producaoEngine = result.producaoEngine;

    // Ajuste 2: Regra para Cartazes em Impressão Digital
    const isCartazDigital = input.produto.toUpperCase().includes('CARTAZ') && input.tipoImpressao === 'DIGITAL';
    if (isCartazDigital) {
      result.tempoImpressorMin = 0;
      result.tempoGuilhotinaMin = 0;
      result.tempoOrcamentistaMin = 0; // "Apenas calcular tempo e custo do designer"
      result.temposAcabamento = {
        plastificacao: 0,
        espiral: 0,
        grampo: 0,
        dobra: 0,
        alceamento: 0,
        colagemCapa: 0,
        vinco: 0
      };
      // Atualizar resumo técnico
      resumoTecnico.tempoOperadoresMin = 0;
      resumoTecnico.temposAcabamento = {};
      resumoTecnico.tempoTotalMin = result.tempoDesignerMin;
    }

    return result;
  }

  private static calculatePlates(cores: string): number {
    switch (cores) {
      case '1/0': return 1;
      case '1/1': return 2;
      case '4/0': return 4;
      case '4/1': return 5;
      case '4/4': return 8;
      default: return 0;
    }
  }

  private static calculateBestFit(itemW: number, itemH: number, sheetW: number, sheetH: number): number {
    if (itemW <= 0 || itemH <= 0 || sheetW <= 0 || sheetH <= 0) return 0;
    // Tenta as duas orientações
    const fit1 = Math.floor(sheetW / itemW) * Math.floor(sheetH / itemH);
    const fit2 = Math.floor(sheetW / itemH) * Math.floor(sheetH / itemW);
    return Math.max(fit1, fit2, 0);
  }

  private static calculateMaterials(input: ProductionInput, chapas: number): CalculatedMaterial[] {
    const materiais: CalculatedMaterial[] = [];
    if (!input.materiais) input.materiais = { laserFilme: false, espiral: false, capaEncadernacao: false, fitaDuplaFace: false, bobinaPolietileno: false, adesivoVinil: false, bolsaPasta: false };

    // Ajuste 5: OFFSET -> CTP AUTOMÁTICO
    if (input.tipoImpressao === 'OFFSET') {
      const maquinaUpper = input.maquina.toUpperCase();
      let maquinaTag = 'SAKURAI';
      if (maquinaUpper.includes('HEIDELBERG')) maquinaTag = 'HEIDELBERG';
      
      materiais.push({
        nome: `Chapa Offset Térmica Digital (CTP) - ${maquinaTag}`,
        tipo: 'Chapa',
        quantidade: chapas,
        unidade: 'un'
      });
    }

    // Grampo
    if (input.acabamentos.grampo) {
      materiais.push({
        nome: 'Grampo para Grampeadora',
        tipo: 'Fixação',
        quantidade: input.quantidade * 2, // 2 grampos por unidade
        unidade: 'un'
      });
    }

    // Espiral
    if (input.acabamentos.espiral || input.materiais.espiral) {
      const folhas = input.materiais.espiralFolhasUnidade || (input.paginas ? Math.ceil(input.paginas / 2) : 50);
      let modelo = '50 mm';
      if (folhas <= 25) modelo = '7 mm';
      else if (folhas <= 50) modelo = '9 mm';
      else if (folhas <= 70) modelo = '12 mm';
      else if (folhas <= 85) modelo = '14 mm';
      else if (folhas <= 100) modelo = '17 mm';
      else if (folhas <= 120) modelo = '20 mm';
      else if (folhas <= 140) modelo = '23 mm';
      else if (folhas <= 160) modelo = '25 mm';
      else if (folhas <= 200) modelo = '29 mm';
      else if (folhas <= 250) modelo = '33 mm';
      else if (folhas <= 350) modelo = '40 mm';
      else if (folhas <= 400) modelo = '45 mm';

      materiais.push({
        nome: `Espiral ${modelo}`,
        tipo: 'Espiral',
        quantidade: input.quantidade,
        unidade: 'un'
      });
    }

    // Plastificação / Bobina Polietileno (Ajustado para priorizar menor consumo na bobina de 34cm)
    if (input.acabamentos.plastificacao || input.materiais.bobinaPolietileno) {
      const dims = input.tamanhoFinal.toLowerCase().match(/(\d+[,.]?\d*)\s*x\s*(\d+[,.]?\d*)/);
      let itemW = 0, itemH = 0;
      
      if (dims) {
        itemW = parseFloat(dims[1].replace(',', '.'));
        itemH = parseFloat(dims[2].replace(',', '.'));
      } else {
        // Fallback para tamanhos padrão
        const t = input.tamanhoFinal.toUpperCase();
        if (t.includes('A4')) { itemW = 21; itemH = 29.7; }
        else if (t.includes('A3')) { itemW = 29.7; itemH = 42; }
        else if (t.includes('A5')) { itemW = 14.8; itemH = 21; }
        else if (t.includes('A6')) { itemW = 10.5; itemH = 14.8; }
        else if (t.includes('10X14')) { itemW = 10; itemH = 14; }
        else if (t.includes('10X15')) { itemW = 10; itemH = 15; }
        else if (t.includes('9X5')) { itemW = 9; itemH = 5; }
      }

      if (itemW > 0 && itemH > 0) {
        const rollWidth = 34; // Largura padrão da bobina informada pelo usuário
        
        // Testa as duas orientações para ver qual cabe mais na largura da bobina 
        // e qual consome menos comprimento linear
        const fit1 = Math.floor(rollWidth / itemW);
        const length1 = fit1 > 0 ? itemH : Infinity;
        
        const fit2 = Math.floor(rollWidth / itemH);
        const length2 = fit2 > 0 ? itemW : Infinity;
        
        let bestFitRoll = 0;
        let usedLength = 0;
        
        // Escolhe a orientação que consome menos material linear
        if (length2 < length1) {
          bestFitRoll = fit2;
          usedLength = length2;
        } else if (fit1 > 0) {
          bestFitRoll = fit1;
          usedLength = length1;
        }

        // Se não couber em nenhuma orientação (item maior que 34cm), 
        // usa o maior lado como o que fica "para fora" da bobina (embora vá sobrar material)
        if (bestFitRoll <= 0) {
          bestFitRoll = 1;
          usedLength = Math.max(itemW, itemH);
        }

        // Cálculo final: (Qtd / Quantos cabem na largura) * Comprimento daquela orientação
        const rollCm = Math.ceil(input.quantidade / bestFitRoll) * usedLength;

        materiais.push({
          nome: 'Bobina Polietileno (Plastificação)',
          tipo: 'Plastificação',
          /// 1.1 de margem para compensar refile/espaçamento entre itens se necessário
          quantidade: Math.ceil(rollCm), 
          unidade: 'cm'
        });
      }
    }

    // Alceamento (Cartilha)
    if (input.acabamentos.alceamento) {
      // Alceamento é processo, mas pode ser associado a grampo se for cartilha
    }

    // Colagem Capa (Livro)
    if (input.acabamentos.colagemCapa) {
      materiais.push({
        nome: 'Cola Hotmelt (Lombada Quadrada)',
        tipo: 'Cola',
        quantidade: input.quantidade,
        unidade: 'un'
      });
    }

    // Vinco / Vinco Laser Filme
    // Laser Filme (Ajuste 4: REMOVIDO AUTOMÁTICO)
    if (input.materiais.laserFilme) {
      materiais.push({
        nome: 'Laser Filme',
        tipo: 'Filme',
        quantidade: input.materiais.laserFilmeQtd || 1,
        unidade: 'un'
      });
    }

    // Capa Encadernação
    if (input.materiais.capaEncadernacao) {
      materiais.push({
        nome: 'Capa para Encadernação Transparente',
        tipo: 'Capa',
        quantidade: input.quantidade,
        unidade: 'un'
      });
      materiais.push({
        nome: 'Capa para Encadernação Preta',
        tipo: 'Capa',
        quantidade: input.quantidade,
        unidade: 'un'
      });
    }

    // Fita Dupla Face
    if (input.materiais.fitaDuplaFace) {
      const dims = input.tamanhoFinal.toLowerCase().match(/(\d+[,.]?\d*)\s*x\s*(\d+[,.]?\d*)/);
      let largura = '50mm';
      let cmTotal = 0;
      if (dims) {
        const w = parseFloat(dims[1].replace(',', '.'));
        const h = parseFloat(dims[2].replace(',', '.'));
        if (w <= 10 && h <= 10) largura = '19mm';
        else if (w <= 20 && h <= 20) largura = '25mm';
        cmTotal = (w + h) * 2 * input.quantidade;
      }
      
      materiais.push({
        nome: `Fita Dupla Face ${largura}`,
        tipo: 'Fita',
        quantidade: cmTotal,
        unidade: 'cm'
      });
    }

    // Adesivo Vinil
    if (input.materiais.adesivoVinil) {
      materiais.push({
        nome: 'Adesivo Vinil',
        tipo: 'Adesivo',
        quantidade: input.quantidade,
        unidade: 'un'
      });
    }

    // Bolsa para Pastas (Ajuste 2)
    if (input.materiais.bolsaPasta || input.produto.toLowerCase().includes('pasta')) {
      materiais.push({
        nome: 'Bolsa para Pastas',
        tipo: 'Bolsa',
        quantidade: input.quantidade,
        unidade: 'un'
      });
    }

    return materiais;
  }

  private static calculateImposition(tamanho: string): { unidades: number, formato: string } {
    const t = tamanho.toUpperCase();
    
    // 1. Tamanhos Padrão (Atalhos)
    if (t.includes('A3')) return { unidades: 1, formato: 'A3' };
    if (t.includes('A4')) return { unidades: 1, formato: 'A4' };
    if (t.includes('A5')) return { unidades: 2, formato: 'A4' };
    if (t.includes('A6')) return { unidades: 4, formato: 'A4' };

    // 2. Cálculo Dinâmico para tamanhos customizados (ex: 10x6)
    // Captura números e unidades opcionais (cm, mm)
    const match = tamanho.match(/(\d+[,.]?\d*)\s*(CM|MM)?\s*x\s*(\d+[,.]?\d*)\s*(CM|MM)?/i);
    
    if (match) {
      let w = parseFloat(match[1].replace(',', '.'));
      let h = parseFloat(match[3].replace(',', '.'));
      const unit1 = match[2]?.toUpperCase() || 'CM'; 
      const unit2 = match[4]?.toUpperCase() || unit1;

      if (unit1 === 'MM') w /= 10;
      if (unit2 === 'MM') h /= 10;

      if (w > 0 && h > 0) {
        // Consideramos uma margem de segurança e sangria (bleed)
        // Área útil A4: ~210 x 297 mm -> com margens de 7mm -> 19.6 x 28.3 cm
        // Sangria padrão: 3mm de cada lado -> +0.6cm no tamanho do item
        const itemW = w + 0.6;
        const itemH = h + 0.6;
        
        const a4W = 19.6;
        const a4H = 28.3;

        // Orientação 1
        const n1 = Math.floor(a4W / itemW) * Math.floor(a4H / itemH);
        // Orientação 2
        const n2 = Math.floor(a4W / itemH) * Math.floor(a4H / itemW);
        
        const unidadesA4 = Math.max(n1, n2);

        // Se couber pelo menos 1 no A4, usamos A4
        if (unidadesA4 > 0) {
          return { unidades: unidadesA4, formato: 'A4' };
        }

        // Se não couber no A4, tentamos A3 (297 x 420 mm -> 28.3 x 40.6 cm)
        const a3W = 28.3;
        const a3H = 40.6;
        const n3 = Math.floor(a3W / itemW) * Math.floor(a3H / itemH);
        const n4 = Math.floor(a3W / itemH) * Math.floor(a3H / itemW);
        const unidadesA3 = Math.max(n3, n4);

        if (unidadesA3 > 0) {
          return { unidades: unidadesA3, formato: 'A3' };
        }
      }
    }

    // Fallbacks para strings conhecidas se o regex falhar
    if (t.includes('10X15')) return { unidades: 2, formato: 'A4' };
    if (t.includes('9X5') || t.includes('CARTÃO')) return { unidades: 10, formato: 'A4' };

    return { unidades: 1, formato: 'A4' };
  }
}

export class BudgetMapper {
  static normalize(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  static findPapel(search: { nome: string, gramatura: number }, basePapeis: any[]): number {
    if (!Array.isArray(basePapeis)) return -1;
    
    const term = search.nome ? this.normalize(search.nome) : "";
    const gramatura = search.gramatura;

    // 1. Tentativa Exata (Nome + Gramatura)
    let index = basePapeis.findIndex(p => {
      if (!p || !p.nome) return false;
      const pName = this.normalize(p.nome);
      
      // Se tivermos nome, verificamos se um contém o outro
      const hasName = term ? (pName.includes(term) || term.includes(pName)) : true;
      // Verifica gramatura se fornecida
      const hasGramatura = gramatura > 0 ? p.nome.includes(gramatura.toString()) : true;
      
      return term ? (hasName && hasGramatura) : (gramatura > 0 && hasGramatura);
    });

    if (index >= 0) return index;

    // 2. Se não encontrou e temos gramatura, tenta buscar apenas pela gramatura em papéis comuns
    if (gramatura > 0) {
      index = basePapeis.findIndex(p => {
        if (!p || !p.nome) return false;
        return p.nome.includes(gramatura.toString());
      });
      if (index >= 0) return index;
    }

    // 3. Tentativa Parcial (Primeira palavra significativa + Gramatura)
    if (term) {
      const words = term.split(' ').filter(w => w.length > 2);
      if (words.length > 0) {
        const firstWord = words[0];
        index = basePapeis.findIndex(p => {
          if (!p || !p.nome) return false;
          const pName = this.normalize(p.nome);
          const hasName = pName.includes(firstWord);
          const hasGramatura = gramatura > 0 ? p.nome.includes(gramatura.toString()) : true;
          return hasName && hasGramatura;
        });
      }
    }

    if (index >= 0) return index;

    // 4. Tentativa Apenas Nome (Ignorando Gramatura - Fallback)
    if (term) {
      index = basePapeis.findIndex(p => {
        if (!p || !p.nome) return false;
        const pName = this.normalize(p.nome);
        return pName.includes(term) || term.includes(pName);
      });
    }

    return index;
  }

  static findProfissional(nome: string, baseMaoObra: any[]): number {
    if (!nome || !Array.isArray(baseMaoObra)) return -1;
    const term = this.normalize(nome);
    return baseMaoObra.findIndex(p => p && p.profissional && this.normalize(p.profissional).includes(term));
  }
}

export class OrderBrain {
  private static PRODUCT_SYNONYMS: Record<string, string[]> = {
    "Cartaz": ["cartaz", "cartazes", "poster"],
    "Cartão de Visita": ["cartão", "cartões", "cartao de visita", "cartao"],
    "Folder": ["folder", "panfleto", "folheto", "flyer"],
    "Pasta": ["pasta", "pasta com vinco"],
    "Credencial": ["credencial", "crachá", "cracha"],
    "Adesivo": ["adesivo", "sticker", "etiqueta"],
    "Banner": ["banner", "lona"],
    "Envelope": ["envelope"],
    "Talão": ["talão", "talao", "bloco"],
    "Receituário": ["receituário", "receituario"],
    "Tag": ["tag", "etiqueta de roupa"]
  };

  private static SIZE_DICTIONARY: Record<string, string[]> = {
    "A4": ["a4"],
    "A3": ["a3"],
    "A5": ["a5"],
    "10x15": ["10x15", "10 x 15"],
    "9x5": ["9x5", "9 x 5"]
  };

  private static FINISH_DICTIONARY: Record<string, string[]> = {
    "dobra": ["dobra", "dobrado", "2 dobras", "3 dobras"],
    "vinco": ["vinco"],
    "grampo": ["grampeado", "grampo"],
    "espiral": ["espiral"],
    "plastificacao": ["plastificado", "plastificação", "plastificacao"]
  };

  private static EDITABLE_DICTIONARY: Record<string, string> = {
    "panfleto": "Folder",
    "poster": "Cartaz",
    "crachá": "Credencial",
    "cracha": "Credencial",
    "folheto": "Folder",
    "flyer": "Folder"
  };

  static motorInterpretacaoPedido(text: string, baseData: BaseData): any {
    const normalizedText = text.toLowerCase();
    const result: any = {
      produto: "",
      quantidade: 0,
      tamanho: "",
      papel: "",
      gramatura: 0,
      cores: "",
      acabamentos: [] as string[],
      tipoImpressao: ""
    };

    // 1. Produto (usando sinônimos e dicionário editável)
    for (const [word, interpretation] of Object.entries(this.EDITABLE_DICTIONARY)) {
      if (normalizedText.includes(word)) {
        result.produto = interpretation;
        break;
      }
    }

    if (!result.produto) {
      for (const [prod, synonyms] of Object.entries(this.PRODUCT_SYNONYMS)) {
        if (synonyms.some(syn => normalizedText.includes(syn))) {
          result.produto = prod;
          break;
        }
      }
    }

    // REGRA: Papel padrão para Folder
    if (result.produto === "Folder") {
      result.papel = "Offset";
      result.gramatura = 120;
    }

    // 2. Quantidade (Primeiro número da frase)
    const qtyMatch = text.match(/\b\d{1,6}\b/);
    if (qtyMatch) {
      result.quantidade = parseInt(qtyMatch[0]);
    }

    // 3. Tamanho
    for (const [size, synonyms] of Object.entries(this.SIZE_DICTIONARY)) {
      if (synonyms.some(syn => normalizedText.includes(syn))) {
        result.tamanho = size;
        break;
      }
    }
    // Regex para tamanhos customizados (ex: 10x15)
    const customSizeMatch = text.match(/(\d+[,.]?\d*)\s*x\s*(\d+[,.]?\d*)/i);
    if (customSizeMatch && !result.tamanho) {
      result.tamanho = `${customSizeMatch[1]}x${customSizeMatch[2]}`;
    }

    // 4. Gramatura e Papel
    const grammageMatch = text.match(/(\d+)\s*(g|gramas)/i);
    if (grammageMatch) {
      const grammage = parseInt(grammageMatch[1]);
      result.gramatura = grammage;
      // Procurar no cadastro de papéis
      const papelIndex = BudgetMapper.findPapel({ nome: "", gramatura: grammage }, baseData.papeis);
      if (papelIndex >= 0) {
        result.papel = baseData.papeis[papelIndex].nome;
      }
    }

    // 5. Cores
    const colorMatch = text.match(/[14]\/[014]/);
    if (colorMatch) {
      result.cores = colorMatch[0];
    } else if (normalizedText.includes("colorido")) {
      result.cores = "4/0";
    } else if (normalizedText.includes("preto e branco") || normalizedText.includes("p&b")) {
      result.cores = "1/0";
    }

    // 6. Acabamentos
    for (const [finish, synonyms] of Object.entries(this.FINISH_DICTIONARY)) {
      if (synonyms.some(syn => normalizedText.includes(syn))) {
        result.acabamentos.push(finish);
      }
    }

    // 7. Tipo de Impressão
    if (normalizedText.includes("digital")) result.tipoImpressao = "DIGITAL";
    else if (normalizedText.includes("offset")) result.tipoImpressao = "OFFSET";

    return result;
  }
}

export class ProductionEngine {
  static calculate(input: ProductionInput, base: BaseData, calculated: CalculatedProduction): ProductionEngineOutput {
    // 1. PREPARAÇÃO
    const tempo_preparacao = 10;
    const taxaPreparacao = (base.maoObra || []).find(m => m.profissional.toUpperCase().includes('ORÇAMENTISTA'))?.hora || 41.37;
    const custo_preparacao = (tempo_preparacao / 60) * taxaPreparacao;

    // 2. IMPRESSÃO
    let tempo_impressao = 0;
    const setup_impressao = 5;
    
    const totalFolhas = calculated.componentes.reduce((acc, c) => acc + c.totalFolhas, 0);
    
    if (input.tipoImpressao === 'DIGITAL') {
      let velocidade = 45;
      const maquinaNome = (input.maquina || '').toUpperCase();
      
      const maqBase = (base.maquinasDigitais || []).find(m =>
        m.maquina.toUpperCase().includes(maquinaNome) ||
        maquinaNome.includes(m.maquina.toUpperCase())
      );
      if (maqBase) {
        const isA3 = calculated.componentes.some(c => c.formatoFolha === 'A3');
        if (isA3) {
          velocidade = input.frenteVerso ? maqBase.a3FvMinuto : maqBase.a3Minuto;
        } else {
          velocidade = input.frenteVerso ? maqBase.a4FvMinuto : maqBase.a4Minuto;
        }
        if (velocidade <= 0) velocidade = 45;
      }
      
      // Se for A3, o tempo de impressão é o dobro (ou a velocidade é metade) se a base for A4
      // Mas aqui estamos usando totalFolhas. Se totalFolhas for A3, precisamos ajustar.
      let totalFolhasA4Equiv = 0;
      calculated.componentes.forEach(c => {
        totalFolhasA4Equiv += c.formatoFolha === 'A3' ? c.totalFolhas * 2 : c.totalFolhas;
      });

      tempo_impressao = (totalFolhasA4Equiv / velocidade) + setup_impressao;
    } else {
      const setupOffset = (base.parametrosProducao || []).find(p => p.chave.toLowerCase().includes('acerto offset'))?.valor || 30;
      const maquinaOffset = (base.maquinasOffset || []).find(m => m.maquina === input.maquina);
      const velHora = maquinaOffset?.producaoHora || 5000;
      
      let totalFolhasA4Equiv = 0;
      calculated.componentes.forEach(c => {
        totalFolhasA4Equiv += c.formatoFolha === 'A3' ? c.totalFolhas * 2 : c.totalFolhas;
      });

      tempo_impressao = ((totalFolhasA4Equiv / velHora) * 60 * (calculated.passadas || 1)) + setupOffset;
    }

    const taxaImpressao = input.tipoImpressao === 'DIGITAL' 
      ? ((base.maoObra || []).find(m => m.profissional.toUpperCase().includes('IMPRESSOR DIGITAL'))?.hora || 36.0)
      : ((base.maoObra || []).find(m => m.profissional.toUpperCase().includes('IMPRESSOR OFFSET'))?.hora || 36.0);
    const custo_impressao = (tempo_impressao / 60) * taxaImpressao;

    // 3. CORTE
    const tempo_prep_corte = 10;
    let tempo_base_corte = 6.5; // Refile simples avg
    
    const prod = (input.produto || '').toLowerCase();
    if (prod.includes('cartão')) tempo_base_corte = 50;
    else if (prod.includes('panfleto') || prod.includes('flyer')) {
      if (prod.includes('a4')) tempo_base_corte = 15;
      else tempo_base_corte = 25;
    } else if (prod.includes('cartaz') || prod.includes('meia folha')) tempo_base_corte = 10;
    
    let tempo_corte = tempo_prep_corte + tempo_base_corte;
    
    // Modifiers
    const isPapelPesado = (input.papeis || []).some(p => p.gramatura > 250);
    if (isPapelPesado) tempo_corte *= 1.2;
    if (prod.includes('adesivo')) tempo_corte *= 1.3;
    
    // Safety margin
    tempo_corte *= 1.1;
    
    const taxaCorte = (base.maoObra || []).find(m => m.profissional.toUpperCase().includes('GUILHOTINA'))?.hora || 36.0;
    const custo_corte = (tempo_corte / 60) * taxaCorte;

    // 4. ACABAMENTO
    let tempo_acabamento = 0;
    const taxaAcabamento = (base.maoObra || []).find(m => m.profissional.toUpperCase().includes('ACABAMENTO'))?.hora || 36.0;

    if (input.acabamentos?.dobra) {
      tempo_acabamento += 8 + (input.quantidade / (400 / 60));
    }
    if (input.acabamentos?.grampo) {
      tempo_acabamento += 5 + (input.quantidade / (600 / 60));
    }
    if (input.acabamentos?.espiral) {
      tempo_acabamento += 5 + (input.quantidade / (120 / 60));
    }
    if (input.acabamentos?.plastificacao) {
      tempo_acabamento += 8 + (input.quantidade / (300 / 60));
    }
    if (input.acabamentos?.alceamento) {
      tempo_acabamento += 10 + (input.quantidade / (250 / 60));
    }
    if (input.acabamentos?.colagemCapa) {
      tempo_acabamento += 12 + (input.quantidade / (150 / 60));
    }

    const custo_acabamento = (tempo_acabamento / 60) * taxaAcabamento;

    // TOTALS
    const tempo_total = tempo_preparacao + tempo_impressao + tempo_corte + tempo_acabamento;
    const custo_total = custo_preparacao + custo_impressao + custo_corte + custo_acabamento;
    const custo_unitario = custo_total / (input.quantidade || 1);

    return {
      tempo_preparacao: Math.round(tempo_preparacao),
      tempo_impressao: Math.round(tempo_impressao),
      tempo_corte: Math.round(tempo_corte),
      tempo_acabamento: Math.round(tempo_acabamento),
      tempo_total: Math.round(tempo_total),
      custo_preparacao,
      custo_impressao,
      custo_corte,
      custo_acabamento,
      custo_total,
      custo_unitario
    };
  }
}

export class HistoricalLearner {
  static suggestTime(input: ProductionInput, history: BudgetHistoryEntry[], calculatedTime: number): { suggested: number, average: number | null } {
    if (!history.length || !input?.produto || !input?.acabamentos) return { suggested: calculatedTime, average: null };

    const activeFinishes = Object.entries(input.acabamentos)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .sort();

    // Filter similar budgets: same product (partial match), similar quantity (+/- 20%), same finishes
    const similar = history.filter(h => {
      if (!h.produto || !h.acabamentos) return false;
      const sameProduct = h.produto.toLowerCase().includes(input.produto.toLowerCase()) || 
                          input.produto.toLowerCase().includes(h.produto.toLowerCase());
      const similarQty = Math.abs(h.quantidade - input.quantidade) / (input.quantidade || 1) <= 0.2;
      const sameFinishes = JSON.stringify((h.acabamentos || []).sort()) === JSON.stringify(activeFinishes);
      
      return sameProduct && similarQty && sameFinishes;
    });

    if (!similar.length) return { suggested: calculatedTime, average: null };

    const avgTime = similar.reduce((acc, h) => acc + h.tempo_total, 0) / similar.length;
    
    // Suggestion logic: move 1/3 of the way towards the average to avoid drastic changes
    const suggested = calculatedTime + (avgTime - calculatedTime) * 0.33;

    return { 
      suggested: Math.round(suggested), 
      average: Math.round(avgTime) 
    };
  }
}
