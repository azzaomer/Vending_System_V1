// P-1.1.3: Model for interacting with the 'transactions' table
const db = require('../config/db'); // Knex instance
const TABLE_NAME = 'transactions';

/**
 * Finds a single transaction by a specific column.
 * @param {string} column - The database column to search by (e..g, 'transaction_id').
 * @param {string} value - The value to search for.
 * @returns {Promise<object | undefined>} The transaction object if found.
 */
async function findBy(column, value) {
    try {
        // This query now *only* selects from the 'transactions' table.
        console.log(`[MODEL] Finding in ${TABLE_NAME} where ${column} = ${value}`);
        const transaction = await db(TABLE_NAME)
            .where({ [column]: value }) // Dynamic column search
            .select('*') // Select all columns from 'transactions'
            .first(); // Get the first matching row

        return transaction || null;
    } catch (error) {
        console.error(`[MODEL] Error in findBy ${column}:`, error);
        throw error; // Re-throw the error to be caught by the service/controller
    }
}

/**
 * --- NEW FUNCTION ---
 * Creates a new transaction record in the database.
 * @param {object} transactionData - The data for the new transaction.
 * @returns {Promise<object>} The newly created transaction object (with its ID).
 */
async function create(transactionData) {
    try {
        console.log(`[MODEL] Creating new transaction...`);
        // Knex 'insert' returns an array of the inserted IDs.
        const [insertedId] = await db(TABLE_NAME)
            .insert(transactionData);
        
        console.log(`[MODEL] Transaction created with auto-increment ID: ${insertedId}`);
        
        // --- FIX: Find the new record by its auto-increment 'id', not 'trans_id' ---
        return await findBy('id', insertedId);

    } catch (error) {
        console.error(`[MODEL] Error in create:`, error);
        throw error;
    }
}

/**
 * --- NEW FUNCTION ---
 * Updates a transaction record based on its vend_request_id.
 * @param {string} vendRequestId - The unique vend_request_id to find.
 * @param {object} updateData - An object containing the fields to update.
 * @returns {Promise<object>} The updated transaction object.
 */
async function updateByVendId(vendRequestId, updateData) {
    try {
        console.log(`[MODEL] Updating transaction for trans_id: ${vendRequestId}`);
        
        const count = await db(TABLE_NAME)
            .where({ trans_id: vendRequestId })
            .update(updateData);

        if (count === 0) {
            throw new Error(`No transaction found with trans_id: ${vendRequestId} to update.`);
        }
        
        console.log(`[MODEL] Transaction updated for vend_request_id: ${vendRequestId}`);
        // Return the updated object
        return await findBy('trans_id', vendRequestId);

    } catch (error)
    {
        console.error(`[MODEL] Error in updateByVendId:`, error);
        throw error;
    }
}


// Export all the functions for the service layer
module.exports = {
    findBy,
    create, // <-- Now exporting the create function
    updateByVendId // <-- Now exporting the update function
};
