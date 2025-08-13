import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.appName}>Spendly</Text>
        <Text style={styles.tagline}>Track your expenses with ease</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💰</Text>
        </View>

        <Text style={styles.description}>
          Take control of your finances by tracking your monthly expenses across
          different categories
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureItem}>
            📊 Categorized expense tracking
          </Text>
          <Text style={styles.featureItem}>
            📝 Easy adding and editing of expenses
          </Text>
          <Text style={styles.featureItem}>
            📱 Simple and intuitive interface
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.signUpButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signInButton]}
          onPress={() => router.push("/signin")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 80,
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#4ecca3",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#a8a8a8",
    textAlign: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  description: {
    fontSize: 18,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  features: {
    alignItems: "flex-start",
  },
  featureItem: {
    fontSize: 16,
    color: "#a8a8a8",
    marginBottom: 12,
  },
  buttonContainer: {
    marginBottom: 50,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      },
      default: {
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  signUpButton: {
    backgroundColor: "#4ecca3",
  },
  signUpButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  signInButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#4ecca3",
  },
  signInButtonText: {
    color: "#4ecca3",
    fontSize: 18,
    fontWeight: "bold",
  },
});
