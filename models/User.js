// models/user.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Withdrawal = require("./Withdrawal");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firm_id: { type: DataTypes.INTEGER, allowNull: true }, // allow null until connected
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: true }, // ✅ FIXED (allow null)
  status: {
    type: DataTypes.ENUM("DEFAULT", "STANDARD", "PREMIUM", "LIFETIME", "SUSPENDED"),
    defaultValue: "DEFAULT",
  },
  balance: { 
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    get() {
      const rawValue = this.getDataValue("balance");
      return rawValue === null ? 0 : parseFloat(rawValue);
    }
  },
  account_level: { type: DataTypes.STRING, defaultValue: "DEFAULT" },
  connected: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp: { type: DataTypes.STRING, allowNull: true },
  otp_expiry: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "user",
  freezeTableName: true,
  timestamps: false
});

// In your User model or association file
User.hasMany(Withdrawal, { foreignKey: "user_id", as: "withdrawals" });
Withdrawal.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = User;
