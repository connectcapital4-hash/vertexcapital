const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const axios = require("axios");

const User = require("../models/User");
const Firm = require("../models/Firm");
const LoginActivity = require("../models/LoginActivity");

require("dotenv").config();

const FINNHUB_API = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

/* ===========================
   🔐 CRYPTO HELPERS
=========================== */

const generateAccessKey = () =>
  crypto.randomBytes(7).toString("hex").toUpperCase().slice(0, 13);

const encryptOtp = (otp, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    crypto.createHash("sha256").update(key).digest(),
    iv
  );
  let encrypted = cipher.update(otp, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decryptOtp = (payload, key) => {
  const [ivHex, encrypted] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    crypto.createHash("sha256").update(key).digest(),
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  return decrypted + decipher.final("utf8");
};

/* ===========================
   🟢 REGISTER
=========================== */

exports.register = async (req, res) => {
  try {
    const { name, email, password, security_question, security_answer } = req.body;

    if (!security_question || !security_answer)
      return res.status(400).json({ message: "Security question & answer required" });

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const accessKey = generateAccessKey();

    await User.create({
      name,
      email,
      password_hash: await bcrypt.hash(password, 10),
      access_key_hash: await bcrypt.hash(accessKey, 10),
      security_question,
      security_answer_hash: await bcrypt.hash(security_answer, 10),
      connected: false,
      profile_picture: null,
    });

    return res.json({
      message: "Registration successful. SAVE THIS ACCESS KEY.",
      access_key: accessKey
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

/* ===========================
   🟢 LOGIN (STEP 1)
=========================== */

exports.login = async (req, res) => {
  try {
    const { email, password, access_key } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.password_hash) {
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(400).json({ message: "Invalid password" });
    }

    if (!(await bcrypt.compare(access_key, user.access_key_hash)))
      return res.status(400).json({ message: "Invalid access key" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = encryptOtp(otp, access_key);
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    res.json({ message: "OTP generated. Unlock with your access key." });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

/* ===========================
   🟢 VERIFY OTP
=========================== */

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, access_key } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.otp) return res.status(400).json({ message: "Invalid request" });

    if (Date.now() > new Date(user.otp_expiry).getTime())
      return res.status(400).json({ message: "OTP expired" });

    const decryptedOtp = decryptOtp(user.otp, access_key);
    if (decryptedOtp !== otp)
      return res.status(400).json({ message: "Invalid OTP or access key" });

    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const clientIp = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : req.ip;

    await LoginActivity.create({
      user_id: user.id,
      ip_address: clientIp,
      user_agent: req.headers["user-agent"] || null,
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed", error: err.message });
  }
};

/* ===========================
   🔑 RESET PASSWORD
=========================== */

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, access_key, newPassword } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const decryptedOtp = decryptOtp(user.otp, access_key);
    if (decryptedOtp !== otp)
      return res.status(400).json({ message: "Invalid OTP or access key" });

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed", error: err.message });
  }
};

/* ===========================
   🔄 REGENERATE ACCESS KEY
=========================== */

exports.regenerateAccessKey = async (req, res) => {
  try {
    const { email, security_answer } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const ok = await bcrypt.compare(security_answer, user.security_answer_hash);
    if (!ok) return res.status(400).json({ message: "Incorrect answer" });

    const newKey = generateAccessKey();
    user.access_key_hash = await bcrypt.hash(newKey, 10);
    await user.save();

    res.json({ message: "New access key generated", access_key: newKey });
  } catch (err) {
    res.status(500).json({ message: "Failed to regenerate key", error: err.message });
  }
};

/* ===========================
   🔍 SEARCH FIRMS
=========================== */

exports.searchFirms = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2)
      return res.status(400).json({ message: "Search query too short" });

    const local = await Firm.findAll({
      where: { name: { [Op.iLike]: `%${q}%` } },
      attributes: ["id", "name", "description", "profile_picture"]
    });

    let results = [...local];

    if (results.length < 5) {
      const apiRes = await axios.get(`${FINNHUB_API}/search?q=${q}&token=${API_KEY}`);
      const matches = apiRes.data.result || [];

      const stocks = await Promise.all(
        matches.slice(0, 5).map(async m => {
          try {
            const profile = await axios.get(
              `${FINNHUB_API}/stock/profile2?symbol=${m.symbol}&token=${API_KEY}`
            );
            return {
              id: null,
              name: profile.data.name,
              description: profile.data.finnhubIndustry || "",
              profile_picture: profile.data.logo,
              source: "stock"
            };
          } catch {
            return null;
          }
        })
      );

      results = results.concat(stocks.filter(Boolean));
    }

    res.json({ firms: results });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

/* ===========================
   📰 NEWS
=========================== */

exports.getNews = async (req, res) => {
  try {
    const News = require("../models/news");
    const news = await News.findAll({ order: [["created_at", "DESC"]] });
    res.json({ news });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch news", error: err.message });
  }
};

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
          model: Firm,
          as: "firm",
          attributes: ["id", "name", "description", "profile_picture"],
        },
      ],
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};

exports.updateProfilePicture = async (req, res) => {
  try {
    if (req.file && req.file.path) {
      req.user.profile_picture = req.file.path;
    } else if (req.body.profile_picture) {
      req.user.profile_picture = req.body.profile_picture;
    } else {
      return res.status(400).json({ message: "No profile picture provided" });
    }

    await req.user.save();

    res.json({
      message: "Profile picture updated",
      profile_picture: req.user.profile_picture,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update profile picture",
      error: err.message,
    });
  }
};
