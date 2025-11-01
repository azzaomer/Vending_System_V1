// P-1.1.3: Model for interacting with the 'transactions' table
const db = require('../config/db'); // Knex instance

/**
 * Finds a single transaction by a specific column.
 * @param {string} column - The database column to search by (e..g, 'transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object | undefined>} The transaction object if found.
 */
async function findBy(column, value) {
    try {
        // --- THIS IS THE FIX ---
        // Removed the .join('vend_requests', ...)
        // This query now *only* selects from the 'transactions' table.
        const transaction = await db('transactions')
            .where({ [column]: value }) // Dynamic column search
            .select('*') // Select all columns from 'transactions'
            .first(); // Get the first matching row

        return transaction;
    } catch (error) {
        console.error(`[MODEL] Error in findBy ${column}:`, error);
        throw error; // Re-throw the error to be caught by the service/controller
    }
}

// Add other functions (like 'create') as needed
module.exports = {
    findBy,
};

