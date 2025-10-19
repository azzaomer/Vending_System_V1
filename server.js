/**
 * Vending Gateway Application Entry Point (P1.1.S1)
 * This file sets up the Express server, connects the database, and defines the API routes.
 */
require('dotenv').config(); // Load environment variables first (NF-2.1.3)

const express = require('express');
const { logRequest } = require('./src/db_client'); // For connection check
const { vendSingleStep } = require('./src/services/protocol.service'); // P2.2 Logic

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = '/api/v1/vending';


// --- Express Middleware Setup ---
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


// --- API Routes ---

/**
 * Health Check Route
 */
app.get('/', (req, res) => {
    res.send('Vending Gateway is Operational.');
});

/**
 * P2.2: Single-Step Vending Endpoint
 * Route: /api/v1/vending/purchase-single
 */
app.post(`${API_BASE}/purchase-single`, async (req, res) => {
    const { meterNum, amount } = req.body;
    
    // Minimal input validation
    if (!meterNum || !amount) {
        return res.status(400).json({ status: "ERROR", message: "Missing meterNum or amount in request." });
    }

    try {
        console.log(`[ROUTE] Processing single-step purchase for Meter: ${meterNum}, Amount: ${amount}`);
        
        // P2.2: Execute core vending logic
        const transactionResult = await vendSingleStep(meterNum, amount);

        // NF-2.2.1: Audit Logging (The logging is handled internally by protocol.service 
        // after it receives a response, but we ensure it runs.)
        
        // Extract required data for the client response
        const hubResponse = transactionResult.parsedData;
        const state = parseInt(hubResponse.$.state, 10);
        
        // The Hub always returns an XML structure; we convert it to clean JSON for the client.
        const responseJson = {
            status: state === 0 ? "SUCCESS" : "FAILURE",
            transId: transactionResult.transID,
            meterNum: meterNum,
            result: hubResponse.Property.reduce((acc, prop) => {
                acc[prop.$.name] = prop.$.value;
                return acc;
            }, {})
        };

        // If the hub communication was successful (state=0), send the clean response
        if (state === 0) {
            return res.status(200).json(responseJson);
        } else {
            // Handle specific protocol errors
            return res.status(500).json(responseJson);
        }

    } catch (error) {
        console.error(`[CRITICAL ERROR] Failed to complete transaction: ${error.message}`);
        return res.status(500).json({ status: "ERROR", message: "Server failed to process transaction.", detail: error.message });
    }
});


// --- Server Initialization ---
app.listen(PORT, async () => {
    console.log('Server running securely on port 3000');
    console.log(`Access health check at: http://localhost:${PORT}/`);
    console.log(`Vending API ready at: http://localhost:${PORT}${API_BASE}/`);

    // P1.1: Database connection check
    try {
        await logRequest({ 
            transId: '000000000000000000000000000000', 
            userId: 'SYSTEM', 
            meterNum: '00000000000', 
            actionRequested: 'CONNECT_TEST', 
            requestXml: '<Test/>' 
        });
        console.log('[DB] Database connection confirmed.');
    } catch (error) {
        console.error('[DB ERROR] Database connection failed:', error.message);
        // Do NOT crash the server if DB fails; allow it to run and log the error.
    }
});

