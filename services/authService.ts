import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    updateProfile,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebaseConfig';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class AuthService {
  // Sign up new user
  static async signUp(name: string, email: string, password: string): Promise<UserData> {
    try {
      console.log('Attempting to create user:', email);
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);

      // Update the user's display name
      await updateProfile(user, { displayName: name });

      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        name,
        email,
        createdAt: new Date()
      };

      await setDoc(doc(firestore, 'users', user.uid), userData);
      console.log('User data saved to Firestore');

      return userData;
    } catch (error: any) {
      console.error('Sign up error:', error);
      // Provide more user-friendly error messages
      let message = error.message;
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      throw new Error(message);
    }
  }

  // Sign in existing user
  static async signIn(email: string, password: string): Promise<UserData> {
    try {
      console.log('Attempting to sign in user:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User signed in successfully:', user.uid);

      // Get user data from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        console.log('User data found in Firestore');
        return userDoc.data() as UserData;
      } else {
        console.log('User data not found, creating new document');
        // If user document doesn't exist, create one
        const userData: UserData = {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          createdAt: new Date()
        };
        await setDoc(doc(firestore, 'users', user.uid), userData);
        return userData;
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      // Provide more user-friendly error messages
      let message = error.message;
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      throw new Error(message);
    }
  }

  // Sign out user
  static async signOut(): Promise<void> {
    try {
      console.log('AuthService: Signing out user...');
      console.log('AuthService: Current user before signOut:', auth.currentUser?.email);
      await firebaseSignOut(auth);
      console.log('AuthService: Firebase signOut completed successfully');
      console.log('AuthService: Current user after signOut:', auth.currentUser);
    } catch (error: any) {
      console.error('AuthService: Sign out error:', error);
      console.error('AuthService: Error code:', error.code);
      console.error('AuthService: Error message:', error.message);
      throw new Error(error.message);
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Get user data from Firestore
  static async getUserData(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error: any) {
      console.error('Error getting user data:', error);
      return null;
    }
  }
}
