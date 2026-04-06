const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);

// Makes the 'uploads' folder publicly accessible
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Health check
app.get('/', (req, res) => {
    res.send('peer2peer API is running...');
});

module.exports = app;
