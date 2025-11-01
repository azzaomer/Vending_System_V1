const db = require('../config/db'); // Our Knex database connection

/**
 * F-1.1.4: Model to find a single transaction by a specific column.
 * This function directly interacts with the database.
 * It now JOINS with vend_requests to get all related data.
 * @param {string} column - The database column to search (e.g., 'transactions.transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object|null>} The transaction object from the database or null.
 */
async function findBy(column, value) {
    try {
        // This is the database query.
        // It joins 'transactions' with 'vend_requests'
        // on the vend_request_id.
        const transaction = await db('transactions')
            // Join vend_requests table where transactions.vend_request_id = vend_requests.id
            // (Assuming 'id' is the primary key of 'vend_requests')
            .join('vend_requests', 'transactions.vend_request_id', 'vend_requests.id')
            // Search on the specified column *in the transactions table*
            .where(`transactions.${column}`, value)
            // Select all columns from both tables
            .select('transactions.*', 'vend_requests.*')
            // Get the first result
            .first();
        
        // Return the combined transaction/request object (or undefined)
        return transaction;
    } catch (error) {
        console.error('Error in Transaction.findBy model:', error);
        throw error; // Propagate the error up to the service
    }
}

module.exports = {
    findBy,
};
