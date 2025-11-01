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

module.exports = {
    findTransactionBy,
};
