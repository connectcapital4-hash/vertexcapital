const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const News = sequelize.define(
  "News",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: "image_url",   // 👈 map to DB column
    },
    link: {
      type: DataTypes.STRING,
    },
    publishedBy: {
      type: DataTypes.UUID,
      field: "published_by", // 👈 map to DB column
    },
  },
  {
    tableName: "news",   // 👈 match lowercase DB table
    timestamps: false,     // ❌ don’t auto-manage timestamps
    underscored: true,   // auto-map camelCase ↔ snake_case
  }
);

module.exports = News;
