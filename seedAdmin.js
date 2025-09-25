require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("./config/db");
const Admin = require("./models/Admin");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    await Admin.sync({ alter: false }); // just map, no drop

    const existing = await Admin.findOne({
      where: { email: "superadmin@capitalconnect.com" },
    });

    if (existing) {
      console.log("✅ Superadmin already exists:", existing.email);
    } else {
      const hashed = await bcrypt.hash("StrongPassword123!", 10);
      const admin = await Admin.create({
        name: "System Super Admin",
        email: "superadmin@capitalconnect.com",
        password_hash: hashed,
        role: "SUPERADMIN",  // ✅ SUPERADMIN
      });

      console.log("🎉 Superadmin created successfully!");
      console.log("Login email:", admin.email);
      console.log("Password: StrongPassword123!");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding superadmin:", err);
    process.exit(1);
  }
})();
