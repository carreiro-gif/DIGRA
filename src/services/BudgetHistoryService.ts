import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  serverTimestamp, 
  doc, 
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CalculatedProduction, SavedBudget } from '../types/SmartBudgetTypes';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export class BudgetHistoryService {
  private static COLLECTION_NAME = 'orcamentos';
  private static COUNTER_DOC_PATH = 'counters/orcamentos';

  /**
   * Generates the next budget number in the format ORC-YYYY-00000
   */
  static async getNextBudgetNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counterRef = doc(db, this.COUNTER_DOC_PATH);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;

      if (counterDoc.exists()) {
        const data = counterDoc.data();
        if (data.year === year) {
          nextNumber = data.lastNumber + 1;
        }
      }

      transaction.set(counterRef, {
        year: year,
        lastNumber: nextNumber
      });

      return `ORC-${year}-${String(nextNumber).padStart(5, '0')}`;
    });
  }

  /**
   * Generates a PDF from the calculated budget data
   */
  static generatePDF(calc: CalculatedProduction, budgetNumber: string, cliente: string): Blob {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.text('ORÇAMENTO GRÁFICO', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.text(`Número: ${budgetNumber}`, margin, y);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 190, y, { align: 'right' });
    y += 10;

    doc.text(`Cliente: ${cliente}`, margin, y);
    y += 15;

    // Product Info
    doc.setFontSize(14);
    doc.text('Informações do Produto', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Produto: ${calc.input.produto}`, margin, y);
    y += 5;
    doc.text(`Quantidade: ${calc.input.quantidade}`, margin, y);
    y += 5;
    doc.text(`Formato Final: ${calc.input.tamanhoFinal}`, margin, y);
    y += 5;
    doc.text(`Cores: ${calc.input.cores}`, margin, y);
    y += 10;

    // Technical Details
    doc.setFontSize(14);
    doc.text('Dados Técnicos', margin, y);
    y += 8;
    doc.setFontSize(10);
    calc.componentes.forEach(comp => {
      doc.text(`${comp.nome}: ${comp.papelSugerido} ${comp.gramatura}g - ${comp.totalFolhas} folhas ${comp.formatoFolha}`, margin, y);
      y += 5;
    });
    y += 5;

    // Costs
    if (calc.producaoEngine) {
      doc.setFontSize(14);
      doc.text('Resumo de Custos', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Custo Total: R$ ${calc.producaoEngine.custo_total.toFixed(2)}`, margin, y);
      y += 5;
      doc.text(`Custo Unitário: R$ ${calc.producaoEngine.custo_unitario.toFixed(2)}`, margin, y);
      y += 10;
    }

    // Observations
    if (calc.input.observacoes) {
      doc.setFontSize(14);
      doc.text('Observações', margin, y);
      y += 8;
      doc.setFontSize(10);
      const splitObs = doc.splitTextToSize(calc.input.observacoes, 170);
      doc.text(splitObs, margin, y);
    }

    return doc.output('blob');
  }

  /**
   * Saves a budget to Firebase (Storage + Firestore)
   */
  static async saveBudget(calc: CalculatedProduction, cliente: string): Promise<string> {
    const budgetNumber = await this.getNextBudgetNumber();
    const pdfBlob = this.generatePDF(calc, budgetNumber, cliente);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // 1. Upload to Storage
    const storagePath = `orcamentos/${year}/${String(month).padStart(2, '0')}/${budgetNumber}.pdf`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, pdfBlob);
    const pdfURL = await getDownloadURL(storageRef);

    // 2. Save to Firestore
    const budgetData: SavedBudget = {
      numeroOrcamento: budgetNumber,
      cliente: cliente,
      produto: calc.input.produto,
      quantidade: calc.input.quantidade,
      valor: calc.producaoEngine?.custo_total || 0,
      data: now.toISOString(),
      mes: month,
      ano: year,
      pdfURL: pdfURL,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), budgetData);
    return docRef.id;
  }

  /**
   * Fetches the budget history
   */
  static async getHistory(searchTerm?: string): Promise<SavedBudget[]> {
    const budgetsCol = collection(db, this.COLLECTION_NAME);
    let q = query(budgetsCol, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedBudget));

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter(b => 
        b.cliente.toLowerCase().includes(lowerSearch) ||
        b.produto.toLowerCase().includes(lowerSearch) ||
        b.numeroOrcamento.toLowerCase().includes(lowerSearch)
      );
    }

    return results;
  }
}
