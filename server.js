/**
 * Application Entry Point (P2.1 Setup)
 * * Sets up environment variables, initializes the Express server, and mounts the controllers.
 * * NOTE: Requires 'dotenv', 'express'.
 * Install: npm install dotenv express
 */

// 1. Load Environment Variables IMMEDIATELY
require('dotenv').config();

const express = require('express');
const vendingController = require('./src/controllers/vending.controller');

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
// Standard Express middleware for JSON body parsing
app.use(express.json());

// --- Simple Health Check Route ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'TP-Vending Gateway is running.',
        api_version: '1.0'
    });
});

// --- Controller Mounting (P2.1) ---
// All vending and transaction-related routes start here
app.use('/api/v1/vending', vendingController);


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Simple 500 handler for unhandled errors
    res.status(500).json({
        error: 'Internal Server Error',
        details: 'An unexpected error occurred in the gateway.'
    });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
    console.log(`Access health check at: http://localhost:${PORT}/`);
    console.log(`Vending API ready at: http://localhost:${PORT}/api/v1/vending/`);
});

// NOTE: Before running, ensure you create a '.env' file 
// with your DB and Hub credentials!

