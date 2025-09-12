// services/withdrawalService.js
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

// Request withdrawal (demo version - no actual money movement)
exports.requestWithdrawal = async (userId, amount, method, walletAddress) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  // Demo validation - check if user is suspended
  if (user.status === "SUSPENDED") {
    throw new Error("Your account is suspended. Please contact support.");
  }

  // Demo validation - check balance
  if (parseFloat(user.balance) < amount) {
    throw new Error("Insufficient balance for withdrawal");
  }

  if (amount <= 0) {
    throw new Error("Withdrawal amount must be greater than zero");
  }

  // Create withdrawal request (no actual money deduction)
  const withdrawal = await Withdrawal.create({
    userId,
    amount,
    method,
    walletAddress,
    status: "PENDING"
  });

  return withdrawal;
};

// Get user withdrawal history
exports.getUserWithdrawals = async (userId) => {
  return await Withdrawal.findAll({
    where: { userId },
    order: [['created_at', 'DESC']]
  });
};

// Admin: Get all withdrawals
exports.getAllWithdrawals = async () => {
  return await Withdrawal.findAll({
    order: [['created_at', 'DESC']]
  });
};

// Admin: Approve withdrawal (demo - no actual processing)
exports.approveWithdrawal = async (withdrawalId) => {
  const withdrawal = await Withdrawal.findByPk(withdrawalId);
  if (!withdrawal) throw new Error("Withdrawal request not found");

  const user = await User.findByPk(withdrawal.userId);
  if (!user) throw new Error("User not found");

  // In demo, we'll actually deduct the balance to make it realistic
  user.balance = parseFloat(user.balance) - withdrawal.amount;
  await user.save();

  withdrawal.status = "COMPLETED";
  await withdrawal.save();

  return withdrawal;
};

// Admin: Reject withdrawal
exports.rejectWithdrawal = async (withdrawalId, reason) => {
  const withdrawal = await Withdrawal.findByPk(withdrawalId);
  if (!withdrawal) throw new Error("Withdrawal request not found");

  withdrawal.status = "REJECTED";
  await withdrawal.save();

  return withdrawal;
};