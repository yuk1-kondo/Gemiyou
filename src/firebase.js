// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQSADk6i7J8FAU7dFcg5MUWGd481IMU84",
  authDomain: "gemiyou.firebaseapp.com",
  projectId: "gemiyou",
  storageBucket: "gemiyou.firebasestorage.app",
  messagingSenderId: "387517732773",
  appId: "1:387517732773:web:9d892a155386bac5be3a4c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
