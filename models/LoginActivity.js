const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const LoginActivity = sequelize.define(
  "LoginActivity",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    login_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    // ✅ Explicitly set length to 45 to support IPv4 & IPv6
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "login_activity",
    freezeTableName: true,
    timestamps: false,
  }
);

// ✅ Associations (keep for admin queries)
LoginActivity.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = LoginActivity;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j