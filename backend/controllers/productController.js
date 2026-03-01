const Product = require('../models/Product');

//fetch all products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: Could not fetch products' });
    }
};

//create new product
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
            description
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: Could not create product', error: error.message });
    }
};

module.exports = {
    getProducts,
    createProduct
};