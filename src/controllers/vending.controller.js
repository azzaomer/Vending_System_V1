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

    // --- 1. Validation ---
    if (!meterNum || !amount) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing required fields: meterNum, and amount are required." 
        });
    }

    const vendRequestId = generateUniqueTransID();
    console.log(`[CONTROLLER] New purchase request received. Generated ID: ${vendRequestId}`);
    try {
        // --- 2. Create Initial Transaction Record ---
        console.log(`[CONTROLLER] Creating initial transaction record...`);
        const newTransaction = await transactionService.createVendTransaction(
            vendRequestId, 
            meterNum, 
            amount
        );

    // --- 3. Call Protocol Service (Hub Simulation) ---
        console.log(`[CONTROLLER] Calling protocol service for ID: ${vendRequestId}`);
        // This 'VEND' action will now trigger the REAL implementation
        const hubResponse = await protocolService.sendRequest('VEND', {
            vend_request_id: vendRequestId,
            meter_num: meterNum,
            // 'itemId' is no longer part of this payload
            amount: amount,
            timestamp: new Date().toISOString()
        });

        // --- 4. Update Transaction with Hub Response ---
        console.log(`[CONTROLLER] Hub response received. Updating transaction...`);
        // UPDATED: Pass the 'invoice' from the hub response
        const updatedTransaction = await transactionService.updateTransactionWithHubResponse(
            vendRequestId,
            hubResponse.status, // 'Success' or 'Failed'
            hubResponse.errorCode, // e.g., '00' or '101'
            hubResponse.rawResponse, // The simulated XML string
            hubResponse.token, // The simulated token or null
            hubResponse.invoice // <-- NEWLY ADDED
        );

        // --- 5. Send Final Response ---
        return res.status(200).json({
            success: true,
            message: `Transaction ${hubResponse.status}.`,
            transaction: updatedTransaction // Return the final, updated transaction
        });

    } catch (error) {
        // This is a critical failure (e.g., database connection)
        console.error(`[CONTROLLER] Critical error in handlePurchase:`, error);
        
        // Try to update the transaction to 'Failed' if it was already created
        try {
            await transactionService.updateTransactionWithHubResponse(
                vendRequestId,
                'Failed',
                '500', // Internal Server Error
                error.message,
                null
            );
        } catch (updateError) {
            console.error(`[CONTROLLER] Failed to even update transaction to failed state:`, updateError);
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error during transaction.'
        });
    }
}


/**
 * Placeholder for checking available items.
 */
async function checkItems(req, res) {
    // F-1.1.3: Logic for GETITEMS action will go here
    return res.status(501).json({ success: false, message: 'checkItems endpoint not implemented yet.' });
}

// Export the controller functions
module.exports = {
    purchaseVending,
    checkItems
};
