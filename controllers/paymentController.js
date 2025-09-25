// controllers/paymentController.js
const Payment = require("../models/Payment");
const User = require("../models/User");
const Firm = require("../models/Firm");
const cryptoService = require("../services/cryptoService");

// Get payment addresses for a user's firm
exports.getPaymentAddresses = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.firm_id) {
      return res.status(404).json({ error: "User not associated with any firm" });
    }
    
    const firm = await Firm.findByPk(user.firm_id);
    if (!firm) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    res.json({
      BTC: firm.crypto_btc_address,
      ETH: firm.crypto_eth_address,
      USDT: firm.crypto_usdt_address,
      message: "Copy any address above to make payment from your wallet"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Manual payment confirmation (admin confirms after user makes payment)
exports.confirmPayment = async (req, res) => {
  try {
    const { userId, cryptoType, amount, transactionHash } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const firm = await Firm.findByPk(user.firm_id);
    if (!firm) {
      return res.status(404).json({ error: "Firm not found" });
    }
    
    // Get current crypto price for USD conversion
    let usdValue;
    try {
      const priceData = await cryptoService.getPrice(
        cryptoType === 'USDT' ? 'tether' : cryptoType.toLowerCase()
      );
      const coinKey = cryptoType === 'USDT' ? 'tether' : cryptoType.toLowerCase();
      usdValue = amount * (priceData[coinKey]?.usd || 1);
    } catch (error) {
      usdValue = amount; // Fallback 1:1 if price fetch fails
    }
    
    // Create payment record
    const payment = await Payment.create({
      userId: user.id,
      cryptoType,
      amount,
      usdValue,
      walletAddress: firm[`crypto_${cryptoType.toLowerCase()}_address`],
      transactionHash,
      status: "COMPLETED",
      createdAt: new Date()
    });
    
    // Credit user's account
    user.balance = parseFloat(user.balance || 0) + usdValue;
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      userId: user.id,
      type: "DEPOSIT",
      amount: usdValue,
      description: `Crypto deposit: ${amount} ${cryptoType}`,
      meta: {
        cryptoType,
        cryptoAmount: amount,
        transactionHash,
        paymentId: payment.id
      },
      created_at: new Date()
    });
    
    res.json({ 
      message: "Payment confirmed successfully",
      creditedAmount: usdValue,
      paymentId: payment.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']]
    });
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j