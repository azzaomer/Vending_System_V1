// --- Main Application Entry Point ---
// Sets up Express, middleware, routes, and starts the server.

// Core dependencies
const express = require('express');
require('dotenv').config(); // Load environment variables from .env file

// Utility Imports
const dbClient = require('./src/db_client'); // For initial DB check

// Controller Imports
const vendingController = require('./src/controllers/vending.controller');
const inquiryController = require('./src/controllers/inquiry.controller'); 

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

// Mount Vending Controller routes
app.use(`${API_PREFIX}/vending`, vendingController.router);

// Mount Inquiry Controller routes 
app.use(`${API_PREFIX}/inquiry`, inquiryController);

// P2.4: Register Inquiry Routes (e.g., /api/v1/inquiry/search)
app.use(`${API_PREFIX}/inquiry`, inquiryController); // <-- NEWLY ADDED


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
        // P1.1: Verify DB connection on startup by getting and releasing a connection
        console.log('[DB] Attempting database connection test...');
        const connection = await dbClient.getConnection(); 
        await connection.ping(); // Simple command to verify connection
        connection.release();   // Always release the connection
        console.log('[DB] Database connection confirmed.'); // Log success *after* release
        
        console.log("Vending API Ready | Server listening on port " + PORT);

        // --- Start Listening ---
        app.listen(PORT, () => {
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


