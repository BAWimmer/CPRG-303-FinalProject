import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQDmFoKOuOF_stIk48H_skyV_4U6lEnik",
  authDomain: "cprg-303-final-project.firebaseapp.com",
  projectId: "cprg-303-final-project",
  storageBucket: "cprg-303-final-project.firebasestorage.app",
  messagingSenderId: "817222703026",
  appId: "1:817222703026:web:793b05d7ac492ed19336ab",
  measurementId: "G-4X3E05KV5T"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
export default app;
