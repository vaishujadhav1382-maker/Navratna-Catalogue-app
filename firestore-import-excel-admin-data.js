/*
  Import products from Excel into Firestore under admin-data/root hierarchical structure:

  Path:
  admin-data/root/products/{company}/categories/{category}/subcategories/{subcategory}/products/{productId}

  Usage (PowerShell):
    node .\firestore-import-excel-admin-data.js --file "D:\\path\\to\\products.xlsx" --clear

  Notes:
  - --clear will remove ALL existing data under admin-data/root/products before import
  - Column mapping is flexible; supported names shown below in findValue()
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const XLSX = require('xlsx');

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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { file: null, sheet: null, clear: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && i + 1 < args.length) out.file = args[++i];
    else if (a === '--sheet' && i + 1 < args.length) out.sheet = args[++i];
    else if (a === '--clear') out.clear = true;
  }
  if (!out.file) {
    console.error('Usage: node firestore-import-excel-admin-data.js --file "<path-to-excel>" [--sheet "Sheet1"] [--clear]');
    process.exit(1);
  }
  return out;
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function findValue(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return '';
}

async function clearProductsTree() {
  console.log('Clearing existing admin-data/root/products hierarchy...');
  const adminRef = db.collection(ADMIN_ROOT_COLLECTION).doc(ADMIN_DOC_ID);
  const productsCol = adminRef.collection('products');

  const companiesSnap = await productsCol.get();
  let deleteCount = 0;

  for (const companyDoc of companiesSnap.docs) {
    const categoriesSnap = await companyDoc.ref.collection('categories').get();
    for (const categoryDoc of categoriesSnap.docs) {
      const subcatsSnap = await categoryDoc.ref.collection('subcategories').get();
      for (const subDoc of subcatsSnap.docs) {
        // delete products in batches
        const productsSnap = await subDoc.ref.collection('products').get();
        const batches = [];
        let batch = db.batch();
        let ops = 0;
        for (const pDoc of productsSnap.docs) {
          batch.delete(pDoc.ref);
          ops++;
          if (ops >= 450) {
            batches.push(batch.commit());
            batch = db.batch();
            ops = 0;
          }
        }
        if (ops > 0) batches.push(batch.commit());
        await Promise.all(batches);
        deleteCount += productsSnap.size;

        // delete subcategory doc
        await subDoc.ref.delete();
      }
      // delete category doc
      await categoryDoc.ref.delete();
    }
    // delete company doc
    await companyDoc.ref.delete();
  }
  console.log(`Cleared ${deleteCount} product docs and removed all seeded nodes.`);
}

async function importFromExcel(filePath, sheetName) {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
  const wsName = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  if (!ws) {
    console.error(`Sheet not found: ${wsName}`);
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`Loaded ${rows.length} rows from sheet '${wsName}'.`);

  const adminRef = db.collection(ADMIN_ROOT_COLLECTION).doc(ADMIN_DOC_ID);

  // Track parents to avoid redundant writes
  const ensuredParents = new Set();

  // Batch writer
  let batch = db.batch();
  let ops = 0;
  let createdProducts = 0;

  const ensureParent = async (company, category, subcategory) => {
    const companyPath = `${ADMIN_ROOT_COLLECTION}/${ADMIN_DOC_ID}/products/${company}`;
    const categoryPath = `${companyPath}/categories/${category}`;
    const subcatPath = `${categoryPath}/subcategories/${subcategory}`;

    if (!ensuredParents.has(companyPath)) {
      batch.set(adminRef.collection('products').doc(company), { name: company }, { merge: true });
      ensuredParents.add(companyPath);
      ops++;
    }
    if (!ensuredParents.has(categoryPath)) {
      batch.set(adminRef.collection('products').doc(company).collection('categories').doc(category), { name: category }, { merge: true });
      ensuredParents.add(categoryPath);
      ops++;
    }
    if (!ensuredParents.has(subcatPath)) {
      batch.set(
        adminRef.collection('products').doc(company).collection('categories').doc(category).collection('subcategories').doc(subcategory),
        { name: subcategory },
        { merge: true }
      );
      ensuredParents.add(subcatPath);
      ops++;
    }
  };

  const commitIfNeeded = async () => {
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  for (const row of rows) {
    const company = clean(findValue(row, ['Company', 'company', 'Brand', 'brand', 'Manufacturer', 'manufacturer'])) || 'Unknown';
    const category = clean(findValue(row, ['Category', 'category', 'Type', 'type', 'Product Type'])) || 'Unknown';
    const subcategory = clean(findValue(row, ['Subcategory', 'subcategory', 'Sub Category', 'sub category', 'Subtype'])) || 'Unknown';
    const productName = clean(findValue(row, ['Product Name', 'product name', 'Name', 'name', 'Product', 'product'])) || 'Unknown Product';
    const price = asNumber(findValue(row, ['Price', 'price', 'Cost', 'cost', 'Amount']));
    const bottomPrice = asNumber(findValue(row, ['Bottom Price', 'bottom price', 'Min Price', 'min price', 'Minimum Price', 'minimum price', 'Base Price', 'base price', 'Lowest Price', 'lowest price', 'MinPrice', 'minPrice']));
    const incentive = asNumber(findValue(row, ['Incentive', 'incentive', 'Commission', 'commission', 'Bonus']));

    await ensureParent(company, category, subcategory);
    await commitIfNeeded();

    const discount = price > 0 ? ((price - bottomPrice) / price) * 100 : 0;

    const productsColRef = adminRef
      .collection('products').doc(company)
      .collection('categories').doc(category)
      .collection('subcategories').doc(subcategory)
      .collection('products');

    const prodRef = productsColRef.doc();
    batch.set(prodRef, {
      // Both naming schemes for compatibility with UI and spec
      productName,
      name: productName,
      price,
      bottomPrice,
      minPrice: bottomPrice,
      incentive,
      company,
      category,
      subcategory,
      discount: Math.round(discount * 100) / 100,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops++;
    createdProducts++;
    await commitIfNeeded();
  }

  if (ops > 0) {
    await batch.commit();
  }
  console.log(`Imported ${createdProducts} products.`);
}

async function main() {
  try {
    const { file, sheet, clear } = parseArgs();
    console.log('Starting Excel import...');

    if (clear) {
      await clearProductsTree();
    }

    await importFromExcel(file, sheet);

    console.log('Excel import completed successfully.');
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

main();
