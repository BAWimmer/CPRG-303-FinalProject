import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ExpenseService } from "../services/expenseService";
const { useState, useEffect } = React;

interface Expense {
  id?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

const CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#ff6b6b" },
  { name: "Transportation", icon: "🚗", color: "#4ecdc4" },
  { name: "Shopping", icon: "🛍️", color: "#45b7d1" },
  { name: "Entertainment", icon: "🎬", color: "#96ceb4" },
  { name: "Bills & Utilities", icon: "💡", color: "#feca57" },
  { name: "Healthcare", icon: "🏥", color: "#ff9ff3" },
  { name: "Other", icon: "📝", color: "#a8a8a8" },
];

export default function ExpensesPage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  );
  const [formData, setFormData] = useState({
    category: "Food & Dining",
    description: "",
    amount: "",
  });
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Load expenses when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userExpenses = await ExpenseService.getUserExpenses(user.uid);
      setExpenses(userExpenses);
    } catch (error: any) {
      console.error("Error loading expenses:", error);
      Alert.alert("Error", "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const getExpensesByCategory = () => {
    // Filter expenses by selected month
    const filteredExpenses = expenses.filter((expense) => {
      const expenseMonth = expense.date.slice(0, 7); // Extract YYYY-MM from date
      return expenseMonth === selectedMonth;
    });

    const grouped = filteredExpenses.reduce(
      (acc, expense) => {
        if (!acc[expense.category]) {
          acc[expense.category] = [];
        }
        acc[expense.category].push(expense);
        return acc;
      },
      {} as Record<string, Expense[]>
    );

    return CATEGORIES.map((category) => ({
      ...category,
      expenses: grouped[category.name] || [],
      total: (grouped[category.name] || []).reduce(
        (sum, exp) => sum + exp.amount,
        0
      ),
    }));
  };

  const getTotalExpenses = () => {
    // Filter expenses by selected month for total calculation
    const filteredExpenses = expenses.filter((expense) => {
      const expenseMonth = expense.date.slice(0, 7);
      return expenseMonth === selectedMonth;
    });
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
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

  const formatSelectedMonth = () => {
    const [year, month] = selectedMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getExpensesCountForMonth = () => {
    return expenses.filter((expense) => {
      const expenseMonth = expense.date.slice(0, 7);
      return expenseMonth === selectedMonth;
    }).length;
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setFormData({ category: "Food & Dining", description: "", amount: "" });
    setIsModalVisible(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
    });
    setIsModalVisible(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!expenseId) return;

    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await ExpenseService.deleteExpense(expenseId);
              setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
              Alert.alert("Success", "Expense deleted successfully");
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  const handleSaveExpense = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save expenses");
      return;
    }

    if (!formData.description.trim() || !formData.amount.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      if (editingExpense && editingExpense.id) {
        // Update existing expense
        await ExpenseService.updateExpense(editingExpense.id, {
          category: formData.category,
          description: formData.description,
          amount,
        });

        setExpenses((prev) =>
          prev.map((exp) =>
            exp.id === editingExpense.id ? { ...exp, ...formData, amount } : exp
          )
        );
        Alert.alert("Success", "Expense updated successfully");
      } else {
        // Add new expense
        const newExpenseData = {
          userId: user.uid,
          category: formData.category,
          description: formData.description,
          amount,
          date: new Date().toISOString().split("T")[0],
        };

        const expenseId = await ExpenseService.addExpense(newExpenseData);
        const newExpense: Expense = {
          ...newExpenseData,
          id: expenseId,
        };

        setExpenses((prev) => [newExpense, ...prev]);
        Alert.alert("Success", "Expense added successfully");
      }

      setIsModalVisible(false);
      setEditingExpense(null);
      setFormData({
        category: "Food & Dining",
        description: "",
        amount: "",
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to save expense");
    }
  };

  const handleLogout = async () => {
    try {
      console.log("Attempting to logout from expenses page...");
      await signOut();
      console.log("Logout successful.");
      // Navigation will be handled by useEffect when user becomes null
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", `Failed to logout: ${error.message}`);
    }
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseDate}>{item.date}</Text>
      </View>
      <View style={styles.expenseActions}>
        <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditExpense(item)}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => item.id && handleDeleteExpense(item.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCategorySection = ({ item: category }: any) => (
    <View style={styles.categorySection}>
      <TouchableOpacity
        style={[
          styles.categoryHeader,
          { backgroundColor: category.color + "20" },
        ]}
        onPress={() => toggleCategory(category.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryArrow}>
            {expandedCategories[category.name] ? "▾" : "►"}
          </Text>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text style={styles.categoryName}>{category.name}</Text>
        </View>
        <Text style={[styles.categoryTotal, { color: category.color }]}>
          ${category.total.toFixed(2)}
        </Text>
      </TouchableOpacity>

      {expandedCategories[category.name] ? (
        category.expenses.length > 0 ? (
          <FlatList
            data={category.expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noExpenses}>No expenses in this category</Text>
        )
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4ecca3" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Spendly</Text>
          <Text style={styles.subtitle}>Track your expenses</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Total Expenses */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>
          Total Expenses for {formatSelectedMonth()}
        </Text>
        <Text style={styles.totalAmount}>${getTotalExpenses().toFixed(2)}</Text>
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
                selectedMonth === month.value && styles.selectedMonthOption,
              ]}
              onPress={() => setSelectedMonth(month.value)}
            >
              <Text
                style={[
                  styles.monthOptionText,
                  selectedMonth === month.value && styles.selectedMonthText,
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
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Text style={[styles.navButtonText, styles.activeNavButtonText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/income")}
        >
          <Text style={styles.navButtonText}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/budget")}
        >
          <Text style={styles.navButtonText}>Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Add Expense Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
        <Text style={styles.addButtonText}>+ Add Expense</Text>
      </TouchableOpacity>

      {/* Expenses by Category */}
      <FlatList
        data={getExpensesByCategory()}
        renderItem={renderCategorySection}
        keyExtractor={(item) => item.name}
        style={styles.categoriesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Expense Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categorySelector}
                >
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.categoryOption,
                        formData.category === category.name &&
                          styles.selectedCategory,
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          category: category.name,
                        }))
                      }
                    >
                      <Text style={styles.categoryOptionIcon}>
                        {category.icon}
                      </Text>
                      <Text style={styles.categoryOptionText}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter expense description"
                  placeholderTextColor="#666"
                  value={formData.description}
                  onChangeText={(value) =>
                    setFormData((prev) => ({ ...prev, description: value }))
                  }
                />

                <Text style={styles.inputLabel}>Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={formData.amount}
                  onChangeText={(value) =>
                    setFormData((prev) => ({ ...prev, amount: value }))
                  }
                  keyboardType="decimal-pad"
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveExpense}
                >
                  <Text style={styles.saveButtonText}>
                    {editingExpense ? "Update" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
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
    color: "#4ecca3",
  },
  subtitle: {
    fontSize: 12,
    color: "#a8a8a8",
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  totalSection: {
    backgroundColor: "#16213e",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
      },
      default: {
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  totalLabel: {
    fontSize: 14,
    color: "#a8a8a8",
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4ecca3",
  },
  addButton: {
    backgroundColor: "#4ecca3",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(78, 204, 163, 0.3)",
      },
      default: {
        elevation: 4,
        shadowColor: "#4ecca3",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  addButtonText: {
    color: "#1a1a2e",
    fontSize: 16,
    fontWeight: "bold",
  },
  categoriesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      default: {
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryArrow: {
    fontSize: 18,
    marginRight: 8,
    color: "#4ecca3",
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  categoryTotal: {
    fontSize: 18,
    fontWeight: "bold",
  },
  noExpenses: {
    color: "#a8a8a8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16213e",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
      },
      default: {
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
    }),
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: "#a8a8a8",
  },
  expenseActions: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ecca3",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
  },
  editButton: {
    backgroundColor: "#45b7d1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4ecca3",
    textAlign: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
    marginTop: 16,
  },
  categorySelector: {
    marginBottom: 8,
  },
  categoryOption: {
    alignItems: "center",
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#16213e",
    minWidth: 80,
  },
  selectedCategory: {
    backgroundColor: "#4ecca3",
  },
  categoryOptionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 12,
    color: "#ffffff",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#16213e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#666",
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#4ecca3",
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#1a1a2e",
    fontSize: 16,
    fontWeight: "bold",
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
  navigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: "600",
  },
  activeNavButtonText: {
    color: "#1a1a2e",
  },
  monthSelectorSection: {
    backgroundColor: "#16213e",
    margin: 12,
    padding: 12,
    borderRadius: 12,
  },
  monthSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monthSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  expenseCount: {
    fontSize: 12,
    color: "#4ecca3",
    fontWeight: "500",
  },
  monthScrollView: {
    flexGrow: 0,
  },
  monthScrollContent: {
    paddingHorizontal: 4,
  },
  monthOption: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
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
    fontSize: 12,
    fontWeight: "500",
  },
  selectedMonthText: {
    color: "#1a1a2e",
    fontWeight: "bold",
  },
});
