// Test Firestore Connection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCW86RlbmSTGL9MHZZ_myw7C3zClp69DDA",
  authDomain: "admin-panel-430b8.firebaseapp.com",
  projectId: "admin-panel-430b8",
  storageBucket: "admin-panel-430b8.firebasestorage.app",
  messagingSenderId: "233849790581",
  appId: "1:233849790581:web:5a002f3c59a6582944983c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestoreConnection() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test reading from the employees collection
    const employeesSnapshot = await getDocs(collection(db, 'company', 'admin-data', 'employees'));
    console.log(`✓ Found ${employeesSnapshot.size} employees in Firestore`);
    
    employeesSnapshot.forEach((doc) => {
      console.log(`  - Employee: ${doc.data().name} (${doc.data().mobile})`);
    });
    
    console.log('\n✅ Firestore connection successful!');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
  }
}

testFirestoreConnection();
