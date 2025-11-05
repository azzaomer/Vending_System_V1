// P-1.1.1: Controller for handling vending-related requests
const protocolService = require('../services/protocol.service');
const transactionService = require('../services/transaction.service');
const { generateUniqueTransID } = require('../id_generator');

/**
 * F-1.1.1: Check available items.
 * Placeholder for the CHECKITEMS action.
 */
async function checkItems(req, res) {
    // F-1.1.1: Logic for CHECKITEMS action will go here
    console.log('[ROUTE] Processing CHECKITEMS request...');
    return res.status(501).json({ success: false, message: 'CHECKITEMS endpoint not implemented yet.' });
}


/**
 * F-1.1.2: Handle a new vending purchase request.
 * This is the main logic you asked for.
 */
async function purchaseVending(req, res) {
    const { meterNum, amount } = req.body;

    // 1. Validate input
    if (!meterNum || !amount) {
        return res.status(400).json({ success: false, message: 'Missing required fields: meterNum and amount.' });
    }

    const vendRequestId = generateUniqueTransID();
    console.log(`[CONTROLLER] New purchase request received. Generated ID: ${vendRequestId}`);

    let pendingTransaction;
    try {
        // 2. Create "Pending" transaction in our database
        console.log(`[CONTROLLER] Creating initial transaction record...`);
        pendingTransaction = await transactionService.createVendTransaction(
            vendRequestId,
            meterNum,
            amount
        );

        if (!pendingTransaction) {
            throw new Error('Failed to create initial transaction record in database.');
        }

        // 3. Call the external Power Hub
        console.log(`[CONTROLLER] Calling protocol service for ID: ${vendRequestId}`);
        const hubRequestParams = {
            transID: vendRequestId,
            meterNum: meterNum,
            amount: amount
        };

        const hubResponse = await protocolService.sendRequest('VEND', hubRequestParams, SHOULD_MOCK_HUB);

        // 4. Update our transaction with the hub's response
        console.log(`[CONTROLLER] Hub response received. Updating transaction...`);
        
        // --- FIX: Pass the *entire* hubResponse object, not individual properties ---
        const updatedTransaction = await transactionService.updateTransactionWithHubResponse(vendRequestId, hubResponse);

        // --- 5. Send Final Response (FIX: Re-added the missing 'if' statement) ---
        if (hubResponse.state === '0') {
            return res.status(200).json({
                success: true,
                message: 'Vending purchase successful.',
                transaction: updatedTransaction
            });
        } else {
            // Hub reported an error (e.g., meter not found)
            return res.status(409).json({
                success: false,
                message: hubResponse.message || 'Hub reported an error.',
                transaction: updatedTransaction
            });
        }

    } catch (error) {
        console.error(`[CONTROLLER] Critical error in handlePurchase:`, error.message);

        // --- FIX: Correct call to update transaction on failure ---
        // If a critical error happens (e.g., protocol service crashes),
        // we must try to mark our transaction as "Failed".
        
        // --- FIX: Correct call to update transaction on failure ---
        
        // This is the object the service expects
        const failureResponse = {
            state: '99', // Our internal code for a system crash
            rawResponse: error.message || '<xml>System Error</xml>',
            token: null,
            invoice: null,
            extraToken: null
        };

        try {
            console.log(`[CONTROLLER] Attempting to mark transaction ${vendRequestId} as Failed...`);
            // We MUST pass the failureResponse object as the second argument
            await transactionService.updateTransactionWithHubResponse(vendRequestId, failureResponse);
        } catch (updateError) {
            console.error(`[CONTROLLER] Failed to even update transaction to failed state:`, updateError.message);
        }

        // Return a generic 500 error to the client
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


// Export the controller functions
module.exports = {
    purchaseVending,
    checkItems
};
