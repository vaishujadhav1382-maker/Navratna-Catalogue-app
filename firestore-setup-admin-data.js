/*
  Firestore setup script: Creates a root admin-data document with two subcollections:
  - employees
  - products → {company} → categories → {category} → subcategories → {subcategory} → products (empty, to be filled by app)

  Run:
  - Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path OR place serviceAccountKey.json in project root.
  - node firestore-setup-admin-data.js
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function initializeAdmin() {
  const hasGAC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (hasGAC) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    return;
  }
  const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error('Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or add serviceAccountKey.json in project root.');
    process.exit(1);
  }
  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

initializeAdmin();
const db = admin.firestore();

const ADMIN_ROOT_COLLECTION = 'admin-data';
const ADMIN_DOC_ID = 'root';

// Edit seed data as needed. This seeds the hierarchy (companies → categories → subcategories).
const seedCompanies = {
  Samsung: {
    categories: {
      TV: ['LED', 'OLED', 'QLED'],
      Refrigerator: ['Single Door', 'Double Door'],
    },
  },
  LG: {
    categories: {
      TV: ['LED', 'OLED'],
      'Washing Machine': ['Front Load', 'Top Load'],
    },
  },
};

async function ensureAdminRoot() {
  const adminDocRef = db.collection(ADMIN_ROOT_COLLECTION).doc(ADMIN_DOC_ID);
  await adminDocRef.set(
    {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return adminDocRef;
}

async function seedProductsHierarchy(adminDocRef) {
  const productsCol = adminDocRef.collection('products');

  for (const [companyName, companyData] of Object.entries(seedCompanies)) {
    const companyRef = productsCol.doc(companyName);
    await companyRef.set({ name: companyName }, { merge: true });

    const categories = companyData.categories || {};
    for (const [categoryName, subcategories] of Object.entries(categories)) {
      const categoryRef = companyRef.collection('categories').doc(categoryName);
      await categoryRef.set({ name: categoryName }, { merge: true });

      const batch = db.batch();
      for (const subcat of subcategories) {
        const subRef = categoryRef.collection('subcategories').doc(subcat);
        batch.set(subRef, { name: subcat }, { merge: true });
        // Note: subRef.collection('products') is intentionally left empty to be filled by the app.
      }
      await batch.commit();
    }
  }
}

async function main() {
  try {
    console.log('Setting up Firestore admin-data hierarchy...');
    const adminDocRef = await ensureAdminRoot();

    // Ensure the two key subcollections exist by creating nothing (Firestore creates collections when docs are added):
    // employees: left empty (app will add docs)
    // products: seeded with companies → categories → subcategories (no products yet)
    await seedProductsHierarchy(adminDocRef);

    console.log('Done. Hierarchy created at:', `${ADMIN_ROOT_COLLECTION}/${ADMIN_DOC_ID}`);
    console.log('- Employees path:', `${ADMIN_ROOT_COLLECTION}/${ADMIN_DOC_ID}/employees/{employeeId}`);
    console.log('- Products path:', `${ADMIN_ROOT_COLLECTION}/${ADMIN_DOC_ID}/products/{company}/categories/{category}/subcategories/{subcategory}/products/{productId}`);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

main();
