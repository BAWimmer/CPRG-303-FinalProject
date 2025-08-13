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

// Income data model entries
export interface Income {
  id?: string;
  userId: string;
  source: string;
  description: string;
  amount: number;
  date: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export class IncomeService {
  // Firestore collection name for incomes
  private static COLLECTION_NAME = 'income';

  // Add new income
  static async addIncome(income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const incomeData = {
        ...income,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Create a new document in Firestore in the 'income' collection
      const docRef = await addDoc(collection(firestore, this.COLLECTION_NAME), incomeData);
      return docRef.id;
    } catch (error: any) {
      throw new Error(`Failed to add income: ${error.message}`);
    }
  }

  // Update existing income
  static async updateIncome(incomeId: string, updates: Partial<Income>): Promise<void> {
    try {
      const incomeRef = doc(firestore, this.COLLECTION_NAME, incomeId);
      await updateDoc(incomeRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to update income: ${error.message}`);
    }
  }

  // Delete income
  static async deleteIncome(incomeId: string): Promise<void> {
    try {
      const incomeRef = doc(firestore, this.COLLECTION_NAME, incomeId);
      await deleteDoc(incomeRef);
    } catch (error: any) {
      throw new Error(`Failed to delete income: ${error.message}`);
    }
  }

  // Get all income for a user
  static async getUserIncome(userId: string): Promise<Income[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const incomes: Income[] = [];
      
      querySnapshot.forEach((doc) => {
        incomes.push({
          id: doc.id,
          ...doc.data()
        } as Income);
      });
      
      return incomes;
    } catch (error: any) {
      throw new Error(`Failed to get income: ${error.message}`);
    }
  }

  // Get income by source for a user
  static async getUserIncomeBySource(userId: string, source: string): Promise<Income[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('source', '==', source),
        orderBy('date', 'desc')
      );
      
      // Execute the query and convert firestore doc into income objects
      const querySnapshot = await getDocs(q);
      const incomes: Income[] = [];
      
      querySnapshot.forEach((doc) => {
        incomes.push({
          id: doc.id,
          ...doc.data()
        } as Income);
      });
      
      return incomes;
    } catch (error: any) {
      throw new Error(`Failed to get income by source: ${error.message}`);
    }
  }

  // Get income within date range for a user
  static async getUserIncomeByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Income[]> {
    try {
      // Query firestore for user's income within the specified date range
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      // executes the query and convert firestore doc into income objects
      const querySnapshot = await getDocs(q);
      const incomes: Income[] = [];
      
      querySnapshot.forEach((doc) => {
        incomes.push({
          id: doc.id,
          ...doc.data()
        } as Income);
      });
      
      return incomes;
    } catch (error: any) {
      throw new Error(`Failed to get income by date range: ${error.message}`);
    }
  }
}
