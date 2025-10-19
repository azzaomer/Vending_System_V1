// P1.3: MD5 Hashing Library (NF-2.1.2)
const crypto = require('crypto');

// Configuration for TP Credentials (NF-2.1.3)
// NOTE: These MUST be read from environment variables or a secure vault,
// NEVER hardcoded in production code.
const USERNAME = process.env.TP_USERNAME || 'YOUR_TP_USERNAME';
const SECRET_KEY = process.env.TP_SECRET_KEY || 'YOUR_SECRET_KEY';
const SECRET_KEY_HASHED = crypto.createHash('md5').update(SECRET_KEY).digest('hex');


/**
 * Generates the MD5 hash for a given string.
 * @param {string} data - The string to be hashed.
 * @returns {string} 32-character MD5 hash (hex format).
 */
function hashMD5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Calculates the proprietary triple-hashed userPass for XML request.
 * Formula (based on protocol interpretation): MD5(USERNAME + SECRET_KEY + SECRET_KEY)
 * @returns {string} The calculated userPass hash.
 */
function calculateUserPassHash() {
    // Protocol requires the username to be upper case in the hash calculation.
    const input = USERNAME.toUpperCase() + SECRET_KEY + SECRET_KEY;
    
    // NF-2.1.2: MD5 hashing
    return hashMD5(input);
}

/**
 * Calculates the verifyCode (data integrity hash) for the XML request.
 * Formula: MD5(USERNAME + HASHED_SECRET_KEY + transID + meterNum + calcMode + amount)
 * @param {object} params - Core transaction parameters.
 * @returns {string} The calculated verifyCode hash.
 */
function calculateVerifyCode(params) {
    const { transID, meterNum, calcMode, amount } = params;

    // Build the string sequence based on the protocol requirements
    const input = USERNAME.toUpperCase() +
                  SECRET_KEY_HASHED + // NOTE: Uses the pre-hashed key here
                  transID +
                  meterNum +
                  calcMode +
                  String(amount); // Ensure amount is treated as a string for concatenation

    // NF-2.1.2: MD5 hashing
    return hashMD5(input);
}

module.exports = {
    hashMD5,
    calculateUserPassHash,
    calculateVerifyCode
};

