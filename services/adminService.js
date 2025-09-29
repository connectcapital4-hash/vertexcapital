// services/adminService.js
const Firm = require("../models/Firm");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/transaction");
const News = require("../models/news");
const Email = require("./email");  // ✅ no destructure
const cryptoService = require("../services/cryptoService");
const stockService = require("../services/stockService");
const Payment = require("../models/Payment"); // ✅ Fixed import name
const Withdrawal = require("../models/Withdrawal"); // ✅ ADD THIS IMPORT


// Create firm
exports.createFirm = async (data, adminId) => {
  if (!data.name) throw new Error("Firm name is required");

  return await Firm.create({
    ...data,
    profile_picture: data.profile_picture || null, // ✅ optional picture
    admin_id: adminId,
  });
};


// Upload firm profile picture
exports.uploadFirmProfile = async (firmId, profilePictureUrl, body = {}) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");

  // ✅ Set profile picture if provided
  if (profilePictureUrl) {
    firm.profile_picture = profilePictureUrl; // Cloudinary URL or direct link
  }

  // ✅ Optionally update other fields
  if (body?.name) {
    firm.name = body.name;
  }

  await firm.save();
  return firm;
};


// ✅ FIXED: Create or update user in firm
exports.createUserInFirm = async (firmId, data) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");

  // Check if user already exists
  let user = await User.findOne({ where: { email: data.email } });

  if (user) {
    // ✅ If user exists, just attach them to the firm
    user.firm_id = firmId;
    user.connected = true;
    await user.save();
  } else {
    // ✅ If user doesn’t exist yet, create them
    user = await User.create({
      firm_id: firmId,
      name: data.name,
      email: data.email,
      password_hash: null,  
      status: "ACTIVE",
      account_level: "BASIC",
      connected: true,
    });
  }

  console.log(`✅ User ${user.email} attached to firm ${firm.name}`);
  return user;
};


// Credit user balance
exports.creditUserBalance = async (userId, amount) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  const firm = user.firm_id ? await Firm.findByPk(user.firm_id) : null;

  user.balance = parseFloat(user.balance || 0) + Number(amount);
  await user.save();

  await Transaction.create({
    userId,
    type: "CREDIT",
    amount: Number(amount),
    description: `Credited by firm ${firm ? firm.name : user.firm_id}`,
  });

  await Email.sendCreditAlert({
    to: user.email,
    userName: user.fullName || user.name,
    firmName: firm?.name || "Your Firm",
    amount: Number(amount).toFixed(2),
    newBalance: Number(user.balance).toFixed(2),
  });

  return { user, amount: Number(amount) };
};

// Set user profit
exports.setUserProfit = async (userId, amount, range) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  const firm = user.firm_id ? await Firm.findByPk(user.firm_id) : null;

  user.balance = parseFloat(user.balance || 0) + Number(amount);
  await user.save();

  await Transaction.create({
    userId,
    type: "PROFIT",
    amount: Number(amount),
    description: `Profit added (${range})`,
  });

  await Email.sendProfitTopup({
    to: user.email,
    userName: user.fullName || user.name,
    firmName: firm?.name || "Your Firm",
    amount: Number(amount).toFixed(2),
    range,
    newBalance: Number(user.balance).toFixed(2),
  });

  return user;
};

// Enhanced adminService - assignAsset method - FIXED
// Enhanced adminService - assignAsset method - FIXED
exports.assignAsset = async (userId, data) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  
  // Check if user has sufficient balance
  if (parseFloat(user.balance || 0) < Number(data.assignedValue)) {
    throw new Error("Insufficient balance to assign asset");
  }
  
  // Validate asset exists and get current price
  let currentPrice = 0;
  let assetLogo = "";
  let assetSymbol = data.assetSymbol || data.assetName;
  
  try {
    if (data.assetType === "CRYPTO") {
      const priceData = await cryptoService.getPrice(assetSymbol.toLowerCase());
      currentPrice = priceData.usd || 0;
      assetLogo = priceData.logo || "";
    } else if (data.assetType === "STOCK") {
      const quoteData = await stockService.getQuote(assetSymbol, process.env.FINNHUB_API_KEY);
      currentPrice = quoteData.c || 0;
      
      // Get stock logo
      try {
        const profileData = await stockService.getProfile(assetSymbol, process.env.FINNHUB_API_KEY);
        assetLogo = profileData.logo || "";
      } catch (logoErr) {
        console.error("Failed to fetch stock logo:", logoErr.message);
        assetLogo = "";
      }
    }
    
    if (!currentPrice || currentPrice === 0) {
      throw new Error("Invalid asset symbol or unable to fetch price");
    }
  } catch (error) {
    throw new Error(`Failed to validate asset: ${error.message}`);
  }
  
  // Calculate quantity based on assigned value
  const quantity = data.assignedValue / currentPrice;
  
  const portfolio = await Portfolio.create({
    userId,
    assetName: data.assetName,
    assetSymbol: assetSymbol,
    assetType: data.assetType,
    stake: data.stake || 100, // Default to 100% if not specified
    quantity,
    purchasePrice: currentPrice,
    currentValue: data.assignedValue,
    assignedValue: data.assignedValue,
    profitLoss: 0,
    createdAt: new Date(),
    lastUpdated: new Date()
  });
  
  // ✅ FIX: Deduct from user balance instead of adding
  user.balance = parseFloat(user.balance || 0) - Number(data.assignedValue);
  await user.save();
  
  // Create transaction record
  await Transaction.create({
    userId,
    type: "ASSET_ASSIGNMENT",
    amount: -Number(data.assignedValue), // Negative amount for deduction
    description: `Asset assignment: ${data.assetName} (${data.assetType})`,
    meta: {
      assetName: data.assetName,
      assetType: data.assetType,
      quantity,
      purchasePrice: currentPrice,
      assetSymbol: assetSymbol,
      logo: assetLogo
    },
    created_at: new Date()
  });
  
  // ✅ Add logo to response
  portfolio.dataValues.logo = assetLogo;
  
  return portfolio;
};

