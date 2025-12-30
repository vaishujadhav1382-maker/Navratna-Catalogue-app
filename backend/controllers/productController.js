const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// Collection name
const PRODUCTS_COLLECTION = 'products';

/**
 * Bulk import products from Excel data
 */
exports.bulkImportProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid data', 
        message: 'Products array is required and must not be empty' 
      });
    }

    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const importedProducts = [];

    products.forEach((product) => {
      // Validate required fields
      if (!product.name || !product.company || !product.category) {
        throw new Error(`Missing required fields for product: ${product.name || 'Unknown'}`);
      }

      // Create a new document reference with auto-generated ID
      const productRef = db.collection(PRODUCTS_COLLECTION).doc();
      
      // Calculate discount percentage if not provided
      const discount = product.discount || 
        (product.price && product.minPrice 
          ? Math.round(((product.price - product.minPrice) / product.price) * 100)
          : 0);

      const productData = {
        id: productRef.id,
        name: product.name || '',
        company: product.company || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        description: product.description || '',
        mrp: parseFloat(product.mrp) || 0,
        price: parseFloat(product.price) || 0,
        minPrice: parseFloat(product.minPrice) || 0,
        incentive: parseFloat(product.incentive) || 0,
        rating: parseFloat(product.rating) || 0,
        stock: parseInt(product.stock) || 0,
        image: product.image || '',
        discount: discount,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      batch.set(productRef, productData);
      importedProducts.push({ ...productData, id: productRef.id });
    });

    await batch.commit();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${products.length} products`,
      count: products.length,
      products: importedProducts
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ 
      error: 'Failed to import products', 
      message: error.message 
    });
  }
};

/**
 * Get all products
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category, company, limit = 100, orderBy = 'createdAt', order = 'desc' } = req.query;

    let query = db.collection(PRODUCTS_COLLECTION);

    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    if (company) {
      query = query.where('company', '==', company);
    }

    // Apply sorting
    query = query.orderBy(orderBy, order);

    // Apply limit
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        products: [], 
        count: 0 
      });
    }

    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    res.json({ 
      success: true, 
      products, 
      count: products.length 
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products', 
      message: error.message 
    });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(PRODUCTS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        error: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      product: { id: doc.id, ...doc.data() } 
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product', 
      message: error.message 
    });
  }
};

/**
 * Create a single product
 */
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.name || !productData.company || !productData.category) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'name, company, and category are required' 
      });
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Calculate discount if not provided
    const discount = productData.discount || 
      (productData.price && productData.minPrice 
        ? Math.round(((productData.price - productData.minPrice) / productData.price) * 100)
        : 0);

    const newProduct = {
      ...productData,
      mrp: productData.mrp !== undefined ? parseFloat(productData.mrp) : 0,
      discount,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const docRef = await db.collection(PRODUCTS_COLLECTION).add(newProduct);
    
    res.status(201).json({ 
      success: true, 
      message: 'Product created successfully',
      product: { id: docRef.id, ...newProduct } 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      error: 'Failed to create product', 
      message: error.message 
    });
  }
};

/**
 * Update a product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const docRef = db.collection(PRODUCTS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        error: 'Product not found' 
      });
    }

    // Recalculate discount if price or minPrice changed
    if (updates.price || updates.minPrice) {
      const currentData = doc.data();
      const price = updates.price || currentData.price;
      const minPrice = updates.minPrice || currentData.minPrice;
      
      if (price && minPrice) {
        updates.discount = Math.round(((price - minPrice) / price) * 100);
      }
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (updates.mrp !== undefined) {
      updates.mrp = parseFloat(updates.mrp) || 0;
    }
    await docRef.update(updates);

    res.json({ 
      success: true, 
      message: 'Product updated successfully',
      product: { id, ...updates } 
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      error: 'Failed to update product', 
      message: error.message 
    });
  }
};

/**
 * Delete a product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(PRODUCTS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        error: 'Product not found' 
      });
    }

    await docRef.delete();

    res.json({ 
      success: true, 
      message: 'Product deleted successfully',
      id 
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product', 
      message: error.message 
    });
  }
};

/**
 * Get product statistics
 */
exports.getProductStats = async (req, res) => {
  try {
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    
    let totalProducts = 0;
    let totalValue = 0;
    let totalStock = 0;
    let categories = new Set();
    let companies = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      totalProducts++;
      totalValue += data.price * data.stock || 0;
      totalStock += data.stock || 0;
      categories.add(data.category);
      companies.add(data.company);
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalValue,
        totalStock,
        totalCategories: categories.size,
        totalCompanies: companies.size,
        averagePrice: totalProducts > 0 ? Math.round(totalValue / totalStock) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics', 
      message: error.message 
    });
  }
};

/**
 * Get products grouped by category
 */
exports.getProductsByCategory = async (req, res) => {
  try {
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    
    const categoryMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          count: 0,
          products: []
        };
      }
      
      categoryMap[category].count++;
      categoryMap[category].products.push({ id: doc.id, ...data });
    });

    const categories = Object.values(categoryMap);

    res.json({
      success: true,
      categories,
      totalCategories: categories.length
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products by category', 
      message: error.message 
    });
  }
};
