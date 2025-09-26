const adminService = require("../services/adminService");
const {
  sendCreditAlert,
  sendProfitTopup,
  sendAccountUpgraded,
  sendAccountSuspended,
} = require("../services/email");
const User = require("../models/User");
const Firm = require("../models/Firm"); // if you use Firm too
const LoginActivity = require("../models/LoginActivity");


// Create firm
exports.createFirm = async (req, res) => {
  try {
    const firm = await adminService.createFirm(req.body, req.admin.id);
    res.json(firm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Upload firm profile picture
// Upload firm profile picture
exports.uploadFirmProfile = async (req, res) => {
  try {
    const { firmId } = req.params;

    let profilePictureUrl;

    if (req.file && req.file.path) {
      profilePictureUrl = req.file.path; // Cloudinary URL
    } else if (req.body.profile_picture) {
      profilePictureUrl = req.body.profile_picture; // Direct URL
    } else {
      return res.status(400).json({ error: "No file or URL provided" });
    }

    const firm = await adminService.uploadFirmProfile(firmId, profilePictureUrl);
    res.json(firm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Create user inside a firm
exports.createUserInFirm = async (req, res) => {
  try {
    const { firmId } = req.params;
    const user = await adminService.createUserInFirm(firmId, req.body);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Credit balance (📧 send credit alert)
exports.creditUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    const result = await adminService.creditUserBalance(userId, amount);

    try {
      await sendCreditAlert({
        to: result.user.email,
        firmName: result.firm.name,
        amount,
      });
      console.log(`📧 Credit alert sent to ${result.user.email}`);
    } catch (mailErr) {
      console.error("❌ Credit alert failed:", mailErr.message);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Set profit (📧 send profit top-up alert)
exports.setUserProfit = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, range } = req.body;
    const result = await adminService.setUserProfit(userId, amount, range);

    try {
      await sendProfitTopup({
        to: result.user.email,
        firmName: result.firm.name,
        amount,
        range,
      });
      console.log(`📧 Profit top-up alert sent to ${result.user.email}`);
    } catch (mailErr) {
      console.error("❌ Profit top-up alert failed:", mailErr.message);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign asset
exports.assignAsset = async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolio = await adminService.assignAsset(userId, req.body);
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upgrade account (📧 send upgrade email)
exports.upgradeUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.body;
    const result = await adminService.upgradeUserAccount(userId, level);

    try {
      await sendAccountUpgraded({
        to: result.user.email,
        level,
      });
      console.log(`📧 Account upgraded email sent to ${result.user.email}`);
    } catch (mailErr) {
      console.error("❌ Upgrade email failed:", mailErr.message);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Suspend / Unsuspend (📧 send suspension email if suspended)
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body; // SUSPEND or UNSUSPEND
    const result = await adminService.suspendUser(userId, action, reason);

    if (action === "SUSPEND") {
      try {
        await sendAccountSuspended({
          to: result.user.email,
          firmName: result.firm.name,
          reason,
        });
        console.log(`📧 Suspension email sent to ${result.user.email}`);
      } catch (mailErr) {
        console.error("❌ Suspension email failed:", mailErr.message);
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update user status directly
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // e.g. ACTIVE, SUSPENDED, PENDING
    const result = await adminService.updateUserStatus(userId, status);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Write news
exports.createNews = async (req, res) => {
  try {
    const news = await adminService.createNews(req.body, req.file, req.admin.id);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Edit news
exports.editNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const news = await adminService.editNews(newsId, req.body, req.file);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Connect existing user to firm
exports.connectUserToFirm = async (req, res) => {
  try {
    const userId = req.params.userId;  // ✅ match route param
    const { firmId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.firm_id = firmId;
    user.connected = true; // optional if you want to mark connected
    await user.save();

    res.json({ message: "User successfully connected to firm", user });
  } catch (err) {
    res.status(400).json({ message: "Failed to connect user to firm", error: err.message });
  }
};

// Add to adminController.js
// Update firm crypto addresses
exports.updateFirmCryptoAddresses = async (req, res) => {
  try {
    const { firmId } = req.params;
    const { btcAddress, ethAddress, usdtAddress } = req.body;
    
    const firm = await Firm.findByPk(firmId);
    if (!firm) return res.status(404).json({ error: "Firm not found" });
    
    const updates = {};
    if (btcAddress !== undefined) updates.crypto_btc_address = btcAddress;
    if (ethAddress !== undefined) updates.crypto_eth_address = ethAddress;
    if (usdtAddress !== undefined) updates.crypto_usdt_address = usdtAddress;
    
    await Firm.update(updates, { where: { id: firmId } });
    
    res.json({ 
      message: "Crypto addresses updated successfully",
      addresses: {
        BTC: btcAddress || firm.crypto_btc_address,
        ETH: ethAddress || firm.crypto_eth_address,
        USDT: usdtAddress || firm.crypto_usdt_address
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get firm crypto addresses
exports.getFirmCryptoAddresses = async (req, res) => {
  try {
    const { firmId } = req.params;
    
    const firm = await Firm.findByPk(firmId, {
      attributes: ['crypto_btc_address', 'crypto_eth_address', 'crypto_usdt_address']
    });
    
    if (!firm) return res.status(404).json({ error: "Firm not found" });
    
    res.json({
      BTC: firm.crypto_btc_address,
      ETH: firm.crypto_eth_address,
      USDT: firm.crypto_usdt_address
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch firm by ID
exports.getFirmById = async (req, res) => {
  try {
    const { firmId } = req.params;
    const firm = await adminService.getFirmById(firmId);
    res.json(firm);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Fetch users under a firm
exports.getUsersByFirm = async (req, res) => {
  try {
    const { firmId } = req.params;
    const result = await adminService.getUsersByFirm(firmId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Fetch news created by firm's admin
exports.getFirmNews = async (req, res) => {
  try {
    const { firmId } = req.params;
    const result = await adminService.getFirmNews(firmId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Fetch all firms
exports.getAllFirms = async (req, res) => {
  try {
    const firms = await adminService.getAllFirms();
    res.json(firms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// adminController.js
exports.getAdminNews = async (req, res) => {
  try {
    const news = await adminService.getNewsByAdmin(req.admin.id);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// New: Fetch login activities
exports.getLoginActivities = async (req, res) => {
  try {
    const logins = await LoginActivity.findAll({
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
      order: [["login_time", "DESC"]],
      limit: 100,
    });
    res.json(logins);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch login history", error: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await adminService.deleteUser(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete firm
exports.deleteFirm = async (req, res) => {
  try {
    const { firmId } = req.params;
    const result = await adminService.deleteFirm(firmId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Fetch all users across all firms
exports.getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


