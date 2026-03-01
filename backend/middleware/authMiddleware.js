const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    //authorization header + Bearer prefix check
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            //auth header se token lena
            token = req.headers.authorization.split(' ')[1];

            //verifying the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            //ID se user nikalke aur request me set kara
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };