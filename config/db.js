// backend/config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const DATABASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL_INTERNAL
    : process.env.DATABASE_URL; // use external locally

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false, // set true to see SQL queries
  dialectOptions: {
    ssl: process.env.NODE_ENV === "production"
      ? false // internal connection on Render
      : { require: true, rejectUnauthorized: false }, // external URL SSL
  },
});

sequelize.authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL via Sequelize"))
  .catch((err) => console.error("❌ Sequelize connection error:", err.message));

module.exports = sequelize;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j