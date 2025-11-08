// P-1.1.4: Authentication Middleware
// This file acts as a "gatekeeper" for secure routes.

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    // 1. Get token from the 'Authorization' header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        // --- THIS IS THE FIX (Part 1) ---
        // Send the error AND return immediately.
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // 2. Check if it's a "Bearer" token
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        // --- THIS IS THE FIX (Part 2) ---
        return res.status(401).json({ success: false, message: 'Invalid token format. Expected "Bearer [token]".' });
    }

    const token = tokenParts[1];

    // 3. Verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach user info to the request object
        req.user = decoded; // This adds { userId, username, iat } to req
        
        // 5. Call the next middleware (the controller)
        next();
        
    } catch (ex) {
        // --- THIS IS THE FIX (Part 3) ---
        // Token is invalid or expired
        return res.status(400).json({ success: false, message: 'Invalid token.' });
    }
}

module.exports = authMiddleware;
