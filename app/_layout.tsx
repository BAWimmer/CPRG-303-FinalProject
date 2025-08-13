import { Stack } from "expo-router";
import React from "react";
import { AuthProvider } from "../contexts/AuthContext";

// Error boundary component to catch and handle errors silently
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI
    console.log("ErrorBoundary caught error:", error);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Silently handle Firebase auth errors
    if (
      error?.code?.includes("auth/") ||
      error?.message?.includes("Firebase")
    ) {
      console.log("Suppressed Firebase error in ErrorBoundary:", error);
      this.setState({ hasError: false });
      return;
    }
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="expenses" />
          <Stack.Screen name="income" />
          <Stack.Screen name="budget" />
        </Stack>
      </AuthProvider>
    </ErrorBoundary>
  );
}
