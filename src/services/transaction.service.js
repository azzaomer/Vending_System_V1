const Transaction = require('../models/transaction.model');

// --- FIX: Map string statuses to integer values for the database ---
const STATUS_MAP = {
    'Pending': 0,
    'Success': 1,
    'Failed': 2
};

/**
 * F-1.1.4: Service layer to find a transaction by a specific column.
 * This function calls the model to interact with the database.
 * @param {string} column - The database column to search (e.g., 'transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object|null>} The transaction object or null if not found.
 */
async function findTransactionBy(column, value) {
    try {
        console.log(`[SERVICE] Finding transaction by ${column}`);
        // This calls the model's findBy function
        const transaction = await Transaction.findBy(column, value);
        return transaction;
    } catch (error) {
        console.error(`Error in transaction service while finding by ${column}:`, error);
        throw error; // Re-throw the error to be caught by the controller
    }
}

/**
 * Creates a new transaction record in an 'Pending' state.
 * @param {string} vendRequestId - The unique ID for this vend request.
 * @param {string} meterNum - The meter number.
 * @param {string} itemId - The item ID.
 * @param {number} amount - The purchase amount.
 * @returns {Promise<object>} The newly created transaction object.
 */
async function createVendTransaction(vendRequestId, meterNum, amount) {
    try {
        console.log(`[SERVICE] Creating vend transaction for ID: ${vendRequestId}`);
        
        // This data object will be inserted into the database
        const newTransactionData = {
            trans_id: vendRequestId,
            meter_num: meterNum,
            amount_requested: amount,
            hub_state: STATUS_MAP['Pending'],
            action_requested: 'VEND',
            request_timestamp: new Date(),
            user_id: 1,
            request_xml: ''
        };

        // Calls the model's 'create' function
        const newTransaction = await Transaction.create(newTransactionData);
        return newTransaction;
    } catch (error) {
        console.error('[SERVICE] Error in createVendTransaction:', error);
        throw error;
    }
}

/**
 * Updates an existing transaction with the response from the hub.
 * @param {string} vendRequestId - The ID of the transaction to update.
 * @param {string} status - The new status (e.g., 'Success', 'Failed').
 * @param {string} errorCode - The error code from the hub.
 * @param {string} details - The raw response details (XML/JSON).
 * @param {string|null} token - The vending token, if any.
 * @returns {Promise<object>} The updated transaction object.
 */

/*
async function updateTransactionWithHubResponse(vendRequestId, hubResponse) {
    try {
        console.log(`[SERVICE] Updating transaction for ID: ${vendRequestId} with status: ${status}`);

        // Check for the conditional extraToken (Key Change Token)
        let extraToken = null;
        if (hubResponse.extraToken) {
            extraToken = hubResponse.extraToken;
            console.log(`[SERVICE] Found extraToken: ${extraToken}`);
        }

        const updateData = {
            hub_state: STATUS_MAP[status] || STATUS_MAP['Failed'],
            hub_error_code: errorCode,
            response_xml: details, // Storing raw response
            token_received: token,
            response_timestamp: new Date(),
            troken_received: hubResponse.token,
            invoice_num: hubResponse.invoice,
            exta_token: extraToken 
        };

        // Calls the model's 'updateByVendId' function
        const updatedTransaction = await Transaction.updateByVendId(vendRequestId, updateData);
        return updatedTransaction;
    } catch (error) {
        console.error('[SERVICE] Error in updateTransactionWithHubResponse:', error);
        throw error;
    }
}*/


// Export all the functions for the controllers to use
module.exports = {
    findTransactionBy,
    createVendTransaction
};
