const User = require('../models/User');

//registering new student
const registerUser = async (req, res) => {
    res.status(200).json({ message: 'Register User Route' });
};

//Login user & getting token
const loginUser = async (req, res) => {
    res.status(200).json({ message: 'Login User Route' });
};

module.exports = {
    registerUser,
    loginUser
};