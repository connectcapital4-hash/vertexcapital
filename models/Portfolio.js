// models/Portfolio.js - Updated to match your DB
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Portfolio = sequelize.define(
  "Portfolio",
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
    assetName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "asset_name",
    },
    assetSymbol: {
      type: DataTypes.STRING,
      field: "asset_symbol",
    },
    assetType: {
      type: DataTypes.ENUM("STOCK", "CRYPTO"),
      allowNull: false,
      field: "asset_type",
    },
    stake: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    quantity: { 
      type: DataTypes.FLOAT,
      field: "quantity",
    },
    purchasePrice: {
      type: DataTypes.FLOAT,
      field: "purchase_price",
    },
    currentValue: {
      type: DataTypes.FLOAT,
      field: "current_value",
    },
    profitLoss: {
      type: DataTypes.FLOAT,
      field: "profit_loss",
    },
    assignedValue: {
      type: DataTypes.FLOAT,
      field: "assigned_value",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      field: "last_updated",
    },
  },
  {
    tableName: "portfolio",
    timestamps: false,
  }
);

module.exports = Portfolio;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j