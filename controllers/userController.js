const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendSignupEmail, sendLoginOtp, sendFirmConnectOtp } = require("../services/email");
const Firm = require("../models/Firm");


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

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otp || !user.otp_expiry) {
      return res.status(400).json({ message: "No OTP generated. Please login again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 🔹 Debug logs (remove in production)
    console.log("---- OTP DEBUG ----");
    console.log("Now:", new Date().toISOString(), " (epoch:", Date.now(), ")");
    console.log(
      "Expiry from DB:",
      user.otp_expiry,
      " (epoch:", new Date(user.otp_expiry).getTime(), ")"
    );
    console.log("-------------------");

    // 🔹 Safe expiry check using epoch time
    if (Date.now() > new Date(user.otp_expiry).getTime()) {
      return res.status(400).json({ message: "OTP expired. Please login again." });
    }

    // OTP valid → clear OTP fields
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
// controllers/userController.js
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
          model: require("../models/Portfolio"), // if you have one
          as: "portfolio",
          attributes: ["asset_name", "asset_symbol","quantity","profit_loss", "assigned_value"],
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

