import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';

export interface Expense {
  id?: string;
  userId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export class ExpenseService {
  private static COLLECTION_NAME = 'expenses';

  // Add new expense
  static async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const expenseData = {
        ...expense,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, this.COLLECTION_NAME), expenseData);
      return docRef.id;
    } catch (error: any) {
      throw new Error(`Failed to add expense: ${error.message}`);
    }
  }

  // Update existing expense
  static async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<void> {
    try {
      const expenseRef = doc(firestore, this.COLLECTION_NAME, expenseId);
      await updateDoc(expenseRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }
  }

  // Delete expense
  static async deleteExpense(expenseId: string): Promise<void> {
    try {
      const expenseRef = doc(firestore, this.COLLECTION_NAME, expenseId);
      await deleteDoc(expenseRef);
    } catch (error: any) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }

  // Get all expenses for a user
  static async getUserExpenses(userId: string): Promise<Expense[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: Expense[] = [];
      
      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
      });
      
      return expenses;
    } catch (error: any) {
      throw new Error(`Failed to get expenses: ${error.message}`);
    }
  }

  // Get expenses by category for a user
  static async getUserExpensesByCategory(userId: string, category: string): Promise<Expense[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: Expense[] = [];
      
      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
      });
      
      return expenses;
    } catch (error: any) {
      throw new Error(`Failed to get expenses by category: ${error.message}`);
    }
  }

  // Get expenses within date range for a user
  static async getUserExpensesByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Expense[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: Expense[] = [];
      
      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
      });
      
      return expenses;
    } catch (error: any) {
      throw new Error(`Failed to get expenses by date range: ${error.message}`);
    }
  }
}
