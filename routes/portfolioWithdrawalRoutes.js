const express = require("express");
const router = express.Router();
const portfolioWithdrawalController = require("../controllers/portfolioWithdrawalController");
const { authUser } = require("../middleware/authUser");

router.get("/available", authUser, portfolioWithdrawalController.getAvailablePortfolio);
router.post("/withdraw", authUser, portfolioWithdrawalController.withdrawPortfolio);
router.get("/history", authUser, portfolioWithdrawalController.getWithdrawalHistory);

module.exports = router;
