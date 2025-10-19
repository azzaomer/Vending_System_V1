/**
 * P1.3: MD5 Security Service
 * * Implements NF-2.1.2: Provides MD5 hashing functions for secure request authentication.
 * * This service handles the critical triple-hashing of the user password and 
 * the final request signature generation.
 */

const crypto = require('crypto');

// --- Hashing Functions ---

/**
 * Generates an MD5 hash of the given input string.
 * @param {string} inputString The string to hash.
 * @returns {string} The MD5 hash in lowercase hex format.
 */
const hashMD5 = (inputString) => {
    // Ensure the input is treated as a string
    if (typeof inputString !== 'string') {
        inputString = String(inputString);
    }
    return crypto.createHash('md5').update(inputString).digest('hex');
};

/**
 * Implements the protocol-specific triple-hashing of the user password (NF-2.1.2).
 * Hashed Password = MD5(MD5(MD5(rawPassword)))
 * @param {string} rawPassword The plain text user password (userPass).
 * @returns {string} The triple-hashed password string.
 */
const generateHashedPassword = (rawPassword) => {
    // Hash 1
    const h1 = hashMD5(rawPassword); 
    // Hash 2
    const h2 = hashMD5(h1);
    // Hash 3 (Final Hashed Password)
    const h3 = hashMD5(h2);
    return h3;
};

// --- Signature Generation ---

/**
 * Generates the request signature using the required combination of fields.
 * Signature = MD5(transID + meterNum + HashedPassword)
 * @param {string} transID The unique transaction ID (F-1.1.1).
 * @param {string} meterNum The meter number involved.
 * @param {string} hashedPassword The triple-hashed password string.
 * @returns {string} The final request signature.
 */
const generateSignature = (transID, meterNum, hashedPassword) => {
    // Concatenate the required fields (no separators needed)
    const signatureInput = `${transID}${meterNum}${hashedPassword}`;
    
    // Hash the concatenated string
    return hashMD5(signatureInput);
};


module.exports = {
    hashMD5,
    generateHashedPassword,
    generateSignature
};
