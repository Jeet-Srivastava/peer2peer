const express = require('express');
const router = express.Router();
const {
    getProducts,
    createProduct,
    getProductById,
    deleteProduct,
} = require('../controllers/productController');
const { protect, sellerOnly } = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, sellerOnly, createProduct);
router.delete('/:id', protect, sellerOnly, deleteProduct);

module.exports = router;
