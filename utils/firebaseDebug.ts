// Debug utility to test Firebase connection
import { auth, firestore } from '../config/firebaseConfig';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    console.log('Auth instance:', auth);
    console.log('Firestore instance:', firestore);
    console.log('Firebase project ID:', auth.app.options.projectId);
    console.log('Firebase auth domain:', auth.app.options.authDomain);
    
    // Test if we can access auth
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser);
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

// Call this function to test the connection
export const runFirebaseTest = () => {
  console.log('=== Firebase Connection Test ===');
  testFirebaseConnection();
};
