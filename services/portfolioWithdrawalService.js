const { Op } = require("sequelize");
const sequelize = require("../config/db");
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Transaction = require("../models/transaction");
const PortfolioWithdrawal = require("../models/PortfolioWithdrawal");
const cryptoService = require("./cryptoService");
const stockService = require("./stockService");

const toFloat = (v) => parseFloat(v || 0);

exports.withdrawPortfolioAsset = async (userId, withdrawalData) => {
  const t = await sequelize.transaction();
  try {
    const { portfolioId, saleType, amount } = withdrawalData;

    const portfolio = await Portfolio.findByPk(portfolioId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!portfolio || Number(portfolio.user_id || portfolio.userId) !== Number(userId)) {
      throw new Error("Portfolio not found or access denied");
    }

    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new Error("User not found");

    const portfolioQuantity = toFloat(portfolio.quantity);
    if (portfolioQuantity <= 0) throw new Error("No available quantity in portfolio");

    let quantityToSell = 0;
    if (saleType === "QUANTITY") {
      quantityToSell = toFloat(amount);
      if (quantityToSell <= 0) throw new Error("Quantity to sell must be > 0");
      if (quantityToSell > portfolioQuantity) throw new Error("Insufficient quantity to sell");
    } else if (saleType === "PERCENTAGE") {
      const percent = toFloat(amount);
      if (percent <= 0 || percent > 100) throw new Error("Invalid percentage");
      quantityToSell = (portfolioQuantity * percent) / 100;
      quantityToSell = parseFloat(quantityToSell.toFixed(8));
      if (quantityToSell <= 0) throw new Error("Percentage results in zero quantity");
    } else {
      throw new Error("Invalid sale type");
    }

    let currentPrice = 0;
    if (String(portfolio.assetType).toUpperCase() === "CRYPTO") {
      const priceData = await cryptoService.getPrice(portfolio.assetSymbol);
      currentPrice = toFloat(priceData?.usd);
    } else if (String(portfolio.assetType).toUpperCase() === "STOCK") {
      const quoteData = await stockService.getQuote(portfolio.assetSymbol, process.env.FINNHUB_API_KEY);
      currentPrice = toFloat(quoteData?.c);
    }
    if (!currentPrice || currentPrice <= 0) throw new Error("Unable to fetch current market price");

    const saleValue = parseFloat((quantityToSell * currentPrice).toFixed(8));
    const remainingQuantity = parseFloat((portfolioQuantity - quantityToSell).toFixed(8));
    const originalQuantity = portfolioQuantity;

    const newCurrentValue = parseFloat((remainingQuantity * currentPrice).toFixed(8));
    const purchasePrice = toFloat(portfolio.purchasePrice);
    const totalInvestment = parseFloat((portfolioQuantity * purchasePrice).toFixed(8));
    const remainingInvestment = portfolioQuantity > 0
      ? parseFloat((remainingQuantity / portfolioQuantity * totalInvestment).toFixed(8))
      : 0;
    const newProfitLoss = parseFloat((newCurrentValue - remainingInvestment).toFixed(8));

    const prevSold = toFloat(portfolio.sold_quantity || 0);
    const newSoldQuantity = parseFloat((prevSold + quantityToSell).toFixed(8));

    await portfolio.update({
      quantity: remainingQuantity,
      currentValue: newCurrentValue,
      profitLoss: newProfitLoss,
      lastUpdated: new Date(),
      sold_quantity: newSoldQuantity
    }, { transaction: t });

    const prevBalance = toFloat(user.balance);
    const newBalance = parseFloat((prevBalance + saleValue).toFixed(8));
    await user.update({ balance: newBalance }, { transaction: t });

    const withdrawal = await PortfolioWithdrawal.create({
      user_id: userId,
      portfolio_id: portfolioId,
      asset_type: portfolio.assetType,
      asset_symbol: portfolio.assetSymbol,
      asset_name: portfolio.assetName,
      quantity_sold: quantityToSell,
      sale_price: currentPrice,
      total_amount: saleValue,
      sale_type: saleType,
      original_quantity: originalQuantity,
      remaining_quantity: remainingQuantity,
      status: "COMPLETED"
    }, { transaction: t });

    await Transaction.create({
      user_id: userId,
      type: "PORTFOLIO_WITHDRAWAL",
      amount: saleValue,
      description: `Sold ${quantityToSell} ${portfolio.assetSymbol} from portfolio`,
      meta: {
        portfolioId,
        assetSymbol: portfolio.assetSymbol,
        assetType: portfolio.assetType,
        quantitySold: quantityToSell,
        salePrice: currentPrice,
        saleType,
        withdrawalId: withdrawal.id
      },
      created_at: new Date()
    }, { transaction: t });

    await t.commit();

    return {
      success: true,
      withdrawal: withdrawal.toJSON(),
      saleValue,
      quantitySold: quantityToSell,
      remainingQuantity,
      newBalance
    };
  } catch (err) {
    if (t) await t.rollback();
    console.error("Portfolio withdrawal error:", err);
    throw err;
  }
};

exports.getWithdrawalHistory = async (userId, limit = 50) => {
  try {
    const rows = await PortfolioWithdrawal.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit
    });
    return rows;
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    throw error;
  }
};

exports.getAvailablePortfolio = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({
      where: {
        user_id: userId,
        quantity: { [Op.gt]: 0 }
      },
      attributes: [
        "id",
        "asset_name",
        "asset_symbol",
        "asset_type",
        "quantity",
        "current_value",
        "purchase_price",
        "profit_loss",
        "sold_quantity"
      ]
    });

    return portfolios.map(p => {
      const q = toFloat(p.quantity);
      return {
        id: p.id,
        assetName: p.asset_name,
        assetSymbol: p.asset_symbol,
        assetType: p.asset_type,
        availableQuantity: q,
        currentValue: toFloat(p.current_value),
        purchasePrice: toFloat(p.purchase_price),
        profitLoss: toFloat(p.profit_loss),
        currentPrice: q > 0 ? parseFloat((toFloat(p.current_value) / q).toFixed(8)) : 0
      };
    });
  } catch (error) {
    console.error("Error fetching available portfolio:", error);
    throw error;
  }
};
