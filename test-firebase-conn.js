// Import firebase-admin correctly
import admin from 'firebase-admin';
import serviceAccount from './firebase-admin-creds.json' assert { type: 'json' };

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test function
async function testConnection() {
  try {
    const snapshot = await db.collection('test').get();
    console.log('Connection successful!');
    console.log('Number of documents found:', snapshot.size);
    return true;
  } catch (error) {
    console.error('Error connecting to Firestore:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(result => {
    console.log('Test completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });