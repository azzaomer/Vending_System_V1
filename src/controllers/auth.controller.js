// P-1.1.4: Controller for handling authentication
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * --- NEW GUARD CLAUSE ---
 * Check for the JWT_SECRET at server start.
 * This provides a clear error if the .env file is missing.
 */
if (!process.env.JWT_SECRET) {
    console.error('[FATAL ERROR] JWT_SECRET is not defined in your .env file.');
    console.error('Please add JWT_SECRET=your_super_secret_key to the .env file and restart the server.');
    process.exit(1); // Stop the server if the secret is missing
}
// --- END GUARD CLAUSE ---


/**
 * Handles user login.
 * @param {object} req - Express request object. Body contains { username, password }.
 * @param {object} res - Express response object.
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // 1. Find user by username
        const user = await User.findByUsername(username);
        if (!user) {
            console.log(`[AUTH] Login failed: User '${username}' not found.`);
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // 2. Compare password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log(`[AUTH] Login failed: Invalid password for user '${username}'.`);
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Create JWT payload
        const payload = {
            userId: user.id,
            username: user.username
        };

        // 4. Sign the token
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // This is now guaranteed to exist
            { expiresIn: '1d' } // Token expires in 1 day
        );

        // 5. Send successful response
        console.log(`[AUTH] Login successful for user '${username}'.`);
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            username: user.username
        });

    } catch (error) {
        console.error('[CONTROLLER] Error in login:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

module.exports = {
    login
};
