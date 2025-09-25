// models/Payment.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define(
  "Payment",
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
    cryptoType: {
      type: DataTypes.ENUM("BTC", "ETH", "USDT"),
      allowNull: false,
      field: "crypto_type",
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    usdValue: {
      type: DataTypes.FLOAT,
      field: "usd_value",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
      defaultValue: "PENDING",
    },
    transactionHash: {
      type: DataTypes.STRING,
      field: "transaction_hash",
    },
    walletAddress: {
      type: DataTypes.STRING,
      field: "wallet_address",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
  },
  {
    tableName: "payment",
    timestamps: false,
  }
);

module.exports = Payment;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j