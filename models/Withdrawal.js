// models/Withdrawal.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Withdrawal = sequelize.define(
  "Withdrawal",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "COMPLETED"),
      defaultValue: "PENDING",
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    walletAddress: {
      type: DataTypes.STRING,
      field: "wallet_address",
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "withdrawal",
    timestamps: false,
  }
);

module.exports = Withdrawal;