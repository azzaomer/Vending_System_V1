// --- Main Application Entry Point ---
// Sets up Express, middleware, routes, and starts the server.

// Core dependencies
const express = require('express');
require('dotenv').config(); // Load environment variables from .env file

// --- NEW: Import Knex DB Config ---
// We now use the Knex config file, NOT db_client.js
const db = require('./src/config/db'); 

// --- NEW: Import ROUTE Files ---
// We import the ROUTERS, not the controllers
const vendingRoutes = require('./src/routes/vending.routes.js');
const inquiryRoutes = require('./src/routes/inquiry.routes.js');

// --- Application Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration MUST be first
app.use(express.json()); // Essential for parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For form data if needed

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path} | Body Size: ${req.get('Content-Length') || 0} bytes`);
    next();
});


// --- API Routes ---
const API_PREFIX = '/api/v1';

// --- NEW: Mount ROUTE Files ---
// Use the route variables we imported above.
// Express will now correctly send requests to your router files.
app.use(`${API_PREFIX}/vending`, vendingRoutes);
app.use(`${API_PREFIX}/inquiry`, inquiryRoutes);


// --- Health Check Route ---
app.get('/', (req, res) => {
    res.status(200).send('Vending Gateway API is running.');
});

// --- Global Error Handler (Basic) ---
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]', err.stack);
    res.status(500).send('Something broke!');
});


// --- Server Startup ---
const startServer = async () => {
    try {
        // --- NEW: Verify Knex DB connection ---
        // Use the db object from './src/config/db.js'
        console.log('[DB] Attempting database connection test with Knex...');
        await db.raw('SELECT 1'); // Simple command to verify connection
        console.log('[DB] Database connection confirmed.');
        
        // --- Start Listening ---
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`Access health check at: http://localhost:${PORT}/`);
            console.log(`Vending API ready at: http://localhost:${PORT}${API_PREFIX}/vending/`);
            console.log(`Inquiry API ready at: http://localhost:${PORT}${API_PREFIX}/inquiry/`); 
        });

    } catch (dbError) {
        console.error('[FATAL] Could not connect to database on startup. Exiting.', dbError);
        process.exit(1); // Exit if DB connection fails
    }
};

startServer(); // Start the application
