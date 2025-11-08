// This new file handles the logic for logging in
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-32-chars';

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        // 1. Find the user in the database
        const user = await userModel.findByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 2. Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Passwords match! Create a JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1d' } // Token lasts for 1 day
        );

        // 4. Send the token back to the client
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            username: user.username
        });

    } catch (error) {
        console.error(`[CONTROLLER] Error in login:`, error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

module.exports = {
    login
};
