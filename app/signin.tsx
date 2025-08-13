import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { runFirebaseTest } from "../utils/firebaseDebug";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  // Test Firebase connection on component mount
  useEffect(() => {
    runFirebaseTest();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/expenses");
    }
  }, [user, authLoading, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error message when user starts typing
    if (errors.email || errors.password || errors.general) {
      setErrors({ email: "", password: "", general: "" });
    }
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "", general: "" };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email";
      isValid = false;
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Please enter your password";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({ email: "", password: "", general: "" }); // Clear any existing errors

    try {
      // Wrap the signIn call to ensure no unhandled promise rejections
      const signInPromise = signIn(formData.email, formData.password);
      await signInPromise.catch((error) => {
        // This catch ensures the promise rejection is handled
        throw error;
      });
      router.push("/expenses");
    } catch (error: any) {
      // Prevent any error bubbling that might cause popups
      console.log("Sign in error caught and handled:", error);

      // Map Firebase errors to user-friendly messages
      let emailError = "";
      let passwordError = "";

      const errorCode = error?.code || "";
      const errorMessage = error?.message || "";

      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorMessage.includes("invalid-credential")
      ) {
        // For security, we don't want to reveal if email exists or not
        emailError = "Invalid username or password";
        passwordError = "Invalid username or password";
      } else if (errorCode === "auth/invalid-email") {
        emailError = "Please enter a valid email address";
      } else if (errorCode === "auth/too-many-requests") {
        emailError = "Too many failed attempts. Please try again later.";
      } else {
        emailError = "Sign in failed. Please try again.";
      }

      setErrors({ email: emailError, password: passwordError, general: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue tracking your expenses
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Enter your password"
              placeholderTextColor="#666"
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              secureTextEntry
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Landing */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginTop: 80,
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4ecca3",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#a8a8a8",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(247, 71, 71, 0.68)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "ff4d4d",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5c",
    // Modern shadow using boxShadow (web) and elevation (native)
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      default: {
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  inputError: {
    borderColor: "#ff4d4d",
    borderWidth: 1,
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: "#4ecca3",
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: "#4ecca3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    // Modern shadow using boxShadow (web) and elevation (native)
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
  signInButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#666",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    color: "#a8a8a8",
    fontSize: 16,
  },
  linkText: {
    color: "#4ecca3",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    alignItems: "center",
    marginBottom: 30,
  },
  backButtonText: {
    color: "#4ecca3",
    fontSize: 16,
  },
});
