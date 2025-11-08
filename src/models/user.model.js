// This new file handles database queries for the 'users' table
const db = require('../config/db');

const TABLE_NAME = 'users';

/**
 * Finds a single user by their username.
 * @param {string} username - The user's username.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
async function findByUsername(username) {
    try {
        const user = await db(TABLE_NAME)
            .where({ username: username })
            .select('*')
            .first();
        return user || null;
    } catch (error) {
        console.error(`[MODEL] Error in findByUsername:`, error);
        throw error;
    }
}

module.exports = {
    findByUsername
};
