import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';

export interface Budget {
  id?: string;
  userId: string;
  month: string; // Format: YYYY-MM
  totalBudget: number;
  categoryBudgets: {
    [category: string]: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  percentageUsed: number;
  categoryBreakdown: {
    [category: string]: {
      budgeted: number;
      spent: number;
      remaining: number;
      percentageUsed: number;
    };
  };
}

export class BudgetService {
  private static COLLECTION_NAME = 'budgets';

  // Set/Update budget for a month
  static async setBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const budgetId = `${budget.userId}_${budget.month}`;
      const budgetRef = doc(firestore, this.COLLECTION_NAME, budgetId);
      
      const existingBudget = await getDoc(budgetRef);
      
      if (existingBudget.exists()) {
        // Update existing budget
        await updateDoc(budgetRef, {
          ...budget,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new budget
        await setDoc(budgetRef, {
          ...budget,
          id: budgetId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to set budget: ${error.message}`);
    }
  }

  // Get budget for a specific month
  static async getBudget(userId: string, month: string): Promise<Budget | null> {
    try {
      const budgetId = `${userId}_${month}`;
      const budgetDoc = await getDoc(doc(firestore, this.COLLECTION_NAME, budgetId));
      
      if (budgetDoc.exists()) {
        return budgetDoc.data() as Budget;
      }
      return null;
    } catch (error: any) {
      throw new Error(`Failed to get budget: ${error.message}`);
    }
  }

  // Get all budgets for a user
  static async getUserBudgets(userId: string): Promise<Budget[]> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const budgets: Budget[] = [];
      
      querySnapshot.forEach((doc) => {
        budgets.push({
          id: doc.id,
          ...doc.data()
        } as Budget);
      });
      
      return budgets.sort((a, b) => b.month.localeCompare(a.month));
    } catch (error: any) {
      throw new Error(`Failed to get user budgets: ${error.message}`);
    }
  }

  // Calculate budget summary for a month
  static async getBudgetSummary(
    userId: string, 
    month: string, 
    expenses: Array<{ category: string; amount: number; date: string }>,
    income: Array<{ amount: number; date: string }>
  ): Promise<BudgetSummary> {
    try {
      const budget = await this.getBudget(userId, month);
      
      if (!budget) {
        throw new Error('No budget found for this month');
      }

      // Filter expenses and income for the specified month
      const monthExpenses = expenses.filter(expense => 
        expense.date.startsWith(month)
      );
      
      const monthIncome = income.filter(inc => 
        inc.date.startsWith(month)
      );

      // Calculate totals
      const totalSpent = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalIncome = monthIncome.reduce((sum, inc) => sum + inc.amount, 0);
      const remaining = budget.totalBudget - totalSpent;
      const percentageUsed = budget.totalBudget > 0 ? (totalSpent / budget.totalBudget) * 100 : 0;

      // Calculate category breakdown
      const categoryBreakdown: BudgetSummary['categoryBreakdown'] = {};
      
      Object.keys(budget.categoryBudgets).forEach(category => {
        const categoryExpenses = monthExpenses.filter(expense => expense.category === category);
        const categorySpent = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const categoryBudgeted = budget.categoryBudgets[category];
        const categoryRemaining = categoryBudgeted - categorySpent;
        const categoryPercentageUsed = categoryBudgeted > 0 ? (categorySpent / categoryBudgeted) * 100 : 0;

        categoryBreakdown[category] = {
          budgeted: categoryBudgeted,
          spent: categorySpent,
          remaining: categoryRemaining,
          percentageUsed: categoryPercentageUsed
        };
      });

      return {
        totalBudget: budget.totalBudget,
        totalSpent,
        totalIncome,
        remaining,
        percentageUsed,
        categoryBreakdown
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate budget summary: ${error.message}`);
    }
  }

  // Get current month string
  static getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Get month display name
  static getMonthDisplayName(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
