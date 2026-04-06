const express = require('express');
const router = express.Router();
const { getProducts, createProduct, getProductById, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, createProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;