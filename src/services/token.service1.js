/**
 * P2.5: Token Processing Service
 * * Implements compliance logic to detect and structure complex token strings (F-1.3.2, F-1.3.4).
 * * Parses concatenated tokens (e.g., Key Change + Credit) into a clean, structured array
 * for the Front-End to display in the required order (F-1.3.5, P3.2).
 */

// Constants for token processing
const STANDARD_TOKEN_LENGTH = 20; // Example: Standard 20-digit STS token
const KEY_CHANGE_TOKEN_LENGTH = 40; // Example: Key Change is two 20-digit tokens concatenated
const DUAL_CREDIT_TOKEN_LENGTH = 40; // Example: Two credit tokens concatenated (Protocol F-1.3.4)

/**
 * Parses a raw token string from the Hub into a structured array of tokens.
 * This handles the critical separation of Key Change (KeyA/KeyB) and Dual Credit tokens.
 * @param {string} rawToken - The token string received from the Hub.
 * @returns {Array<object>} An array of structured token objects ready for display.
 */
const processTokenString = (rawToken) => {
    if (!rawToken || typeof rawToken !== 'string') {
        return [];
    }
    
    // Normalize and clean up the token (remove spaces/dashes if any exist)
    const cleanedToken = rawToken.replace(/[^0-9]/g, '');
    const length = cleanedToken.length;

    const tokens = [];

    if (length === STANDARD_TOKEN_LENGTH) {
        // Case 1: Standard Single Credit Token (e.g., 20 digits)
        tokens.push({
            type: 'Credit',
            value: cleanedToken,
            label: 'Credit Token',
            sequence: 1
        });
    } else if (length === KEY_CHANGE_TOKEN_LENGTH) {
        // Case 2: Key Change Tokens (often 40 digits, split into KeyA and KeyB)
        // Protocol requires Key Change tokens to be displayed FIRST (F-1.3.3)
        const keyA = cleanedToken.substring(0, STANDARD_TOKEN_LENGTH);
        const keyB = cleanedToken.substring(STANDARD_TOKEN_LENGTH);

        tokens.push({
            type: 'KeyChange',
            value: keyA,
            label: 'Key Change Token (Key A)',
            sequence: 1 // Important for P3.2 order compliance
        });
        tokens.push({
            type: 'KeyChange',
            value: keyB,
            label: 'Key Change Token (Key B)',
            sequence: 2
        });
    } else if (length === DUAL_CREDIT_TOKEN_LENGTH) {
        // Case 3: Dual Credit Tokens (F-1.3.4) - e.g., a bonus token + a standard token
        const credit1 = cleanedToken.substring(0, STANDARD_TOKEN_LENGTH);
        const credit2 = cleanedToken.substring(STANDARD_TOKEN_LENGTH);

        tokens.push({
            type: 'Credit',
            value: credit1,
            label: 'Credit Token 1',
            sequence: 1
        });
        tokens.push({
            type: 'Credit',
            value: credit2,
            label: 'Credit Token 2 (Bonus/Split)',
            sequence: 2
        });
    } else {
        // Case 4: Unexpected or unknown token format
        tokens.push({
            type: 'Unknown',
            value: rawToken,
            label: `Token (Length: ${length})`,
            sequence: 1
        });
    }

    return tokens;
};

module.exports = {
    processTokenString
};

