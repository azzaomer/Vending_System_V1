// P2.1: Vending Controller - Handles the main /purchase API route and orchestrates services.

const express = require('express');
const router = express.Router();

// Service Layer Imports (P1.2, P1.3, P1.4, P2.5)
const protocolService = require('../services/protocol.service');
const tokenService = require('../services/token.service');

// Repository Layer Import (P1.1.D)
const transactionRepo = require('../repositories/transaction.repository');

// Protocol Service Import (P1.4 - NOW UNCOMMENTED AND REQUIRED)
//const protocolService = require('../services/protocol.service'); 

/**
 * Handles the POST /purchase request for a vending transaction.
 * This function orchestrates the entire transaction flow: validation, logging, 
 * hub communication (P2.3), token processing (P2.5), and final audit.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function purchaseVending(req, res) {
    const { meterNum, amount } = req.body;
    let transID = null; // Defined here for use in the catch block
    let recordId = null; // Defined here for use in the catch block

    // --- Step 1: Input Validation ---
    if (!meterNum || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid input. 'meterNum' and positive 'amount' are required."
        });
    }

    try {
        // --- Step 2: Protocol Execution (P2.3 - Two-Step Vending) ---
        
        // F-1.1.1: This call internally handles generating the ID and logging the initial request (using logRequest).
        const { id: newRecordId, transID: generatedTransID, hubResponse: initialResponse } = await protocolService.vendTwoStep(meterNum, amount, 'PURCHASE');
        
        transID = generatedTransID; // Store the ID for error logging
        recordId = newRecordId;
        
        // --- Step 3: Handle Hub Failure (This block is not reached in mock, but is essential) ---
        const hubResponse = initialResponse; 

        const hubState = parseInt(hubResponse.xml.$.state);

        if (hubState !== 0) {
            // F-1.3.1: Hub protocol failure (not a network error)
            return res.status(502).json({
                success: false,
                message: `Hub rejected transaction (Code: ${hubResponse.xml.$.code || 'N/A'}).`,
                transactionId: transID,
                errorCode: hubResponse.xml.$.code || 'UNKNOWN'
            });
        }

        // --- Step 4: Token Compliance Processing (P2.5) ---
        const rawToken = hubResponse.xml.$.token;
        const tokens = tokenService.processToken(rawToken); // Separates Key Change, Dual Credit, etc.
        
        // --- Step 5: Final Audit Logging (NF-2.2.1) ---
        // CORRECT CALL: This function is the one that exists in the repository.
        await transactionRepo.updateRequestLog(transID, recordId, hubResponse);

        // --- Step 6: Success Response to Client ---
        return res.status(200).json({
            success: true,
            message: 'Transaction completed successfully.',
            transactionId: transID,
            meterNumber: meterNum,
            amount: amount,
            receipt: {
                // This structure supports Key Change and Dual Credit Presentation (P3.2)
                tokens: tokens, 
                vendAmount: parseFloat(hubResponse.xml.$.vendAMT) || amount,
                invoice: hubResponse.xml.$.invoice || 'N/A'
            }
        });

    } catch (error) {
        // --- Step 7: Critical Error Handling (Database or Network) ---
        const message = error.message.includes("Database logging") ? "Database integrity error. Check audit logs." : "Vending service failed due to a critical system error.";

        console.error(`[CONTROLLER ERROR] Purchase transaction failed for ${transID}:`, error.message);
        
        // Final audit update: Attempt to log the failure if transID exists
        if (transID) {
             // In a real app, you would attempt to update the log one last time with the error state.
             // Since the prior error was in logging, we rely on the PENDING status until manual review.
        }

        return res.status(500).json({ 
            success: false, 
            message: message,
            transactionId: transID || 'N/A',
            detail: error.message 
        });
    }
}

// --- NEWLY IMPLEMENTED: getLastTransactions (F-1.1.5) ---

/**
 * Handles the GET /last-transactions request (F-1.1.5).
 * @param {object} req - Express request object. Query params: meterNum.
 */
async function getLastTransactions(req, res) {
    const { meterNum } = req.query;
    if (!meterNum) {
         return res.status(400).json({ success: false, message: "Query parameter 'meterNum' is required." });
    }
    
    console.log(`[ROUTE] Processing GETTRANS request for Meter: ${meterNum}`);
    
    try {
        // 1. Build the XML request for GETTRANS
        const xmlRequest = protocolService.buildGetTransRequest(meterNum);

        // 2. Send request to the Hub (will use mock)
        const hubResponse = await protocolService.sendRequest('GETTRANS', xmlRequest);

        // 3. Check Hub response for state
        // Note: The mock returns { xml: { result: ... } }
        const result = hubResponse.xml.result;
        const hubState = parseInt(result.$.state);

        if (hubState !== 0) {
            console.warn(`[ROUTE] Hub returned error for GETTRANS check: State ${hubState}`);
            return res.status(502).json({
                success: false,
                message: `Hub returned an error state: ${hubState}`,
                meterNum: meterNum
            });
        }

        // 4. Format and return the transaction list (based on mock/protocol doc)
        const transactionCount = parseInt(result.$.count);
        const transactions = [];
        
        // Loop based on the count and parse ti0, tt0, ti1, tt1, etc.
        for (let i = 0; i < transactionCount; i++) {
            if (result.$[`ti${i}`] && result.$[`tt${i}`]) {
                transactions.push({
                    id: result.$[`ti${i}`],
                    time: result.$[`tt${i}`]
                });
            }
        }
        
        console.log(`[ROUTE] GETTRANS successful for Meter: ${meterNum}. Found ${transactions.length} transactions.`);
        res.status(200).json({
            success: true,
            meterNum: meterNum,
            count: transactions.length,
            transactions: transactions
        });

    } catch (error) {
        // 5. Handle Critical Errors
      /  console.error(`[CONTROLLER ERROR] GETTRANS failed for Meter ${meterNum}:`, error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server failed to process get last transactions request.',
            detail: error.message 
        });
    }
}

// Register Controller Functions
router.post('/purchase', purchaseVending);
router.get('/last-transactions', getLastTransactions); // <-- Now implemented

module.exports = {
    router,
    purchaseVending // Exported for easy testing/import into server.js
};
