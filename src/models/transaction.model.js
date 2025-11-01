const db = require('../config/db'); // Our Knex database connection

/**
 * F-1.1.4: Model to find a single transaction by a specific column.
 * This function directly interacts with the database.
 * @param {string} column - The database column to search (e.g., 'transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object|null>} The transaction object from the database or null.
 */
async function findBy(column, value) {
    try {
        // This is the database query.
        // It selects all columns (*) from 'transactions' where the
        // specified column matches the value.
        // .first() ensures we only get one result, or undefined if not found.
        const transaction = await db('transactions')
            .where(column, value)
            .first();
        
        // Return the transaction (or undefined if not found)
        return transaction;
    } catch (error) {
        console.error('Error in Transaction.findBy model:', error);
        throw error; // Propagate the error up to the service
    }
}

module.exports = {
    findBy,
};

