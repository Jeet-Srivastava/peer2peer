const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Electronics', 'Bicycles', 'Books', 'Furniture', 'Other']
    },
    condition: {
        type: String,
        required: true,
        enum: ['Like New', 'Good', 'Fair', 'Poor']
    },
    image: {
        type: String,
        required: true,
        default: '/images/sample.jpg' 
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;