// controllers/withdrawalController.js
const withdrawalService = require("../services/withdrawalService");

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, walletAddress } = req.body;

    const withdrawal = await withdrawalService.requestWithdrawal(
      req.user.id,
      amount,
      method,
      walletAddress
    );

    res.json({
      message: "Withdrawal request submitted successfully",
      withdrawal,
      note: "This is a demo - admin will process your request manually"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get user withdrawal history
exports.getUserWithdrawals = async (req, res) => {
  try {
    const withdrawals = await withdrawalService.getUserWithdrawals(req.user.id);
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all withdrawals
exports.getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await withdrawalService.getAllWithdrawals();
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Approve withdrawal
exports.approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await withdrawalService.approveWithdrawal(withdrawalId);

    res.json({
      message: "Withdrawal approved and processed",
      withdrawal
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin: Reject withdrawal
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawal = await withdrawalService.rejectWithdrawal(withdrawalId, reason);

    res.json({
      message: "Withdrawal rejected",
      withdrawal
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j