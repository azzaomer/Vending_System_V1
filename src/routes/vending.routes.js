// P-1.1.1: Routes for the Vending API
const router = require('express').Router();
// We require the vending controller, not the inquiry one
const vendingController = require('../controllers/vending.controller');

/**
 * @route GET /api/v1/vending/check-items
 * @description Check available items (placeholder).
 */
router.get('/check-items', vendingController.checkItems);

/**
 * @route POST /api/v1/vending/purchase
 * @description Handle a new vending purchase request.
 * @body {string} meterNum - The meter number.
 * @body {string} itemId - The ID of the item to purchase.
 * @body {number} amount - The amount for the purchase.
 */
router.POST('/purchase', vendingController.purchaseVending);

// Export the router to be used in server.js
module.exports = router;

