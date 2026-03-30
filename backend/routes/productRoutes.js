const express = require('express');
const router = express.Router();
const { getProducts, createProduct, getProductById } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductById);

router.post('/', protect, createProduct);

module.exports = router;