// Upgrade account
exports.upgradeUserAccount = async (userId, level) => {
  console.log(`🔄 Starting upgrade for user ${userId} to level: ${level}`);
  
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  
  console.log(`📊 Before update - account_level: ${user.account_level}, status: ${user.status}`);
  
  const firm = user.firm_id ? await Firm.findByPk(user.firm_id) : null;

  // Update account_level
  user.account_level = level;
  
  // Save and wait for completion
  await user.save();
  
  // Force reload from database to verify
  await user.reload();
  
  console.log(`📊 After update - account_level: ${user.account_level}, status: ${user.status}`);

  // Send email
  await Email.sendAccountUpgraded({
    to: user.email,
    userName: user.fullName || user.name,
    firmName: firm?.name || "Your Firm",
    level,
  });

  console.log(`📧 Upgrade email sent to ${user.email}`);
  
  return user;
};

// Suspend / Unsuspend
exports.suspendUser = async (userId, action, reason = "") => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  const firm = user.firm_id ? await Firm.findByPk(user.firm_id) : null;

  user.status = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
  await user.save();

  if (action === "SUSPEND") {
    await Email.sendAccountSuspended({
      to: user.email,
      userName: user.fullName || user.name,
      firmName: firm?.name || "Your Firm",
      reason,
    });
  } else if (action === "UNSUSPEND") {
    await Email.sendAccountUnsuspended({
      to: user.email,
      userName: user.fullName || user.name,
      firmName: firm?.name || "Your Firm",
    });
  }

  return user;
};

// ✅ // Update user status directly
exports.updateUserStatus = async (userId, status) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  const firm = user.firm_id ? await Firm.findByPk(user.firm_id) : null;

  user.status = status;
  await user.save();

  await Email.sendStatusChanged({
    to: user.email,
    userName: user.fullName || user.name,
    firmName: firm?.name || "Your Firm",
    status,
  });

  return user;
};

// Create news
exports.createNews = async (data, file, adminId) => {
  return await News.create({
    title: data.title,
    body: data.body,
    link: data.link || null,
    imageUrl: file?.path || null, // ✅ use model field name
    publishedBy: adminId,
    created_at: new Date()
  });
};

// Edit news
exports.editNews = async (newsId, data, file) => {
  const news = await News.findByPk(newsId);
  if (!news) throw new Error("News not found");

  Object.assign(news, {
    title: data.title ?? news.title,
    body: data.body ?? news.body,
    link: data.link ?? news.link,
  });

  if (file?.path) {
    news.imageUrl = file.path; // ✅ use model field name
  }

  await news.save();
  return news;
};

// Get firm by ID
exports.getFirmById = async (firmId) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");
  return firm;
};

// Get users under a firm
exports.getUsersByFirm = async (firmId) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");

  const users = await User.findAll({
    where: { firm_id: firmId },
    attributes: ["id", "name", "email", "status", "balance", "account_level", "created_at"]
  });

  return { firm, users };
};

// Get news created by firm's admin
exports.getFirmNews = async (firmId) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");

  const news = await News.findAll({
    where: { published_by: firm.admin_id },
    order: [["created_at", "DESC"]],
    attributes: ["id", "title", "body", "image_url", "link", "created_at"]
  });

  return { firm, news };
};

// Get all firms
exports.getAllFirms = async () => {
  return await Firm.findAll({
    attributes: [
      "id",
      "name",
      "description",
      "profile_picture",
      "admin_id",
      "crypto_btc_address",
      "crypto_eth_address",
      "crypto_usdt_address",
      "created_at"
    ],
    order: [["created_at", "DESC"]]
  });
};

// adminService.js
exports.getNewsByAdmin = async () => {
  return await News.findAll({
    order: [["created_at", "DESC"]],
    attributes: ["id", "title", "body", "image_url", "link", "created_at"],
  });
};


// Delete user
exports.deleteUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  // Optional: also delete their portfolios, transactions, payments, withdrawals
  await Portfolio.destroy({ where: { user_id: userId } });
  await Transaction.destroy({ where: { user_id: userId } });
  await Payment.destroy({ where: { user_id: userId } });
  await Withdrawal.destroy({ where: { user_id: userId } });

  await user.destroy();
  return { message: `User ${userId} deleted successfully` };
};

// Delete firm
exports.deleteFirm = async (firmId) => {
  const firm = await Firm.findByPk(firmId);
  if (!firm) throw new Error("Firm not found");

  // Remove all users under this firm (optional: cascade delete)
  const users = await User.findAll({ where: { firm_id: firmId } });
  for (const user of users) {
    await exports.deleteUser(user.id);
  }

  await firm.destroy();
  return { message: `Firm ${firmId} deleted successfully` };
};

// Get all users (across all firms)
exports.getAllUsers = async () => {
  return await User.findAll({
    attributes: ["id", "name", "email", "status", "balance", "account_level", "firm_id", "connected", "created_at"],
    order: [["created_at", "DESC"]],
  });
};




