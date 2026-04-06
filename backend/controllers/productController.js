const Product = require('../models/Product');

// Fetch all products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({})
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: Could not fetch products' });
    }
};

// Create a new product listing
const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, condition, image } = req.body;

        const product = new Product({
            name,
            price,
            user: req.user._id,
            image,
            category,
            condition,
            description,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({
            message: 'Server Error: Could not create product',
            error: error.message,
        });
    }
};

// Fetch a single product by ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('user', 'name email');

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error: Invalid product ID', error: error.message });
    }
};

// Delete a product (owner only)
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the logged-in user is the owner
        if (product.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product removed successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Server Error: Could not delete product',
            error: error.message,
        });
    }
};

module.exports = {
    getProducts,
    createProduct,
    getProductById,
    deleteProduct,
};
