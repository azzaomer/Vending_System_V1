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
    const { meterNum, itemId, amount } = req.body;

    // --- 1. Validation ---
    if (!meterNum || !amount) {
        return res.status(400).json({ success: false, message: "Missing required fields: meterNum, and amount are required." });
    }

    const vendRequestId = generateUniqueTransID();
    const initialTransactionData = {
        vend_request_id: vendRequestId,
        meter_num: meterNum,
        item_price: parseFloat(amount),
        status: 'pending', // Mark as 'pending' before contacting the hub
        action_requested: 'VEND',
        request_timestamp: new Date()
    };

    let transaction; // To store the transaction record

    try {
        // --- 2. Create Initial Transaction Record ---
        // Log the attempt in our database *before* making the external call.
        transaction = await transactionService.createVendTransaction(initialTransactionData);
        console.log(`[CONTROLLER] Created pending transaction: ${vendRequestId}`);

        // --- 3. Call External Hub ---
        // Send the VEND request to the protocol service
        const hubResponse = await protocolService.sendRequest('VEND', {
            meterNum,
            amount,
            vendRequestId
        });

        // --- 4. Update Transaction with Hub Response ---
        const updateData = {
            status: hubResponse.success ? 'completed' : 'failed',
            transaction_id: hubResponse.transaction_id || null,
            token_received: hubResponse.token || null,
            hub_state: hubResponse.state || 'unknown',
            hub_error_code: hubResponse.errorCode || null,
            hub_response_details: JSON.stringify(hubResponse.details || {}),
            response_timestamp: new Date()
        };

        transaction = await transactionService.updateTransactionByVendId(vendRequestId, updateData);
        console.log(`[CONTROLLER] Updated transaction ${vendRequestId} to status: ${updateData.status}`);

        // --- 5. Send Final Response to Client ---
        if (hubResponse.success) {
            // Purchase was successful
            return res.status(200).json({
                success: true,
                message: 'Purchase successful.',
                transaction: transaction
            });
        } else {
            // Purchase was denied by the hub
            return res.status(402).json({ // 402 = Payment Required (or in this case, failed)
                success: false,
                message: hubResponse.message || 'Purchase failed at the hub.',
                transaction: transaction
            });
        }

    } catch (error) {
        // --- 6. Handle Internal Errors ---
        console.error(`[CONTROLLER] Critical error in purchaseVending:`, error);
        
        // If the transaction was created but the hub call failed,
        // update the record to 'error'.
        if (transaction) {
            await transactionService.updateTransactionByVendId(vendRequestId, {
                status: 'error',
                hub_response_details: JSON.stringify({ internalError: error.message }),
                response_timestamp: new Date()
            });
        }
        
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


module.exports = {
    checkItems,
    purchaseVending
};
