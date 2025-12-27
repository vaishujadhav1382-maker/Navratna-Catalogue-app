const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product CRUD operations
router.post('/bulk-import', productController.bulkImportProducts);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Analytics routes
router.get('/stats/summary', productController.getProductStats);
router.get('/stats/by-category', productController.getProductsByCategory);

module.exports = router;
