const { Sequelize } = require("sequelize");
require("dotenv").config();

// Always use external URL for Render
const DATABASE_URL = process.env.DATABASE_URL;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false, // set true for debugging SQL
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // required for Neon external SSL
    },
  },
});

sequelize.authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL via Sequelize"))
  .catch((err) => console.error("❌ Sequelize connection error:", err.message));

module.exports = sequelize;
