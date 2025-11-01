const Transaction = require('../models/transaction.model');

/**
 * F-1.1.4: Service layer to find a transaction by a specific column.
 * This function calls the model to interact with the database.
 * @param {string} column - The database column to search (e.g., 'transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object|null>} The transaction object or null if not found.
 */
async function findTransactionBy(column, value) {
    try {
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
async function createVendTransaction(vendRequestId, meterNum, itemId, amount) {
    try {
        console.log(`[SERVICE] Creating vend transaction for ID: ${vendRequestId}`);
        
        // This data object will be inserted into the database
        const newTransactionData = {
            vend_request_id: vendRequestId,
            meter_num: meterNum,
            item_id: itemId,
            item_price: amount,
            status: 'Pending', // Initial status
            created_at: new Date(),
            updated_at: new Date()
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
async function updateTransactionWithHubResponse(vendRequestId, status, errorCode, details, token) {
    try {
        console.log(`[SERVICE] Updating transaction for ID: ${vendRequestId} with status: ${status}`);
        
        const updateData = {
            status: status,
            hub_error_code: errorCode,
            hub_response_details: details,
            token_received: token,
            updated_at: new Date()
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
