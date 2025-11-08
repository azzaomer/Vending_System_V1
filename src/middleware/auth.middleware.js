// This new file is a "gatekeeper" that protects your routes
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-32-chars';

function authMiddleware(req, res, next) {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Extract the token (e.g., "Bearer <token>" -> "<token>")
    const token = authHeader.split(' ')[1];

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Add the user's data to the request object
        // Now all your controllers can access req.user
        req.user = decoded; 

        next(); // Token is valid, proceed to the next middleware/controller
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
}

module.exports = authMiddleware;
