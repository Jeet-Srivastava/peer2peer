const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
