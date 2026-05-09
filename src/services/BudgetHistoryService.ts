import { 
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, runTransaction, updateDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { CalculatedProduction, SavedBudget } from '../types/SmartBudgetTypes';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export class BudgetHistoryService {
  private static COLLECTION_NAME = 'orcamentos';
  private static COUNTER_DOC_PATH = 'counters/orcamentos';

  static async getNextBudgetNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counterRef = doc(db, this.COUNTER_DOC_PATH);
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;
      if (counterDoc.exists()) {
        const data = counterDoc.data();
        if (data.year === year) nextNumber = data.lastNumber + 1;
      }
      transaction.set(counterRef, { year, lastNumber: nextNumber });
      return `ORC-${year}-${String(nextNumber).padStart(5, '0')}`;
    });
  }

  static async generatePDF(calc: CalculatedProduction, budgetNumber: string, cliente: string, imageDataUrl?: string, totals?: any): Promise<Blob> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const margin = 15;
    const footerH = 15;
    const maxY = H - footerH - 5;

    const addFooter = () => {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, H - footerH, W, footerH, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, H - footerH, W, H - footerH);
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('DIGRA — Sistema Inteligente de Orçamentos', margin, H - 5);
      pdf.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - margin, H - 5, { align: 'right' });
    };

    const checkNewPage = (currentY: number, needed: number): number => {
      if (currentY + needed > maxY) {
        addFooter();
        pdf.addPage();
        return 15;
      }
      return currentY;
    };

    // ── HEADER ──────────────────────────────────────────────
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, W, 38, 'F');
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, 6, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DIGRA', margin + 2, 16);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(147, 197, 253);
    pdf.text('SISTEMA INTELIGENTE DE ORÇAMENTOS', margin + 2, 23);
    pdf.setFontSize(8);
    pdf.setTextColor(200, 210, 230);
    pdf.text(`Nº ${budgetNumber}`, margin + 2, 30);
    pdf.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - margin, 30, { align: 'right' });

    // ── CLIENTE BANNER ────────────────────────────────────────
    pdf.setFillColor(239, 246, 255);
    pdf.rect(0, 38, W, 16, 'F');
    pdf.setDrawColor(191, 219, 254);
    pdf.line(0, 54, W, 54);
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLIENTE / SOLICITAÇÃO', margin, 45);
    pdf.setFontSize(11);
    pdf.text(cliente.toUpperCase(), margin, 52);

    let y = 62;

    const drawSectionTitle = (title: string, yPos: number, color = [37, 99, 235]) => {
      yPos = checkNewPage(yPos, 15);
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(margin, yPos, 3, 6, 'F');
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin + 5, yPos + 5);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, yPos + 8, W - margin, yPos + 8);
      return yPos + 12;
    };

    const drawRow = (label: string, value: string, yPos: number, highlight = false) => {
      yPos = checkNewPage(yPos, 8);
      if (highlight) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, yPos - 4, W - margin * 2, 7, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(label, margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(value), margin + 55, yPos);
      return yPos + 7;
    };

    // ── INFORMAÇÕES DO PRODUTO ────────────────────────────────
    y = drawSectionTitle('INFORMAÇÕES DO PRODUTO', y);
    y = drawRow('Produto', calc.input.produto || '—', y, true);
    y = drawRow('Quantidade', `${calc.input.quantidade} unidades`, y);
    y = drawRow('Formato Final', calc.input.tamanhoFinal, y, true);
    y = drawRow('Cores', calc.input.cores, y);
    y = drawRow('Impressão', calc.input.tipoImpressao, y, true);
    if (calc.input.frenteVerso) y = drawRow('Frente e Verso', 'Sim', y);
    if (calc.input.observacoes) {
      const lines = pdf.splitTextToSize(calc.input.observacoes, 100);
      y = checkNewPage(y, lines.length * 5 + 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Observações', margin + 2, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.text(lines, margin + 55, y);
      y += lines.length * 5 + 2;
    }
    y += 4;

    // ── DADOS TÉCNICOS ────────────────────────────────────────
    y = drawSectionTitle('DADOS TÉCNICOS DE PRODUÇÃO', y, [16, 185, 129]);
    calc.componentes.forEach((comp, i) => {
      y = drawRow(comp.nome, `${comp.papelSugerido} ${comp.gramatura}g — ${comp.totalFolhas} folhas ${comp.formatoFolha}`, y, i % 2 === 0);
    });
    y += 4;

    // ── FICHA TÉCNICA ─────────────────────────────────────────
    if (calc.resumoTecnico) {
      y = drawSectionTitle('FICHA TÉCNICA', y, [124, 58, 237]);
      y = drawRow('Equipamento', calc.resumoTecnico.maquina || '—', y, true);
      y = drawRow('Tecnologia', calc.resumoTecnico.tipoProducao || '—', y);
      y = drawRow('Tempo de Impressão', `${calc.resumoTecnico.tempoImpressaoMin || 0} min`, y, true);
      y = drawRow('Tempo Total', `${calc.resumoTecnico.tempoTotalMin || 0} min`, y);
      y += 4;
    }

    // ── RESUMO FINANCEIRO ─────────────────────────────────────
    const totalGeral = totals?.totalGeral ?? calc.producaoEngine?.custo_total ?? 0;
    const valorUnitario = totals?.valorUnitario ?? calc.producaoEngine?.custo_unitario ?? 0;

    y = checkNewPage(y, 35);
    y = drawSectionTitle('RESUMO FINANCEIRO', y, [220, 38, 38]);
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(margin, y, W - margin * 2, 22, 3, 3, 'F');
    pdf.setTextColor(147, 197, 253);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL GERAL', margin + 10, y + 8);
    pdf.text('VALOR UNITÁRIO', W / 2 + 5, y + 8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.text(`R$ ${totalGeral.toFixed(2).replace('.', ',')}`, margin + 10, y + 17);
    pdf.text(`R$ ${valorUnitario.toFixed(2).replace('.', ',')}`, W / 2 + 5, y + 17);
    y += 28;

    // ── IMAGENS ───────────────────────────────────────────────
    if (imageDataUrl) {
      y = checkNewPage(y, 10);
      y = drawSectionTitle('MATERIAL DE REFERÊNCIA', y, [100, 116, 139]);

      const allImages = [imageDataUrl];

      const thumbW = (W - margin * 2 - 10) / 3;
      const thumbH = 45;
      let imgX = margin;
      let rowY = y;

      for (let i = 0; i < allImages.length; i++) {
        if (i > 0 && i % 3 === 0) {
          rowY += thumbH + 8;
          imgX = margin;
          rowY = checkNewPage(rowY, thumbH + 8);
        }

        try {
          const imgData = allImages[i];
          const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';

          const tempImg = new Image();
          await new Promise<void>((resolve) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => resolve();
            tempImg.src = imgData;
          });

          const ratio = tempImg.naturalWidth / tempImg.naturalHeight;
          let dw = thumbW;
          let dh = thumbW / ratio;
          if (dh > thumbH) { dh = thumbH; dw = thumbH * ratio; }

          const offsetX = imgX + (thumbW - dw) / 2;
          const offsetY = rowY + (thumbH - dh) / 2;

          pdf.setFillColor(248, 250, 252);
          pdf.rect(imgX, rowY, thumbW, thumbH, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(imgX, rowY, thumbW, thumbH);
          pdf.addImage(imgData, format, offsetX, offsetY, dw, dh);

          pdf.setFontSize(6);
          pdf.setTextColor(148, 163, 184);
          pdf.text(`Imagem ${i + 1}`, imgX + thumbW / 2, rowY + thumbH + 4, { align: 'center' });
        } catch (e) {
          console.warn('Erro ao adicionar imagem ao PDF:', e);
        }

        imgX += thumbW + 5;
      }
      y = rowY + thumbH + 12;
    }

    addFooter();
    return pdf.output('blob');
  }
  static async saveBudget(calc: CalculatedProduction, cliente: string, imageDataUrl?: string, totals?: any): Promise<string> {
    const budgetNumber = await this.getNextBudgetNumber();
    const pdfBlob = await this.generatePDF(calc, budgetNumber, cliente, imageDataUrl, totals);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const storagePath = `orcamentos/${year}/${String(month).padStart(2, '0')}/${budgetNumber}.pdf`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, pdfBlob);
    const pdfURL = await getDownloadURL(storageRef);

    const budgetData: SavedBudget = {
      numeroOrcamento: budgetNumber,
      cliente,
      produto: calc.input.produto,
      quantidade: calc.input.quantidade,
      valor: totals?.totalGeral ?? calc.producaoEngine?.custo_total ?? 0,
      valorUnitario: totals?.valorUnitario ?? calc.producaoEngine?.custo_unitario ?? 0,
      storagePath,
      data: now.toISOString(),
      mes: month,
      ano: year,
      pdfURL,
      calcSnapshot: JSON.stringify(calc),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), budgetData);
    return docRef.id;
  }

  static async updateBudget(id: string, calc: CalculatedProduction, cliente: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, id);
    await updateDoc(docRef, {
      cliente,
      produto: calc.input.produto,
      quantidade: calc.input.quantidade,
      valor: calc.producaoEngine?.custo_total || 0,
      calcSnapshot: JSON.stringify(calc),
    });
  }
static async deleteBudget(id: string, storagePath?: string): Promise<void> {
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (e) {
        console.warn('PDF não encontrado no Storage:', e);
      }
    }
    const docRef = doc(db, this.COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
  static async getHistory(searchTerm?: string): Promise<SavedBudget[]> {
    const budgetsCol = collection(db, this.COLLECTION_NAME);
    const q = query(budgetsCol, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as SavedBudget));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      results = results.filter(b =>
        b.cliente?.toLowerCase().includes(lower) ||
        b.produto?.toLowerCase().includes(lower) ||
        b.numeroOrcamento?.toLowerCase().includes(lower)
      );
    }
    return results;
  }
}
