import { onAuthStateChanged, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../config/firebaseConfig";
import { AuthService, UserData } from "../services/authService";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "Auth state changed:",
        firebaseUser ? `User: ${firebaseUser.email}` : "No user"
      );

      if (firebaseUser) {
        console.log("AuthContext: User is authenticated, setting user state");
        setUser(firebaseUser);
        // Get user data from Firestore
        const data = await AuthService.getUserData(firebaseUser.uid);
        setUserData(data);
        console.log("AuthContext: User data loaded:", data?.name);
      } else {
        console.log("AuthContext: User is not authenticated, clearing state");
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener");
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userData = await AuthService.signIn(email, password);
      setUserData(userData);
    } catch (error: any) {
      throw error;
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const userData = await AuthService.signUp(name, email, password);
      setUserData(userData);
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("AuthContext: Starting signOut process...");
      await AuthService.signOut();
      console.log(
        "AuthContext: Firebase signOut completed, state will be updated by onAuthStateChanged"
      );
      // Don't manually set state - let onAuthStateChanged handle it
    } catch (error: any) {
      console.error("AuthContext: SignOut error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
