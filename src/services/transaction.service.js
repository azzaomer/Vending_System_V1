const Transaction = require('../models/transaction.model');

// --- FIX: Map string statuses to integer values for the database ---
const STATUS_MAP = {
    '0': 1, // Hub Success
    'Pending': 0,
    'Success': 1,
    'Failed': 2,
    'default': 2 // Default to Failed
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
async function createVendTransaction(vendRequestId, meterNum, amount, userId) {
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
            // --- THIS IS THE UPDATE ---
            // The user_id from the token is now saved
            user_id: userId, 
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

async function updateTransactionWithHubResponse(vendRequestId, hubResponse) {
    try {
        // Find the final status from the hub's 'state' property
        const finalStatus = STATUS_MAP[hubResponse.state] || STATUS_MAP['default'];
        console.log(`[SERVICE] Updating transaction for ID: ${vendRequestId} with mapped status: ${finalStatus}`);

        // Check for the conditional extraToken (Key Change Token)
        let extraToken = null;
        if (hubResponse.extraToken) {
            extraToken = hubResponse.extraToken;
            console.log(`[SERVICE] Found extraToken: ${extraToken}`);
        }

        const updateData = {
            hub_state: finalStatus,
            hub_error_code: hubResponse.state === '0' ? null : hubResponse.state, // Store error code if not success
            response_xml: hubResponse.rawResponse, // Storing raw response
            token_received: hubResponse.token,
            response_timestamp: new Date(),
            invoice_num: hubResponse.invoice,
            extra_token: extraToken // Fixed typo
        };

        // Calls the model's 'updateByVendId' function
        const updatedTransaction = await Transaction.updateByVendId(vendRequestId, updateData);
        return updatedTransaction;
    } catch (error) {
        console.error('[SERVICE] Error in updateTransactionWithHubResponse:', error);
        throw error;
    }
}



// Export all the functions for the controllers to use
module.exports = {
    findTransactionBy,
    createVendTransaction,
    updateTransactionWithHubResponse
};
