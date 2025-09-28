const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PortfolioWithdrawal = sequelize.define(
  "PortfolioWithdrawal",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {  // Changed from userId
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    portfolio_id: {  // Changed from portfolioId
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    asset_type: {  // Changed from assetType
      type: DataTypes.STRING,
      allowNull: false,
    },
    asset_symbol: {  // Changed from assetSymbol
      type: DataTypes.STRING,
      allowNull: false,
    },
    asset_name: {  // Changed from assetName
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity_sold: {  // Changed from quantitySold
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    sale_price: {  // Changed from salePrice
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_amount: {  // Changed from totalAmount
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    sale_type: {  // Changed from saleType
      type: DataTypes.ENUM("QUANTITY", "PERCENTAGE"),
      allowNull: false,
    },
    original_quantity: {  // Changed from originalQuantity
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    remaining_quantity: {  // Changed from remainingQuantity
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
      defaultValue: "COMPLETED",
    },
    created_at: {  // Changed from createdAt
      type: DataTypes.DATE,
    },
    updated_at: {  // Changed from updatedAt
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "portfolio_withdrawals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = PortfolioWithdrawal;