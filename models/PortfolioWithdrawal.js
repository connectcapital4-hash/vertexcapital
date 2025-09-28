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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    portfolioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "portfolio_id",
    },
    assetType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "asset_type",
    },
    assetSymbol: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "asset_symbol",
    },
    assetName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "asset_name",
    },
    quantitySold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "quantity_sold",
    },
    salePrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "sale_price",
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "total_amount",
    },
    saleType: {
      type: DataTypes.ENUM("QUANTITY", "PERCENTAGE"),
      allowNull: false,
      field: "sale_type",
    },
    originalQuantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "original_quantity",
    },
    remainingQuantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "remaining_quantity",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
      defaultValue: "COMPLETED",
      field: "status",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
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
