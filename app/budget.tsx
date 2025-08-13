import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  Budget,
  BudgetService,
  BudgetSummary,
} from "../services/budgetService";
import { ExpenseService } from "../services/expenseService";
import { IncomeService } from "../services/incomeService";

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#ff6b6b" },
  { name: "Transportation", icon: "🚗", color: "#4ecdc4" },
  { name: "Shopping", icon: "🛍️", color: "#45b7d1" },
  { name: "Entertainment", icon: "🎬", color: "#96ceb4" },
  { name: "Bills & Utilities", icon: "💡", color: "#feca57" },
  { name: "Healthcare", icon: "🏥", color: "#ff9ff3" },
  { name: "Other", icon: "📝", color: "#a8a8a8" },
];

export default function BudgetPage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(
    BudgetService.getCurrentMonth()
  );
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    null
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [categoryBudgets, setCategoryBudgets] = useState<{
    [key: string]: string;
  }>({});

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Load budget data when component mounts or user/month changes
  useEffect(() => {
    if (user) {
      loadBudgetData();
    }
  }, [user, currentMonth]);

  const loadBudgetData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load budget for current month
      const monthBudget = await BudgetService.getBudget(user.uid, currentMonth);
      setBudget(monthBudget);

      if (monthBudget) {
        // Load expenses and income for the month
        const [expenses, income] = await Promise.all([
          ExpenseService.getUserExpenses(user.uid),
          IncomeService.getUserIncome(user.uid),
        ]);

        // Calculate budget summary
        const summary = await BudgetService.getBudgetSummary(
          user.uid,
          currentMonth,
          expenses,
          income
        );
        setBudgetSummary(summary);

        // Set form data
        const categoryBudgetStrings: { [key: string]: string } = {};
        Object.keys(monthBudget.categoryBudgets).forEach((category) => {
          categoryBudgetStrings[category] =
            monthBudget.categoryBudgets[category].toString();
        });
        setCategoryBudgets(categoryBudgetStrings);
      } else {
        // Initialize empty budget
        setBudgetSummary(null);
        const initialCategoryBudgets: { [key: string]: string } = {};
        EXPENSE_CATEGORIES.forEach((category) => {
          initialCategoryBudgets[category.name] = "";
        });
        setCategoryBudgets(initialCategoryBudgets);
      }
    } catch (error: any) {
      console.error("Error loading budget data:", error);
      Alert.alert("Error", "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save budget");
      return;
    }

    try {
      const categoryBudgetNumbers: { [key: string]: number } = {};
      let totalBudget = 0;

      Object.keys(categoryBudgets).forEach((category) => {
        const amount = parseFloat(categoryBudgets[category] || "0");
        categoryBudgetNumbers[category] = isNaN(amount) ? 0 : amount;
        totalBudget += categoryBudgetNumbers[category];
      });

      const budgetData = {
        userId: user.uid,
        month: currentMonth,
        totalBudget, 
        categoryBudgets: categoryBudgetNumbers,
      };

      await BudgetService.setBudget(budgetData);
      setIsModalVisible(false);
      await loadBudgetData();
      Alert.alert("Success", "Budget saved successfully");
    } catch (error: any) {
      Alert.alert("Error", "Failed to save budget");
    }
  };

  const openBudgetModal = () => {
    if (budget) {
      const categoryBudgetStrings: { [key: string]: string } = {};
      Object.keys(budget.categoryBudgets).forEach((category) => {
        categoryBudgetStrings[category] =
          budget.categoryBudgets[category].toString();
      });
      setCategoryBudgets(categoryBudgetStrings);
    }
    setIsModalVisible(true);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "#ff6b6b";
    if (percentage >= 80) return "#feca57";
    return "#4ecca3";
  };

  const handleLogout = async () => {
    try {
      console.log("Attempting to logout from budget page...");
      await signOut();
      console.log("Logout successful.");
      // Navigation will be handled by useEffect when user becomes null
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", `Failed to logout: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4ecca3" />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budget Tracker</Text>
          <Text style={styles.subtitle}>
            {BudgetService.getMonthDisplayName(currentMonth)}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/expenses")}
        >
          <Text style={styles.navButtonText}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/income")}
        >
          <Text style={styles.navButtonText}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Text style={[styles.navButtonText, styles.activeNavButtonText]}>
            Budget
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!budget ? (
          <View style={styles.noBudgetContainer}>
            <Text style={styles.noBudgetTitle}>No Budget Set</Text>
            <Text style={styles.noBudgetSubtitle}>
              Create a budget for{" "}
              {BudgetService.getMonthDisplayName(currentMonth)} to start
              tracking your spending
            </Text>
            <TouchableOpacity
              style={styles.createBudgetButton}
              onPress={openBudgetModal}
            >
              <Text style={styles.createBudgetButtonText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Budget Overview */}
            {budgetSummary && (
              <View style={styles.overviewSection}>
                <Text style={styles.sectionTitle}>Budget Overview</Text>

                <View style={styles.overviewCard}>
                  <View style={styles.overviewRow}>
                    <Text style={styles.overviewLabel}>Total Budget</Text>
                    <Text style={styles.overviewValue}>
                      ${budgetSummary.totalBudget.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.overviewRow}>
                    <Text style={styles.overviewLabel}>Total Spent</Text>
                    <Text style={[styles.overviewValue, { color: "#ff6b6b" }]}>
                      ${budgetSummary.totalSpent.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.overviewRow}>
                    <Text style={styles.overviewLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.overviewValue,
                        {
                          color:
                            budgetSummary.remaining >= 0
                              ? "#4ecca3"
                              : "#ff6b6b",
                        },
                      ]}
                    >
                      ${budgetSummary.remaining.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(budgetSummary.percentageUsed, 100)}%`,
                          backgroundColor: getProgressColor(
                            budgetSummary.percentageUsed
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {budgetSummary.percentageUsed.toFixed(1)}% of budget used
                  </Text>
                </View>
              </View>
            )}

            {/* Category Breakdown */}
            {budgetSummary && (
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>Category Breakdown</Text>
                {EXPENSE_CATEGORIES.map((category) => {
                  const categoryData =
                    budgetSummary.categoryBreakdown[category.name];
                  if (!categoryData || categoryData.budgeted === 0) return null;

                  return (
                    <View key={category.name} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryIcon}>
                            {category.icon}
                          </Text>
                          <Text style={styles.categoryName}>
                            {category.name}
                          </Text>
                        </View>
                        <View style={styles.categoryAmounts}>
                          <Text style={styles.categorySpent}>
                            ${categoryData.spent.toFixed(2)}
                          </Text>
                          <Text style={styles.categoryBudgeted}>
                            / ${categoryData.budgeted.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.categoryProgressBar}>
                        <View
                          style={[
                            styles.categoryProgressFill,
                            {
                              width: `${Math.min(categoryData.percentageUsed, 100)}%`,
                              backgroundColor: getProgressColor(
                                categoryData.percentageUsed
                              ),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryProgressText,
                          {
                            color: getProgressColor(
                              categoryData.percentageUsed
                            ),
                          },
                        ]}
                      >
                        {categoryData.percentageUsed.toFixed(1)}% used • $
                        {categoryData.remaining.toFixed(2)} remaining
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Edit Budget Button */}
            <TouchableOpacity
              style={styles.editBudgetButton}
              onPress={openBudgetModal}
            >
              <Text style={styles.editBudgetButtonText}>Edit Budget</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Budget Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {budget ? "Edit Budget" : "Create Budget"}
            </Text>
            <TouchableOpacity onPress={handleSaveBudget}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Total Monthly Budget</Text>
              <Text style={styles.totalBudgetText}>
                $
                {Object.values(categoryBudgets)
                  .map((val) => parseFloat(val) || 0)
                  .reduce((acc, cur) => acc + cur, 0)
                  .toFixed(2)}
              </Text>
            </View>

            <Text style={styles.formLabel}>Category Budgets</Text>
            {EXPENSE_CATEGORIES.map((category) => (
              <View key={category.name} style={styles.categoryBudgetRow}>
                <View style={styles.categoryBudgetInfo}>
                  <Text style={styles.categoryBudgetIcon}>{category.icon}</Text>
                  <Text style={styles.categoryBudgetName}>{category.name}</Text>
                </View>
                <TextInput
                  style={styles.categoryBudgetInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={categoryBudgets[category.name] || ""}
                  onChangeText={(text) =>
                    setCategoryBudgets((prev) => ({
                      ...prev,
                      [category.name]: text,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#a8a8a8",
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  navigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#16213e",
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeNavButton: {
    backgroundColor: "#4ecca3",
  },
  navButtonText: {
    color: "#a8a8a8",
    fontSize: 16,
    fontWeight: "600",
  },
  activeNavButtonText: {
    color: "#1a1a2e",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noBudgetContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noBudgetTitle: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: 12,
  },
  noBudgetSubtitle: {
    fontSize: 16,
    color: "#a8a8a8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  createBudgetButton: {
    backgroundColor: "#4ecca3",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createBudgetButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  overviewSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  overviewCard: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 20,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 16,
    color: "#a8a8a8",
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#2a3a5c",
    borderRadius: 4,
    marginVertical: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#a8a8a8",
    textAlign: "center",
  },
  categoriesSection: {
    marginBottom: 32,
  },
  categoryCard: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  categoryAmounts: {
    flexDirection: "row",
    alignItems: "center",
  },
  categorySpent: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff6b6b",
  },
  categoryBudgeted: {
    fontSize: 16,
    color: "#a8a8a8",
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: "#2a3a5c",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  categoryProgressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  editBudgetButton: {
    backgroundColor: "#45b7d1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
  },
  editBudgetButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a5c",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  cancelButton: {
    color: "#a8a8a8",
    fontSize: 16,
  },
  saveButton: {
    color: "#4ecca3",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  categoryBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a5c",
  },
  categoryBudgetInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryBudgetIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryBudgetName: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  categoryBudgetInput: {
    backgroundColor: "#16213e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5c",
    width: 80,
    textAlign: "right",
  },
  totalBudgetText: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
});
