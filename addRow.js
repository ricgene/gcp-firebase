import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import 'dotenv/config';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "prizmpoc.firebaseapp.com",
  projectId: "prizmpoc",
  storageBucket: "prizmpoc.firebasestorage.app",
  messagingSenderId: "324482404818",
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to add a row to Firestore
async function addTableRow(collectionName, rowData) {
  try {
    // Add timestamp to the data
    const dataWithTimestamp = {
      ...rowData,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, collectionName), dataWithTimestamp);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

// Example usage with sample data
const sampleRow = {
  name: "John Doe2",
  email: "john2@example.com",
  status: "inactive"
};

// Test the function
addTableRow("users", sampleRow)
  .then(id => console.log("Successfully added row with ID:", id))
  .catch(error => console.error("Failed to add row:", error));
