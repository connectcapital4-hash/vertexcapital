const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendSignupEmail, sendLoginOtp, sendPasswordResetOtp,sendPasswordResetSuccess, sendUserLoginAlert, sendFirmConnectOtp } = require("../services/email");
const Firm = require("../models/Firm");
const LoginActivity = require("../models/LoginActivity");

const { Op } = require("sequelize");
const stockService = require("../services/stockService");
const axios = require("axios");
require("dotenv").config();

const FINNHUB_API = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

// 🔹 Login user (step 1: request OTP)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    // ✅ FIXED: Handle passwordless (firm-created) users
    if (user.password_hash) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(400).json({ message: "Invalid password" });
    } else {
      if (password) {
        return res.status(400).json({ message: "This account uses OTP only" });
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // 📧 Send login OTP
    try {
      await sendLoginOtp({ to: user.email, name: user.name, otp });
      console.log(`📧 Login OTP sent to ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Login OTP failed:", mailErr.message);
    }

    return res.json({ message: "OTP sent to email" });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// 🔹 Verify OTP (step 2: issue JWT if correct)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // ✅ Fetch user + firm so we can show firm name in email alert
    const user = await User.findOne({ where: { email }, include: [{ model: Firm, as: "firm" }] });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otp || !user.otp_expiry) {
      return res.status(400).json({ message: "No OTP generated. Please login again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Debug logs (optional)
    console.log("---- OTP DEBUG ----");
    console.log("Now:", new Date().toISOString(), " (epoch:", Date.now(), ")");
    console.log("Expiry from DB:", user.otp_expiry, " (epoch:", new Date(user.otp_expiry).getTime(), ")");
    console.log("-------------------");

    if (Date.now() > new Date(user.otp_expiry).getTime()) {
      return res.status(400).json({ message: "OTP expired. Please login again." });
    }

    // ✅ Clear OTP
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    // ✅ Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // ✅ Normalize IP (works behind proxy or local)
    const clientIp = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : req.ip;

    // ✅ Log this login in DB
    await LoginActivity.create({
      user_id: user.id,
      ip_address: clientIp,
      user_agent: req.headers["user-agent"] || null,
    });

    // ✅ Send email alert to admins
    try {
      await sendUserLoginAlert({
        to: process.env.ADMIN_EMAIL, // supports comma-separated emails
        userName: user.name,
        userEmail: user.email,
        firmName: user.firm ? user.firm.name : "Independent User",
        loginTime: new Date(),
        ipAddress: clientIp,
      });
      console.log(`📧 Login alert sent for ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Failed to send login alert:", mailErr.message);
    }

    // ✅ Respond with token + user object
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_picture: user.profile_picture,
        connected: user.connected,
        status: user.status,
        balance: user.balance,
        account_level: user.account_level,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "OTP verification failed", error: err.message });
  }
};

// 🔹 Register user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash,
      connected: false,
      profile_picture: null,
    });

    // 📧 Send welcome email
    try {
      await sendSignupEmail({
        to: email,
        name,
      });
      console.log(`📧 Signup email sent to ${email}`);
    } catch (mailErr) {
      console.error("❌ Signup email failed:", mailErr.message);
    }

    return res.json({ message: "User registered successfully", user });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// 🔹 Get current logged-in user
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "status",
        "balance",
        "account_level",
        "connected",
        "profile_picture",
      ],
      include: [
        {
          model: Firm, // ✅ Include firm details
          as: "firm",
          attributes: ["id", "name", "description", "profile_picture"], // you can add crypto addresses if needed
        },
        {
          model: require("../models/Portfolio"),
          as: "portfolio",
          attributes: ["asset_name", "asset_symbol", "quantity", "profit_loss", "assigned_value"],
        },
        {
          model: require("../models/Withdrawal"),
          as: "withdrawals",
          attributes: ["id", "amount", "status", "created_at"],
        },
      ],
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user profile", error: err.message });
  }
};


// 🔹 Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { profile_picture } = req.body;

    req.user.profile_picture = profile_picture;
    await req.user.save();

    return res.json({ message: "Profile picture updated", profile_picture });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to update profile picture", error: err.message });
  }
};

