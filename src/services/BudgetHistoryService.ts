import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  runTransaction,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

  static async generatePDF(
    calc: CalculatedProduction,
    budgetNumber: string,
    cliente: string,
    imageDataUrl?: string
  ): Promise<Blob> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;

    // ── HEADER ──────────────────────────────────────────────
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, W, 38, 'F');

    pdf.setFillColor(37, 99, 235); // blue-600
    pdf.rect(0, 0, 6, 38, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DIGRA', margin + 2, 16);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(147, 197, 253); // blue-300
    pdf.text('SISTEMA INTELIGENTE DE ORÇAMENTOS', margin + 2, 23);

    pdf.setFontSize(8);
    pdf.setTextColor(200, 210, 230);
    pdf.text(`Nº ${budgetNumber}`, margin + 2, 30);
    pdf.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - margin, 30, { align: 'right' });

    // ── CLIENTE BANNER ────────────────────────────────────────
    pdf.setFillColor(239, 246, 255); // blue-50
    pdf.rect(0, 38, W, 16, 'F');
    pdf.setDrawColor(
