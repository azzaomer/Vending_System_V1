// P2.4: Inquiry Controller - Handles non-vending API routes like SEARCH, BALANCE, GETTRANS

const express = require('express');
const router = express.Router();

// Repository Layer Import (P1.1.D)
const transactionRepo = require('../repositories/transaction.repository');

// Protocol Service Import (P1.4 - might be needed for BALANCE/GETTRANS later)
const protocolService = require('../services/protocol.service'); 

/**
 * Handles the GET /search request to find a transaction.
 * Expects query parameters: 'id' (the transID or meterNum) and 'type' ('transID' or 'meterNum').
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function searchTransaction(req, res) {
    const { id, type } = req.query; // e.g., /search?id=12345&type=transID

    // --- Input Validation ---
    if (!id || !type || (type !== 'transID' && type !== 'meterNum')) {
        return res.status(400).json({
            success: false,
            message: "Invalid input. Query parameters 'id' and 'type' ('transID' or 'meterNum') are required."
        });
    }

    console.log(`[ROUTE] Processing search request for ${type}: ${id}`);

    try {
        // --- Call Repository Layer (P1.1.D, F-1.1.3) ---
        const transaction = await transactionRepo.findTransactionsByIdentifier(id, type);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: `Transaction not found for ${type}: ${id}.`
            });
        }

        // --- Success Response ---
        // Return the relevant details from the found transaction record
        // The 'response_data' field contains the parsed JSON from the Hub response
        return res.status(200).json({
            success: true,
            message: `Transaction found for ${type}: ${id}.`,
            transaction: {
                id: transaction.id,
                transId: transaction.trans_id,
                meterNum: transaction.meter_num,
                action: transaction.action_requested,
                requestTime: transaction.request_timestamp,
                responseTime: transaction.response_timestamp,
                hubState: transaction.hub_state,
                errorCode: transaction.hub_error_code,
                token: transaction.token_received,
                invoice: transaction.invoice_num,
                // Include the parsed response details if available
                hubResponseDetails: transaction.response_data ? (transaction.response_data.xml || transaction.response_data) : null 
            }
        });

    } catch (error) {
        // --- Critical Error Handling ---
        console.error(`[CONTROLLER ERROR] Search transaction failed for ${type} ${id}:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Server failed to process search request.',
            detail: error.message
        });
    }
}

// --- Placeholder Routes for other Inquiry actions ---

/*async function getBalance(req, res) {
    // F-1.1.4: Logic for BALANCE action will go here
    // This will likely involve calling protocolService.sendRequest('BALANCE', ...)
    console.log('[ROUTE] Processing BALANCE request...');
     return res.status(501).json({ success: false, message: 'BALANCE endpoint not implemented yet.' });
}*/


// --- NEWLY IMPLEMENTED: checkBalance ---

/**
 * Handles the GET /balance request (F-1.1.4).
 * This function communicates with the Hub to check the TP account balance.
 */
async function checkBalance(req, res) {
    console.log('[ROUTE] Processing balance request...');

    try {
        // 1. Build the simple XML request for BALANCE (using the new function from protocol.service)
        const xmlRequest = protocolService.buildBalanceRequest();

        // 2. Send request to the Hub (will use mock if SHOULD_MOCK_HUB is true)
        const hubResponse = await protocolService.sendRequest('BALANCE', xmlRequest);

        // 3. Check Hub response for state
        const hubState = parseInt(hubResponse.xml.$.state);
        if (hubState !== 0) {
            console.warn(`[ROUTE] Hub returned error for BALANCE check: State ${hubState}`);
            return res.status(502).json({
                success: false,
                message: `Hub returned an error state: ${hubState}`,
                errorCode: hubResponse.xml.$.code || 'UNKNOWN'
            });
        }

        // 4. Return successful balance
        const balance = parseFloat(hubResponse.xml.$.balance);
        console.log(`[ROUTE] Balance check successful. Balance: ${balance}`);
        res.status(200).json({
            success: true,
            username: hubResponse.xml.$.username,
            balance: balance
        });
    } catch (error) {
        // 5. Handle Critical Errors
        console.error(`[CONTROLLER ERROR] Balance check failed:`, error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server failed to process balance request.',
            detail: error.message 
        });
    }
}

async function getLastTransactions(req, res) {
    // F-1.1.5: Logic for GETTRANS action will go here
    // This will likely involve calling protocolService.sendRequest('GETTRANS', ...)
     const { meterNum } = req.query;
     if (!meterNum) {
         return res.status(400).json({ success: false, message: "Query parameter 'meterNum' is required." });
     }
    console.log(`[ROUTE] Processing GETTRANS request for Meter: ${meterNum}`);
    return res.status(501).json({ success: false, message: 'GETTRANS endpoint not implemented yet.' });
}


// --- Register Controller Routes ---
router.get('/search', searchTransaction);
router.get('/balance', checkBalance); // Placeholder
router.get('/last-transactions', getLastTransactions); // Placeholder using /last-transactions for clarity

module.exports = router; // Export the router for server.js to use


