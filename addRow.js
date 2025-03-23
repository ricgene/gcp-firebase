// types of security used: client and admin ( admin implemented now)

// Use CommonJS syntax for Node.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config(); // Load environment variables

// Initialize Firebase Admin with service account
// You'll need to generate and download a service account key from the Firebase console
const serviceAccount = require('../../fbserviceAccountKey-admin.json'); // Path to your service account key

// Initialize the app with Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  projectId: "prizmpoc" // Your project ID (should match the one in serviceAccountKey.json)
});

// Get Firestore instance from Admin SDK
const db = getFirestore();

// Function to add a row to Firestore
async function addTableRow(collectionName, rowData) {
  try {
    // Add timestamp to the data
    const dataWithTimestamp = {
      ...rowData,
      createdAt: new Date(),
    };
    
    // Admin SDK syntax for adding documents
    const docRef = await db.collection(collectionName).add(dataWithTimestamp);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

// Example usage with sample data
const sampleRow = {
  name: "david sp:wq",
  email: "john2@example.com",
  status: "inactive"
};

// Test the function
addTableRow("users", sampleRow)
  .then(id => console.log("Successfully added row with ID:", id))
  .catch(error => console.error("Failed to add row:", error));