const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

// Request withdrawal
exports.requestWithdrawal = async (userId, amount, method, walletAddress) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  if (user.status === "SUSPENDED") {
    throw new Error("Your account is suspended. Please contact support.");
  }

  if (parseFloat(user.balance) < amount) {
    throw new Error("Insufficient balance for withdrawal");
  }

  if (amount <= 0) {
    throw new Error("Withdrawal amount must be greater than zero");
  }

  const withdrawal = await Withdrawal.create({
    userId,
    amount,
    method,
    walletAddress,
    status: "PENDING",
  });

  return withdrawal;
};

// Get user withdrawal history
exports.getUserWithdrawals = async (userId) => {
  return await Withdrawal.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User,
        as: "user", // ✅ alias must match
        attributes: ["id", "name", "email"],
      },
    ],
  });
};

// Admin: Get all withdrawals
exports.getAllWithdrawals = async () => {
  return await Withdrawal.findAll({
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User,
        as: "user", // ✅ alias must match
        attributes: ["id", "name", "email"],
      },
    ],
  });
};

// Admin: Approve withdrawal
exports.approveWithdrawal = async (withdrawalId) => {
  const withdrawal = await Withdrawal.findByPk(withdrawalId, {
    include: [{ model: User, as: "user", attributes: ["id", "name", "email", "balance"] }],
  });
  if (!withdrawal) throw new Error("Withdrawal request not found");

  const user = withdrawal.user; // ✅ correct alias
  if (!user) throw new Error("User not found");

  user.balance = parseFloat(user.balance) - withdrawal.amount;
  await user.save();

  withdrawal.status = "COMPLETED";
  await withdrawal.save();

  return withdrawal;
};

// Admin: Reject withdrawal
exports.rejectWithdrawal = async (withdrawalId, reason) => {
  const withdrawal = await Withdrawal.findByPk(withdrawalId, {
    include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }],
  });
  if (!withdrawal) throw new Error("Withdrawal request not found");

  withdrawal.status = "REJECTED";
  await withdrawal.save();

  return withdrawal;
};
