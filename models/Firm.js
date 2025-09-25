// models/Firm.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Admin = require("./Admin");

const Firm = sequelize.define("Firm", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  admin_id: {
    type: DataTypes.INTEGER,   // ✅ FK is INTEGER now
    references: {
      model: "admin",          // ✅ points to "admin" table
      key: "id",
    },
  },
  profile_picture: {
    type: DataTypes.TEXT,
  },
  crypto_btc_address: {
    type: DataTypes.STRING,
    field: "crypto_btc_address",
  },
  crypto_eth_address: {
    type: DataTypes.STRING,
    field: "crypto_eth_address",
  },
  crypto_usdt_address: {
    type: DataTypes.STRING,
    field: "crypto_usdt_address",
  },
}, {
  tableName: "firm",
  freezeTableName: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

// ✅ Associations
Firm.belongsTo(Admin, { foreignKey: "admin_id", as: "admin" });
Admin.hasMany(Firm, { foreignKey: "admin_id", as: "firms" });

module.exports = Firm;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j