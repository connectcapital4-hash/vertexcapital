// middleware/authUser.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ✅ lowercase import

exports.authUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔑 Debug log to confirm token payload (only in dev)
    if (process.env.NODE_ENV !== "production") {
      console.log("🔑 Decoded user token:", decoded);
    }

    // ✅ Ensure token contains an id (critical for withdrawals)
    if (!decoded.id) {
      return res.status(401).json({ message: "Invalid token payload: missing user id" });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = user; // attach full user object
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j
