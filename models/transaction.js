// models/Transaction.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Transaction = sequelize.define(
  "transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id", // maps to DB column
    },
    type: {
      type: DataTypes.ENUM("CREDIT", "PROFIT", "DEBIT", "WITHDRAW"),
      allowNull: false,
    },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    description: { type: DataTypes.TEXT },
    meta: { type: DataTypes.JSONB },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
  },
  {
    tableName: "transaction", // ✅ match exact DB table name
    timestamps: false,        // DB doesn’t have updated_at
  }
);

module.exports = Transaction;
