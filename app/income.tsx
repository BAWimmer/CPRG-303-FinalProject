import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ExpenseService } from "../services/expenseService";
import { Income, IncomeService } from "../services/incomeService";

const INCOME_SOURCES = [
  { name: "Salary", icon: "💼", color: "#4ecca3" },
  { name: "Freelance", icon: "💻", color: "#45b7d1" },
  { name: "Business", icon: "🏢", color: "#96ceb4" },
  { name: "Investments", icon: "📈", color: "#feca57" },
  { name: "Rental", icon: "🏠", color: "#ff9ff3" },
  { name: "Gifts", icon: "🎁", color: "#ff6b6b" },
  { name: "Other", icon: "💰", color: "#a8a8a8" },
];

const FREQUENCY_OPTIONS = [
  { value: "one-time", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function IncomePage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  );
  const [formData, setFormData] = useState({
    source: "Salary",
    description: "",
    amount: "",
    frequency: "monthly",
  });
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({});

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Load income when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadIncome();
      loadExpenses();
    }
  }, [user]);

  // Reload expenses when selected month changes
  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [selectedMonth, user]);

  const handleMonthChange = (monthValue: string) => {
    setExpensesLoading(true);
    setSelectedMonth(monthValue);
  };

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    INCOME_SOURCES.forEach((source) => {
      initialExpanded[source.name] = false;
    });
    setExpandedSources(initialExpanded);
  }, []);

  const loadIncome = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userIncome = await IncomeService.getUserIncome(user.uid);
      setIncomes(userIncome);
    } catch (error: any) {
      console.error("Error loading income:", error);
      Alert.alert("Error", "Failed to load income");
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    if (!user) return;

    try {
      setExpensesLoading(true);
      const userExpenses = await ExpenseService.getUserExpenses(user.uid);
      // Filter expenses by selected month
      const filteredExpenses = userExpenses.filter((expense) => {
        const expenseMonth = expense.date.slice(0, 7);
        return expenseMonth === selectedMonth;
      });
      const total = filteredExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      setTotalExpenses(total);
    } catch (error: any) {
      console.error("Error loading expenses:", error);
    } finally {
      setExpensesLoading(false);
    }
  };

  const getIncomeBySource = () => {
    // Filter incomes by selected month
    const filteredIncomes = incomes.filter((income) => {
      const incomeMonth = income.date.slice(0, 7); // Extract YYYY-MM from date
      return incomeMonth === selectedMonth;
    });

    const grouped = filteredIncomes.reduce(
      (acc, income) => {
        if (!acc[income.source]) {
          acc[income.source] = [];
        }
        acc[income.source].push(income);
        return acc;
      },
      {} as Record<string, Income[]>
    );

    return INCOME_SOURCES.map((source) => ({
      ...source,
      incomes: grouped[source.name] || [],
      total: (grouped[source.name] || []).reduce(
        (sum, inc) => sum + inc.amount,
        0
      ),
    })).filter((source) => source.incomes.length > 0);
  };

  const getTotalIncome = () => {
    // Filter incomes by selected month for total calculation
    const filteredIncomes = incomes.filter((income) => {
      const incomeMonth = income.date.slice(0, 7);
      return incomeMonth === selectedMonth;
    });
    return filteredIncomes.reduce((total, income) => total + income.amount, 0);
  };

  const getNetIncome = () => {
    const totalIncome = getTotalIncome();
    return totalIncome - totalExpenses;
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

  const handleDeleteIncome = async (incomeId: string) => {
    if (!incomeId) return;

    Alert.alert(
      "Delete Income",
      "Are you sure you want to delete this income entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await IncomeService.deleteIncome(incomeId);
              setIncomes((prev) => prev.filter((inc) => inc.id !== incomeId));
              loadExpenses();
              Alert.alert("Success", "Income deleted successfully");
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete income");
            }
          },
        },
      ]
    );
  };

  const toggleSource = (sourceName: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [sourceName]: !prev[sourceName],
    }));
  };

  const handleSaveIncome = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save income");
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
      if (editingIncome && editingIncome.id) {
        // Update existing income
        await IncomeService.updateIncome(editingIncome.id, {
          source: formData.source,
          description: formData.description,
          amount,
          frequency: formData.frequency as any,
        });

        setIncomes((prev) =>
          prev.map((inc) =>
            inc.id === editingIncome.id
              ? {
                  ...inc,
                  ...formData,
                  amount,
                  frequency: formData.frequency as any,
                }
              : inc
          )
        );
        Alert.alert("Success", "Income updated successfully");
      } else {
        // Add new income
        const newIncomeData = {
          userId: user.uid,
          source: formData.source,
          description: formData.description,
          amount,
          frequency: formData.frequency as any,
          date: new Date().toISOString().split("T")[0],
        };

        const incomeId = await IncomeService.addIncome(newIncomeData);
        const newIncome: Income = {
          ...newIncomeData,
          id: incomeId,
        };

        setIncomes((prev) => [newIncome, ...prev]);
        Alert.alert("Success", "Income added successfully");
      }

      // Reload expenses to ensure accurate net income calculation
      loadExpenses();

      setIsModalVisible(false);
      setEditingIncome(null);
      setFormData({
        source: "Salary",
        description: "",
        amount: "",
        frequency: "monthly",
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to save income");
    }
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      source: income.source,
      description: income.description,
      amount: income.amount.toString(),
      frequency: income.frequency,
    });
    setIsModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      console.log("Attempting to logout from income page...");
      await signOut();
      console.log("Logout successful.");
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", `Failed to logout: ${error.message}`);
    }
  };

  const renderIncomeItem = ({ item }: { item: Income }) => (
    <View style={styles.incomeItem}>
      <View style={styles.incomeInfo}>
        <Text style={styles.incomeDescription}>{item.description}</Text>
        <Text style={styles.incomeDate}>
          {item.date} •{" "}
          {FREQUENCY_OPTIONS.find((f) => f.value === item.frequency)?.label}
        </Text>
      </View>
      <View style={styles.incomeActions}>
        <Text style={styles.incomeAmount}>+${item.amount.toFixed(2)}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditIncome(item)}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => item.id && handleDeleteIncome(item.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSourceSection = ({ item }: { item: any }) => (
    <View style={styles.sourceSection}>
      <TouchableOpacity
        style={[styles.sourceHeader, { backgroundColor: item.color + "20" }]}
        onPress={() => toggleSource(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceArrow}>
            {expandedSources[item.name] ? "▾" : "►"}
          </Text>
          <Text style={styles.sourceIcon}>{item.icon}</Text>
          <Text style={styles.sourceName}>{item.name}</Text>
        </View>
        <Text style={[styles.sourceTotal, { color: item.color }]}>
          +${item.total.toFixed(2)}
        </Text>
      </TouchableOpacity>
      {expandedSources[item.name] && item.incomes.length > 0 && (
        <FlatList
          data={item.incomes}
          renderItem={renderIncomeItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4ecca3" />
        <Text style={styles.loadingText}>Loading income...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Income Tracker</Text>
          <Text style={styles.subtitle}>Manage your income sources</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Total Income */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>
          Net Income for {formatSelectedMonth()}
        </Text>
        {expensesLoading ? (
          <Text style={[styles.totalAmount, { color: "#a8a8a8" }]}>
            Calculating...
          </Text>
        ) : (
          <Text
            style={[
              styles.totalAmount,
              { color: getNetIncome() >= 0 ? "#4ecca3" : "#ff6b6b" },
            ]}
          >
            {getNetIncome() >= 0 ? "+" : ""}${getNetIncome().toFixed(2)}
          </Text>
        )}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Income</Text>
            <Text style={styles.breakdownAmount}>
              +${getTotalIncome().toFixed(2)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Expenses</Text>
            {expensesLoading ? (
              <Text style={[styles.breakdownAmount, { color: "#a8a8a8" }]}>
                Loading...
              </Text>
            ) : (
              <Text style={[styles.breakdownAmount, { color: "#ff6b6b" }]}>
                -${totalExpenses.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
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
              onPress={() => handleMonthChange(month.value)}
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
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/expenses")}
        >
          <Text style={styles.navButtonText}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Text style={[styles.navButtonText, styles.activeNavButtonText]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/budget")}
        >
          <Text style={styles.navButtonText}>Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Add Income Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Income</Text>
      </TouchableOpacity>

      {/* Income List */}
      <ScrollView style={styles.content}>
        {getIncomeBySource().length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No income entries yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first income source to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={getIncomeBySource()}
            renderItem={renderSourceSection}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      {/* Add/Edit Income Modal */}
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
              {editingIncome ? "Edit Income" : "Add Income"}
            </Text>
            <TouchableOpacity onPress={handleSaveIncome}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Source</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sourceSelector}
              >
                {INCOME_SOURCES.map((source) => (
                  <TouchableOpacity
                    key={source.name}
                    style={[
                      styles.sourceOption,
                      formData.source === source.name && styles.selectedSource,
                      { backgroundColor: source.color },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, source: source.name }))
                    }
                  >
                    <Text style={styles.sourceOptionIcon}>{source.icon}</Text>
                    <Text style={styles.sourceOptionText}>{source.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Monthly salary, Freelance project"
                placeholderTextColor="#666"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, description: text }))
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, amount: text }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Frequency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.frequencySelector}
              >
                {FREQUENCY_OPTIONS.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyOption,
                      formData.frequency === freq.value &&
                        styles.selectedFrequency,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        frequency: freq.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        formData.frequency === freq.value &&
                          styles.selectedFrequencyText,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
  totalSection: {
    backgroundColor: "#16213e",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
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
  breakdown: {
    marginTop: 12,
    width: "100%",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#a8a8a8",
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ecca3",
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
  addButton: {
    backgroundColor: "#4ecca3",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addButtonText: {
    color: "#1a1a2e",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#a8a8a8",
    textAlign: "center",
  },
  sourceSection: {
    marginBottom: 20,
    backgroundColor: "#16213e",
    borderRadius: 12,
    overflow: "hidden",
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  sourceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sourceArrow: {
    fontSize: 16,
    color: "#666",
    marginRight: 8,
    width: 20,
  },
  sourceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sourceName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  sourceTotal: {
    fontSize: 18,
    fontWeight: "bold",
  },
  incomeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a5c",
  },
  incomeInfo: {
    flex: 1,
  },
  incomeDescription: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  incomeDate: {
    fontSize: 14,
    color: "#a8a8a8",
    marginTop: 4,
  },
  incomeActions: {
    alignItems: "flex-end",
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4ecca3",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
  },
  editButton: {
    backgroundColor: "#45b7d1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
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
  sourceSelector: {
    flexDirection: "row",
  },
  sourceOption: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 80,
  },
  selectedSource: {
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  sourceOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sourceOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a2e",
    textAlign: "center",
  },
  frequencySelector: {
    flexDirection: "row",
  },
  frequencyOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  selectedFrequency: {
    backgroundColor: "#4ecca3",
    borderColor: "#4ecca3",
  },
  frequencyOptionText: {
    fontSize: 14,
    color: "#a8a8a8",
    fontWeight: "500",
  },
  selectedFrequencyText: {
    color: "#1a1a2e",
    fontWeight: "600",
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
  incomeCount: {
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
