/**
 * Vending Gateway Application Server Entry Point (P2.1)
 * * Initializes Express, middleware, and maps all controllers/routes.
 */
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { initializeDB } = require('./src/db_client'); // Assuming db_client exports initializeDB

// Import the correct controller module that exports functions (from your Canvas)
const vendingController = require('./src/controllers/vending.controller');

const inquiryController = require('./src/controllers/inquiry.controller'); // <-- ADDED: Import Inquiry Controller


/*
// Placeholder imports for other controllers (P2.4)
const inquiryController = { 
    searchTransaction: (req, res) => res.status(501).json({ message: 'Search not implemented yet.' }),
    checkBalance: (req, res) => res.status(501).json({ message: 'Balance not implemented yet.' }),
    getHubTransaction: (req, res) => res.status(501).json({ message: 'GetTrans not implemented yet.' })
};
*/

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api/v1/vending';


// --- Middleware ---

// CRITICAL FIX: Ensure body parsing middleware runs BEFORE all routes
// This fixes the previous 'Unexpected end of JSON input' error
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: Basic logging middleware
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} | Body Size: ${req.body ? JSON.stringify(req.body).length : 0} bytes`);
    next();
});

// --- API Routes (P2.1 & P2.4) ---

// Vending Routes (P2.1)
// POST /api/v1/vending/purchase (This is the route that was missing)
app.post(`${API_PREFIX}/purchase`, vendingController.purchaseVending);

// Mount Inquiry Controller routes <-- ADDED: Mount Inquiry Routes
app.use(`${API_PREFIX}/inquiry`, inquiryController);

/*
// Inquiry Routes (P2.4 Placeholders)
// GET /api/v1/vending/search/:identifier
app.get(`${API_PREFIX}/search/:identifier`, inquiryController.searchTransaction); 

// GET /api/v1/vending/balance/:meterNum
app.get(`${API_PREFIX}/balance/:meterNum`, inquiryController.checkBalance);

// GET /api/v1/vending/gettrans/:invoiceNum
app.get(`${API_PREFIX}/gettrans/:invoiceNum`, inquiryController.getHubTransaction);
*/

// --- Server Startup ---

// Use a simplified initializeDB function call (assuming it's available in db_client)
// NOTE: Since your db_client.js does not export an initializeDB function, 
// we will just start the server for now. In a real app, DB init would go here.

app.listen(PORT, () => {
    console.log(`Vending API Ready | Server listening on port ${PORT}`);
    console.log(`Attempting POST on: http://localhost:${PORT}${API_PREFIX}/purchase`);

console.log(`Vending API ready at: http://localhost:${PORT}${API_PREFIX}/vending/`);
            console.log(`Inquiry API ready at: http://localhost:${PORT}${API_PREFIX}/inquiry/`); // <-- ADDED: Log Inquiry API path
});

