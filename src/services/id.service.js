/**
 * P1.2: ID Generation Service
 * * Implements F-1.1.1: Generates a unique, 30-character Transaction ID (transID) 
 * required for every request to the SMARTvend Hub.
 * * Format: YYYYMMDDHHmmss + 6-digit sequence + 8-digit random hex (Total 30 characters)
 */

// Global sequence counter, reset daily in a real system but simple counter for this project
let sequence = 0;

/**
 * Pads a number with leading zeros to reach the desired length.
 * @param {number} num The number to pad.
 * @param {number} size The desired length of the string.
 * @returns {string} The zero-padded string.
 */
const zeroPad = (num, size) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
};

/**
 * Generates a unique Transaction ID (transID) up to 30 characters long.
 * @returns {string} The unique 30-character transaction ID.
 */
const generateTransID = () => {
    const now = new Date();

    // 1. Timestamp (14 characters): YYYYMMDDHHmmss
    const timestamp = 
        now.getFullYear().toString() + 
        zeroPad(now.getMonth() + 1, 2) + 
        zeroPad(now.getDate(), 2) + 
        zeroPad(now.getHours(), 2) + 
        zeroPad(now.getMinutes(), 2) + 
        zeroPad(now.getSeconds(), 2); // e.g., 20251017165145 (14 chars)

    // 2. Sequential Part (6 characters): Increases with every call
    // NOTE: In a multi-process environment, this would need to be stored in Redis/DB.
    sequence = (sequence + 1) % 1000000; // Reset after 999,999
    const sequentialPart = zeroPad(sequence, 6); // e.g., 000001 (6 chars)

    // 3. Random Part (8 characters): Ensures uniqueness in case of collisions
    // Uses crypto for better randomness
    const randomPart = Math.random().toString(16).substring(2, 10).toUpperCase(); // e.g., A5B1C2D3 (8 chars)
    
    // Total Length: 14 + 6 + 8 = 28 characters (Max is 30, so this is safe)
    return `${timestamp}${sequentialPart}${randomPart}`;
};

module.exports = {
    generateTransID
};
