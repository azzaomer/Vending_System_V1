/**
 * P2.1: Vending Controller
 * * Handles the Express route for Vending transactions.
 * * Manages input validation, orchestration of services, and final response formatting.
 * * Integrates P1.1 (Audit Logging) and P2.3 (Two-Step Vending Logic).
 */

const protocolService = require('../services/protocol.service');
const transactionRepository = require('../repositories/transaction.repository');
const { generateTransID } = require('../services/id.service');

/**
 * Handles the main POST request for a two-step purchase transaction.
 * Route: POST /api/v1/vending/purchase
 * @param {object} req - Express request object (expects meterNum and amount in body).
 * @param {object} res - Express response object.
 */
const purchaseVending = async (req, res) => {
    // NOTE: In a real system, userId would come from authentication (req.user.id)
    const userId = 'InternalTPGateway'; // Placeholder user ID for auditing

    const { meterNum, amount } = req.body;
    
    // --- 1. Basic Input Validation ---
    if (!meterNum || !amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ 
            status: 'ERROR', 
            message: 'Invalid request', 
            detail: 'Missing or invalid meterNum or amount.' 
        });
    }

    const requestedAmount = parseFloat(amount);
    let auditId = null;
    const transID = generateTransID();
    
    try {
        // --- 2. Protocol & Audit Orchestration (P2.3 Logic) ---
        
        // The vendTwoStep function now returns an object with the initial XML request 
        // string for the CHECK action.
        const { checkXML, purchaseXML, finalResponse } = await protocolService.vendTwoStep(meterNum, requestedAmount, transID);
        
        // *** AUDIT LOGGING (P1.1) ***
        
        // Log the initial CHECK request (using the transID and first XML payload)
        // NOTE: We log the CHECK request first, and update with the final PURCHASE response.
        const initialLogData = {
            transID,
            userId,
            meterNum,
            actionRequested: 'PURCHASE_TWOStep',
            requestXML: checkXML, // Log the XML of the first (CHECK) request
        };
        auditId = await transactionRepository.logRequest(initialLogData);
        
        // --- 3. Process Final Hub Response ---
        const finalAttrs = finalResponse.Transaction.$; // Extract attributes from the final response
        const hubState = parseInt(finalAttrs.state, 10);
        
        const responseData = {
            hubState: hubState,
            hubErrorCode: finalAttrs.code || null,
            tokenReceived: finalAttrs.token || null,
            amountRequested: requestedAmount,
            invoiceNum: finalAttrs.invoiceNum || null,
            responseXML: JSON.stringify(finalResponse) // Store the full parsed JSON as a string
        };

        // Update the audit log with the successful response
        await transactionRepository.updateResponse(transID, responseData);
        
        // --- 4. Return Final Success Response to Client (Front-End) ---
        if (hubState === 0) {
            // P2.5: Token Pre-Processing will happen here eventually
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Vending successful',
                receipt: {
                    token: finalAttrs.token,
                    amount: requestedAmount,
                    invoiceNum: finalAttrs.invoiceNum,
                    hubState: hubState,
                    transID: transID
                    // P2.5 will add separated token arrays here
                }
            });
        } else {
            // Hub returned an error state (e.g., Meter Not Found)
            // P2.6: Error Mapping will happen here
            return res.status(200).json({ // Return 200 for protocol errors, 4xx for network/server errors
                status: 'PROTOCOL_ERROR',
                message: 'Vending failed due to Hub error',
                hubCode: finalAttrs.code,
                hubMessage: finalAttrs.message, // Assuming Hub returns a message attribute
                transID: transID
            });
        }

    } catch (error) {
        // --- 5. Handle Critical System/Network Errors ---
        console.error(`[CONTROLLER ERROR] Purchase failed for ${meterNum}:`, error.message);
        
        // If we failed *before* sending the request, the auditId might be null.
        // If we failed *during* the request (e.g., network timeout), we should update the audit log
        // (This complex logic is simplified here but critical in a real system)

        return res.status(500).json({ 
            status: 'SERVER_ERROR', 
            message: 'Server failed to process transaction.', 
            detail: error.message 
        });
    }
};

module.exports = {
    purchaseVending
};
