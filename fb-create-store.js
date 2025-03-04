import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "prizmpoc.firebaseapp.com",
  projectId: "prizmpoc",
  storageBucket: "prizmpoc.firebasestorage.app",
  messagingSenderId: "324482404818",
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test write to Firestore
import { collection, addDoc } from 'firebase/firestore';

async function testFirestore() {
  try {
    const docRef = await addDoc(collection(db, "test"), {
      message: "Hello from Node.js",
      timestamp: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

testFirestore();