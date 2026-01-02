// models/user.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Withdrawal = require("./Withdrawal");
const Firm = require("./Firm");
const Portfolio = require("./Portfolio");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firm_id: { type: DataTypes.INTEGER, allowNull: true },

  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: true },

  // 🔐 Access key
  access_key_hash: { type: DataTypes.STRING, allowNull: false },

  // 🔐 Security question
  security_question: { type: DataTypes.STRING, allowNull: false },
  security_answer_hash: { type: DataTypes.STRING, allowNull: false },

  // 🔐 OTP (encrypted)
  otp: { type: DataTypes.TEXT, allowNull: true },
  otp_expiry: { type: DataTypes.DATE, allowNull: true },

  status: { type: DataTypes.STRING, defaultValue: "DEFAULT" },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    get() {
      const raw = this.getDataValue("balance");
      return raw ? parseFloat(raw) : 0;
    }
  },
  account_level: { type: DataTypes.STRING, defaultValue: "DEFAULT" },
  connected: { type: DataTypes.BOOLEAN, defaultValue: false },

  otp_request_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  otp_request_reset_time: { type: DataTypes.DATE },

  profile_picture: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "user",
  freezeTableName: true,
  timestamps: false
});

// Associations
User.hasMany(Withdrawal, { foreignKey: "user_id", as: "withdrawals" });
User.belongsTo(Firm, { foreignKey: "firm_id", as: "firm" });
User.hasMany(Portfolio, { foreignKey: "user_id", as: "portfolio" });

module.exports = User;