// 🔹 Request firm connection
exports.requestFirmConnect = async (req, res) => {
  try {
    const { email, firmId } = req.body;

    const user = await User.findOne({ where: { email, firm_id: firmId } });
    if (!user) {
      return res.status(400).json({ message: "You are not yet registered by this firm." });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h validity
    await user.save();

    const firm = await Firm.findByPk(firmId);

    // Send firm connect OTP
    try {
      await sendFirmConnectOtp({
        to: user.email,
        name: user.name,
        firmName: firm.name,
        otp,
        expiresInMinutes: 30, // 
      });
      console.log(`📧 Firm connect OTP sent to ${user.email}`);
    } catch (err) {
      console.error("❌ Firm connect OTP failed:", err.message);
    }

    return res.json({ message: "Firm connection OTP sent to email" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to request firm connection", error: err.message });
  }
};

// 🔹 Verify firm connect OTP
exports.verifyFirmConnect = async (req, res) => {
  try {
    const { email, firmId, otp } = req.body;

    const user = await User.findOne({ where: { email, firm_id: firmId } });
    if (!user) return res.status(400).json({ message: "User not found in this firm" });

    if (!user.otp || !user.otp_expiry) {
      return res.status(400).json({ message: "No OTP generated. Please request again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > new Date(user.otp_expiry).getTime()) {
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    // Mark connected ✅
    user.connected = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.json({ message: "Firm connection successful", connected: true });
  } catch (err) {
    return res.status(500).json({ message: "OTP verification failed", error: err.message });
  }
};


// 🔹 Request password reset (send OTP) with proper rate limiting
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const now = Date.now();

    // Initialize if missing
    if (!user.otp_request_count) user.otp_request_count = 0;
    if (!user.otp_request_reset_time) user.otp_request_reset_time = new Date(now);

    // Check if we are still in cooldown window
    if (now < new Date(user.otp_request_reset_time).getTime()) {
      if (user.otp_request_count >= 5) {
        return res.status(429).json({ message: "Too many OTP requests. Please try again in an hour." });
      }
    } else {
      // Window expired → reset counter & set new 1-hour window
      user.otp_request_count = 0;
      user.otp_request_reset_time = new Date(now + 60 * 60 * 1000);
    }

    // Increment request count
    user.otp_request_count += 1;

    // Generate and save OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otp_expiry = new Date(now + 10 * 60 * 1000); // valid for 10 mins
    await user.save();

    try {
      await sendPasswordResetOtp({ to: user.email, name: user.name, otp });
      console.log(`📧 Password reset OTP sent to ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Password reset email failed:", mailErr.message);
    }

    return res.json({ message: "OTP sent to email" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to request password reset", error: err.message });
  }
};

// 🔹 Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otp || !user.otp_expiry) {
      return res.status(400).json({ message: "No OTP generated. Please request again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > new Date(user.otp_expiry).getTime()) {
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    // Hash new password
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordResetSuccess({ to: user.email, name: user.name });
      console.log(`✅ Password reset confirmation sent to ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Password reset success email failed:", mailErr.message);
    }

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
};

// 🔹 Search Firms (local DB + Stock API fallback)
exports.searchFirms = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    // 1️⃣ Search local firms in DB
    const localFirms = await Firm.findAll({
      where: {
        name: { [Op.iLike]: `%${q}%` } // case-insensitive partial match
      },
      attributes: ["id", "name", "description", "profile_picture"]
    });

    let results = localFirms.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      profile_picture: f.profile_picture,
      source: "local"
    }));

    // 2️⃣ If few local results, also fetch from Finnhub stock search
    if (results.length < 5) {
      const searchRes = await axios.get(`${FINNHUB_API}/search?q=${q}&token=${API_KEY}`);
      const matches = searchRes.data.result || [];

      // For each symbol, get full profile
      const stockProfiles = await Promise.all(
        matches.slice(0, 5).map(async (m) => {
          try {
            const profileRes = await axios.get(
              `${FINNHUB_API}/stock/profile2?symbol=${m.symbol}&token=${API_KEY}`
            );
            const p = profileRes.data;
            if (!p || !p.name) return null;

            return {
              id: null,
              name: p.name,
              description: p.finnhubIndustry || "No description available",
              profile_picture: p.logo,
              ticker: p.ticker,
              source: "stock"
            };
          } catch (err) {
            return null;
          }
        })
      );

      results = results.concat(stockProfiles.filter(Boolean));
    }

    // 3️⃣ Return merged results (unique by name)
    const uniqueResults = results.reduce((acc, curr) => {
      if (!acc.find(r => r.name === curr.name)) acc.push(curr);
      return acc;
    }, []);

    return res.json({ firms: uniqueResults });
  } catch (err) {
    console.error("❌ Firm search failed:", err.message);
    return res.status(500).json({ message: "Firm search failed", error: err.message });
  }
};

