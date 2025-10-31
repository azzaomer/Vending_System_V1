/**
 * P2.1, P2.3, P2.5: Vending Controller
 * * Exposes the secure internal REST API for the core purchase flow (P2.1).
 * * Orchestrates the two-step vending logic (P2.3), token pre-processing (P2.5), 
 * and audit logging (P1.1).
 * * NOTE: This file now exports the function directly, NOT an Express Router,
 * to fix the 'Cannot POST' error when used by server.js.
 */

const express = require('express');
const router = express.Router();

// P1.2: ID Generator
const { generateUniqueTransID } = require('../id_generator'); 
// P1.1.D: Repository Layer
//const transactionRepo = require('../transaction_repository');
const transactionRepo = require('../repositories/transaction.repository');
// P1.4: Protocol Gateway
const protocolService = require('../xml_protocol'); 
// P2.5: Token Compliance Service
const tokenService = require('../services/token.service'); 

/**
 * Implements the core purchase vending logic using the Two-Step flow (P2.3).
 * Route: POST /api/v1/vending/purchase
 */
const purchaseVending = async (req, res) => {
    // Note: meterNum and amount are expected from the request body
    const { meterNum, amount, calcMode } = req.body; 
    
    // Hardcoded for testing; replace with actual Auth/User ID logic later
    const userId = req.headers['x-user-id'] || 'anonymous'; 

    // 1. Input Validation
    if (!meterNum || !amount) {
        return res.status(400).json({ success: false, message: 'Missing meterNum or amount in request body.' });
    }

    // 2. Start Two-Step Process (CHECK + PURCHASE)
    const transID = generateUniqueTransID(); // P1.2
    let auditId;

    try {
        // --- Step A: CHECK action (Simplified/Simulated by P2.3 in protocolService) ---
        // We use 'DONOTVERIFYDATA' in the PURCHASE call for now to skip the actual CHECK request
        // until we fully implement the separate P2.2 (Single-Step) and P2.3 (Two-Step).
        
        // Log the intent to PURCHASE (P1.1)
        auditId = await transactionRepo.createRequestLog({
            transId: transID, meterNum, actionRequested: 'PURCHASE', requestXml: 'PURCHASE_INTENT_LOG', userId
        });
        
        // --- Step B: PURCHASE action (Full Vending) ---
        const purchaseXml = protocolService.buildXmlRequest('PURCHASE', {
            transID, meterNum, calcMode: calcMode || 'M', amount, verifyData: 'DONOTVERIFYDATA' // Use single-step bypass
        });

        // Update the audit log entry with the actual XML being sent (P1.1)
        await transactionRepo.updateRequestLog(auditId, purchaseXml, 'PURCHASE'); 


        const hubResponse = await protocolService.sendRequest('PURCHASE', purchaseXml);
        
        const hubResultAttr = hubResponse.result.$; // Root attributes: state, code, invoice
        let tokenReceived = null;
        
        // Extract token from the property array
        if (hubResponse.result.Property && Array.isArray(hubResponse.result.Property)) {
            const tokenElement = hubResponse.result.Property.find(p => p.$.name === 'token');
            tokenReceived = tokenElement ? tokenElement.$.value : null;
        }

        // 3. Pre-Process Token for Compliance (P2.5)
        const formattedTokens = tokenService.processToken(tokenReceived); 

        const finalResponseData = {
            state: parseInt(hubResultAttr.state),
            code: hubResultAttr.code,
            token: tokenReceived, // Raw token
            invoiceNum: hubResultAttr.invoice,
            amountRequested: amount,
            responseXml: JSON.stringify(hubResponse)
        };

        // 4. Update audit log with final response (P1.1)
        await transactionRepo.updateResponseLog(auditId, finalResponseData);
        
        // 5. Send structured JSON response to the Front-End (P2.1)
        res.status(200).json({ 
            success: finalResponseData.state === 0, 
            transactionId: transID,
            hubCode: finalResponseData.code,
            // P2.5: Sending the pre-processed tokens for compliant front-end display (P3.2)
            tokens: formattedTokens, 
            receipt: hubResultAttr 
        });

    } catch (error) {
        // Log communication failure (NF-2.2.2)
        console.error(`[CONTROLLER ERROR] Purchase transaction failed for ${transID}:`, error.message);
        
        // NF-2.2.2: Send a generic error message to the client
        res.status(500).json({ 
            success: false, 
            message: 'Vending service failed due to a network or protocol error.',
            transactionId: transID
        });
    }
};

// CRITICAL FIX: Export the function as an object property to match server.js's route definition
module.exports = {
    purchaseVending
};

