// controllers/publicAdminNewsController.js
const News = require("../models/news");

/**
 * PUBLIC: Fetch all admin news
 * No authentication
 * Read-only
 */
exports.getPublicAdminNews = async (req, res) => {
  try {
    const news = await News.findAll({
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "title",
        "body",
        "image_url",
        "link",
        "published_by",
        "created_at"
      ]
    });

    res.status(200).json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    console.error("❌ Failed to fetch public admin news:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin news",
      error: error.message
    });
  }
};
