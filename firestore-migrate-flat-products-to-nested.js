/*
  Migrate flat product docs directly under admin-data/root/products
  INTO hierarchical structure:
  admin-data/root/products/{company}/categories/{category}/subcategories/{subcategory}/products/{productId}

  Logic:
  - Detect flat product docs by presence of typical fields (company/category/subcategory/price/minPrice/productName)
  - Create/merge parent company/category/subcategory docs with {name}
  - Move product doc (preserve original doc ID) and delete the original flat doc

  Usage:
    node .\firestore-migrate-flat-products-to-nested.js [--dry]

  Notes:
  - If --dry is provided, it only logs planned operations without writing.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function initializeAdmin() {
  const hasGAC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (hasGAC) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return;
  }
  const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error('Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or add serviceAccountKey.json in project root.');
    process.exit(1);
  }
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

initializeAdmin();
const db = admin.firestore();

const ADMIN_ROOT_COLLECTION = 'admin-data';
const ADMIN_DOC_ID = 'root';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');

function looksLikeProduct(data) {
  if (!data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  const indicators = ['company', 'companyName', 'category', 'subcategory', 'price', 'minPrice', 'bottomPrice', 'productName', 'name'];
  return indicators.some((k) => keys.includes(k));
}

function clean(str, fallback = 'Unknown') {
  if (str === null || str === undefined) return fallback;
  const s = String(str).trim();
  return s.length ? s : fallback;
}

function asNumber(v, d = 0) {
  const n = parseFloat(v);
  return isNaN(n) ? d : n;
}

async function migrate() {
  const adminRef = db.collection(ADMIN_ROOT_COLLECTION).doc(ADMIN_DOC_ID);
  const flatProductsCol = adminRef.collection('products');

  const snapshot = await flatProductsCol.get();
  if (snapshot.empty) {
    console.log('No documents found under admin-data/root/products. Nothing to migrate.');
    return;
  }

  let moved = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    if (!looksLikeProduct(data)) {
      // Likely a company doc (e.g., { name: 'Samsung' }) — skip
      skipped++;
      continue;
    }

    const company = clean(data.company || data.companyName, 'Unknown');
    const category = clean(data.category, 'Unknown');
    const subcategory = clean(data.subcategory, 'Unknown');

    const name = clean(data.productName || data.name, 'Unknown Product');
    const price = asNumber(data.price, 0);
    const bottomPrice = asNumber(data.bottomPrice ?? data.minPrice, 0);
    const incentive = asNumber(data.incentive, 0);

    const discount = price > 0 ? Math.round(((price - bottomPrice) / price) * 10000) / 100 : 0;

    const companyRef = adminRef.collection('products').doc(company);
    const categoryRef = companyRef.collection('categories').doc(category);
    const subcatRef = categoryRef.collection('subcategories').doc(subcategory);
    const nestedProdRef = subcatRef.collection('products').doc(docSnap.id); // preserve ID

    if (DRY_RUN) {
      console.log(`[dry] Move ${docSnap.ref.path} -> ${nestedProdRef.path}`);
      moved++;
      continue;
    }

    // Ensure parents
    await companyRef.set({ name: company }, { merge: true });
    await categoryRef.set({ name: category }, { merge: true });
    await subcatRef.set({ name: subcategory }, { merge: true });

    // Write nested product
    const newData = {
      ...data,
      name,
      productName: name,
      price,
      minPrice: bottomPrice,
      bottomPrice,
      incentive,
      company,
      category,
      subcategory,
      discount,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await nestedProdRef.set(newData, { merge: true });

    // Delete original flat doc
    await docSnap.ref.delete();

    console.log(`Moved ${docSnap.id} -> ${nestedProdRef.path}`);
    moved++;
  }

  console.log(`Migration complete. Moved: ${moved}, Skipped: ${skipped}`);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
