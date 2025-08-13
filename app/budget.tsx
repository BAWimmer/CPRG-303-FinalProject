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
  const [budgetMode, setBudgetMode] = useState<"category" | "total">(
    "category"
  );
  const [totalBudgetAmount, setTotalBudgetAmount] = useState("");
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

        // Set form data and budget mode
        const storedMode = (monthBudget as any).budgetMode || "category";
        setBudgetMode(storedMode);

        if (storedMode === "category") {
          const categoryBudgetStrings: { [key: string]: string } = {};
          Object.keys(monthBudget.categoryBudgets).forEach((category) => {
            categoryBudgetStrings[category] =
              monthBudget.categoryBudgets[category].toString();
          });
          setCategoryBudgets(categoryBudgetStrings);
        } else {
          // Total mode
          setTotalBudgetAmount(monthBudget.totalBudget.toString());
        }
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
      let categoryBudgetNumbers: { [key: string]: number } = {};
      let totalBudget = 0;

      if (budgetMode === "category") {
        // Calculate from category budgets
        Object.keys(categoryBudgets).forEach((category) => {
          const amount = parseFloat(categoryBudgets[category] || "0");
          categoryBudgetNumbers[category] = isNaN(amount) ? 0 : amount;
          totalBudget += categoryBudgetNumbers[category];
        });
      } else {
        // Use total budget mode - distribute evenly across categories
        totalBudget = parseFloat(totalBudgetAmount || "0");
        if (isNaN(totalBudget)) totalBudget = 0;

        // Initialize all categories with 0 for total budget mode
        EXPENSE_CATEGORIES.forEach((category) => {
          categoryBudgetNumbers[category.name] = 0;
        });
      }

      const budgetData = {
        userId: user.uid,
        month: currentMonth,
        totalBudget,
        categoryBudgets: categoryBudgetNumbers,
        budgetMode, // Store the budget mode
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
      // Check if budget has a stored mode, otherwise default to category
      const storedMode = (budget as any).budgetMode || "category";
      setBudgetMode(storedMode);

      if (storedMode === "category") {
        const categoryBudgetStrings: { [key: string]: string } = {};
        Object.keys(budget.categoryBudgets).forEach((category) => {
          categoryBudgetStrings[category] =
            budget.categoryBudgets[category].toString();
        });
        setCategoryBudgets(categoryBudgetStrings);
      } else {
        setTotalBudgetAmount(budget.totalBudget.toString());
      }
    } else {
      // New budget - default to category mode
      setBudgetMode("category");
      setTotalBudgetAmount("");
    }
    setIsModalVisible(true);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "#ff6b6b";
    if (percentage >= 80) return "#feca57";
    return "#4ecca3";
  };

  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();

    // Generate options for the current month and the past 11 months (1 year total)
    for (let i = 0; i < 12; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const yearMonth = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      months.push({ value: yearMonth, label: monthName });
    }

    return months;
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

      {/* Month Selector */}
      <View style={styles.monthSelectorSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.monthScrollView}
          contentContainerStyle={styles.monthScrollContent}
        >
          {getMonthOptions().map((month) => (
            <TouchableOpacity
              key={month.value}
              style={[
                styles.monthOption,
                currentMonth === month.value && styles.selectedMonthOption,
              ]}
              onPress={() => setCurrentMonth(month.value)}
            >
              <Text
                style={[
                  styles.monthOptionText,
                  currentMonth === month.value && styles.selectedMonthText,
                ]}
              >
                {month.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                <Text style={styles.sectionTitle}>
                  {budgetMode === "category"
                    ? "Category Breakdown"
                    : "Spending Overview"}
                </Text>
                {budgetMode === "category"
                  ? // Show detailed category breakdown for category mode
                    EXPENSE_CATEGORIES.map((category) => {
                      const categoryData =
                        budgetSummary.categoryBreakdown[category.name];
                      if (!categoryData || categoryData.budgeted === 0)
                        return null;

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
                              <Text
                                style={[
                                  styles.categorySpent,
                                  {
                                    color: getProgressColor(
                                      categoryData.percentageUsed
                                    ),
                                  },
                                ]}
                              >
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
                    })
                  : // Show simplified spending overview for total budget mode
                    EXPENSE_CATEGORIES.map((category) => {
                      const categoryData =
                        budgetSummary.categoryBreakdown[category.name];
                      if (!categoryData || categoryData.spent === 0)
                        return null;

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
                              <Text
                                style={[
                                  styles.categorySpent,
                                  {
                                    color: getProgressColor(
                                      categoryData.percentageUsed
                                    ),
                                  },
                                ]}
                              >
                                ${categoryData.spent.toFixed(2)}
                              </Text>
                            </View>
                          </View>
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
            {/* Budget Mode Toggle */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Budget Mode</Text>
              <View style={styles.budgetModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.budgetModeOption,
                    budgetMode === "category" && styles.budgetModeActive,
                  ]}
                  onPress={() => setBudgetMode("category")}
                >
                  <Text
                    style={[
                      styles.budgetModeText,
                      budgetMode === "category" && styles.budgetModeActiveText,
                    ]}
                  >
                    By Category
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.budgetModeOption,
                    budgetMode === "total" && styles.budgetModeActive,
                  ]}
                  onPress={() => setBudgetMode("total")}
                >
                  <Text
                    style={[
                      styles.budgetModeText,
                      budgetMode === "total" && styles.budgetModeActiveText,
                    ]}
                  >
                    Total Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {budgetMode === "category" ? (
              <>
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
                      <Text style={styles.categoryBudgetIcon}>
                        {category.icon}
                      </Text>
                      <Text style={styles.categoryBudgetName}>
                        {category.name}
                      </Text>
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
              </>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Monthly Budget</Text>
                <TextInput
                  style={styles.totalBudgetInput}
                  placeholder="Enter your total monthly budget"
                  placeholderTextColor="#666"
                  value={totalBudgetAmount}
                  onChangeText={setTotalBudgetAmount}
                  keyboardType="numeric"
                />
              </View>
            )}
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
    paddingTop: 40,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#a8a8a8",
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  navigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 8,
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
    paddingVertical: 40,
  },
  noBudgetTitle: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  noBudgetSubtitle: {
    fontSize: 14,
    color: "#a8a8a8",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  createBudgetButton: {
    backgroundColor: "#4ecca3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBudgetButtonText: {
    color: "#1a1a2e",
    fontSize: 16,
    fontWeight: "bold",
  },
  overviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  overviewCard: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 16,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 14,
    color: "#a8a8a8",
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#2a3a5c",
    borderRadius: 3,
    marginVertical: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#a8a8a8",
    textAlign: "center",
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  categoryAmounts: {
    flexDirection: "row",
    alignItems: "center",
  },
  categorySpent: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ff6b6b",
  },
  categoryBudgeted: {
    fontSize: 14,
    color: "#a8a8a8",
  },
  categoryProgressBar: {
    height: 4,
    backgroundColor: "#2a3a5c",
    borderRadius: 2,
    marginBottom: 6,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  categoryProgressText: {
    fontSize: 10,
    fontWeight: "500",
  },
  editBudgetButton: {
    backgroundColor: "#45b7d1",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  editBudgetButtonText: {
    color: "#ffffff",
    fontSize: 16,
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
  budgetModeToggle: {
    flexDirection: "row",
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  budgetModeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  budgetModeActive: {
    backgroundColor: "#4ecca3",
  },
  budgetModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a8a8a8",
  },
  budgetModeActiveText: {
    color: "#1a1a2e",
  },
  totalBudgetInput: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  monthSelectorSection: {
    backgroundColor: "#16213e",
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  monthSelectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  monthScrollView: {
    flexGrow: 0,
  },
  monthScrollContent: {
    paddingHorizontal: 4,
  },
  monthOption: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#333366",
  },
  selectedMonthOption: {
    backgroundColor: "#4ecca3",
    borderColor: "#4ecca3",
  },
  monthOptionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedMonthText: {
    color: "#1a1a2e",
    fontWeight: "bold",
  },
});
