// P2.4: Inquiry Controller - Handles non-vending API routes like SEARCH, BALANCE, GETTRANS

const express = require('express');
const router = express.Router();

// Repository Layer Import (P1.1.D)
const transactionRepo = require('../repositories/transaction.repository');

// Protocol Service Import (P1.4 - might be needed for BALANCE/GETTRANS later)
const protocolService = require('../services/protocol.service'); 
const transactionService = require('../services/transaction.service');

/**
 * Handles the GET /search request to find a transaction.
 * Expects query parameters: 'id' (the transID or meterNum) and 'type' ('transID' or 'meterNum').
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */


async function searchTransaction(req, res) {
    const { id: queryValue, type: queryKey } = req.query;

    if (!queryValue || !queryKey) {
        return res.status(400).json({ success: false, message: "Query parameters 'id' and 'type' are required." });
    }

    let dbColumn;
    if (queryKey === 'transID') {
        dbColumn = 'trans_id';
    } else if (queryKey === 'reqID') {
        dbColumn = 'vend_request_id';
    } else {
        return res.status(400).json({ success: false, message: "Invalid query 'type'. Must be 'transID' or 'reqID'." });
    }

    try {
        console.log(`[ROUTE] Searching for transaction where ${dbColumn} = ${queryValue}`);
        // Service/Model joins tables and returns one combined object
        const transaction = await transactionService.findTransactionBy(dbColumn, queryValue);

        if (!transaction) {
            return res.status(404).json({ success: false, message: `Transaction not found for ${queryKey}: ${queryValue}.` });
        }

        // --- THIS IS THE FIX ---
        // Instead of manually building an object, we just send the
        // entire 'transaction' object returned from the database query.
        // This guarantees all fields (from both tables) are included.
        return res.status(200).json({
            success: true,
            message: `Transaction found for ${queryKey}: ${queryValue}.`,
            transaction: transaction 
        });

    } catch (error) {
        console.error(`[CONTROLLER] Error in searchTransaction:`, error);
        // Use 500 for Internal Server Error
        return res.status(500).json({ success: false, message: 'Internal server error.' });
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
    console.log(`[CONTROLLER] Processing checkBalance request...`);
    try {
        // Mock flag is passed from controller to service
        const SHOULD_MOCK_HUB = req.body.useMock || false;

        // Call protocol service for BALANCE action. No params needed.
        const hubResponse = await protocolService.sendRequest('BALANCE', {}, SHOULD_MOCK_HUB);

        // Check the state from the hub response
        if (hubResponse && hubResponse.state === '0') {
            // Success
            return res.status(200).json({
                success: true,
                message: 'Balance check successful.',
                balance: hubResponse.balance,
                username: hubResponse.username
            });
        } else {
            // Hub returned an error
            return res.status(400).json({
                success: false,
                message: hubResponse.message || 'Balance check failed.',
                hubState: hubResponse.state
            });
        }

    } catch (error) {
        console.error(`[CONTROLLER] Critical error in checkBalance:`, error);
        return res.status(500).json({ success: false, message: error.message || 'Internal server error.' });
    }
}


/*----------------------------------------------------------------------------------------------*/
/**
async function getLastTransactions(req, res) {
    // F-1.1.5: Logic for GETTRANS action will go here
    // This will likely involve calling protocolService.sendRequest('GETTRANS', ...)
     const { meterNum } = req.query;
     if (!meterNum) {
         return res.status(400).json({ success: false, message: "Query parameter 'meterNum' is required." });
     }
    console.log(`[ROUTE] Processing GETTRANS request for Meter: ${meterNum}`);
    return res.status(501).json({ success: false, message: 'GETTRANS endpoint not implemented yet.' });
    
    return res.status(200).json({
        success: true,
        message: `Transaction found for ${queryKey}: ${queryValue}.`,
        transaction: {
            vend_request_id: transaction.vend_request_id,
            transaction_id: transaction.transaction_id,
            item_id: transaction.item_id,
            item_price: transaction.item_price,
            status: transaction.status,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            hubResponseDetails: transaction.hub_response_details,
        }
    });

}
*/


/**
 * F-1.1.4: Search for a single transaction by its ID (transID) or vend request ID (reqID).
 * This controller handles the API request, validates the query parameters,
 * calls the service layer to find the transaction, and returns it.
 */
/*
 async function getLastTransactions(req, res) {
    // 1. Get query parameters
    const { id, type } = req.query;

    // 2. Validate parameters
    if (!id || !type) {
        return res.status(400).json({ success: false, message: "Query parameters 'id' and 'type' are required." });
    }

    let queryColumn;
    let queryKey;
    if (type === 'transID') {
        queryColumn = 'transaction_id';
        queryKey = 'transID';
    } else if (type === 'reqID') {
        queryColumn = 'vend_request_id';
        queryKey = 'reqID';
    } else {
        return res.status(400).json({ success: false, message: "Invalid 'type'. Must be 'transID' or 'reqID'." });
    }
    const queryValue = id;
    console.log(`[ROUTE] Processing search for ${queryKey}: ${queryValue}`);

    try {
        // 3. Call service layer
        const transaction = await transactionService.findTransactionBy(queryColumn, queryValue);

        // 4. Handle response
        if (!transaction) {
            return res.status(404).json({ success: false, message: `No transaction found for ${queryKey}: ${queryValue}.` });
        }

        // 5. Return successful response
        // We explicitly DO NOT return the `id` (primary key) or `raw_protocol_response`.
        return res.status(200).json({
            success: true,
            message: `Transaction found for ${queryKey}: ${queryValue}.`,
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
        console.error('Error in searchTransaction controller:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during transaction search.' });
    }
}

// --- Register Controller Routes ---
router.get('/search', searchTransaction);
router.get('/balance', checkBalance); // Placeholder
router.get('/last-transactions', getLastTransactions); // Placeholder using /last-transactions for clarity

module.exports = router; // Export the router for server.js to use
*/

/*----------------------------------------------------------------------------------------------*/

/**
 * F-1.1.5: Get the last N transactions for a specific meter from the protocol hub.
 * This controller will call the protocolService to send a 'GETTRANS' request.
 */
async function getLastTransactions(req, res) {
    // F-1.1.5: Logic for GETTRANS action will go here
    // This will likely involve calling protocolService.sendRequest('GETTRANS', ...)
    const { meterNum } = req.query;
    if (!meterNum) {
        return res.status(400).json({ success: false, message: "Query parameter 'meterNum' is required." });
    }

    console.log(`[ROUTE] Processing GETTRANS request for Meter: ${meterNum}`);
    
    // Placeholder response - this is the intended response for now
    return res.status(501).json({ success: false, message: 'GETTRANS endpoint not implemented yet.' });
}

// --- Register Controller Routes ---
/* Updated
router.get('/search', searchTransaction);
router.get('/balance', checkBalance); // Placeholder
router.get('/last-transactions', getLastTransactions); // Placeholder using /last-transactions for clarity

module.exports = router; // Export the router for server.js to use
*/

// --- EXPORT THE FUNCTIONS ---
// This makes the functions available for the router to use.
// We are exporting an object containing our functions.
module.exports = {
    searchTransaction,
    getLastTransactions,
    checkBalance // Added this to match the router
};


