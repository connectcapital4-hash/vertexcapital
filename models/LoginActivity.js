const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const LoginActivity = sequelize.define("LoginActivity", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  login_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  ip_address: { type: DataTypes.STRING },
  user_agent: { type: DataTypes.TEXT },
}, {
  tableName: "login_activity",
  freezeTableName: true,
  timestamps: false,
});

// Associations (optional but helpful for admin query)
LoginActivity.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = LoginActivity;
