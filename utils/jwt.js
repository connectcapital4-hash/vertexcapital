const jwt = require("jsonwebtoken");

exports.generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j