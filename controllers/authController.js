const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { generateToken } = require("../utils/jwt");

// Register new admin (only SUPERADMIN should be able to do this)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password_hash: hashed,
      role: role || "ADMIN",  // ✅ fallback to ADMIN
    });

    res.json({ message: "Admin created successfully", admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(admin);
    res.json({ message: "Login successful", token, admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j