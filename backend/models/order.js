// File: models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  fundName: { type: String, required: true },
  transactionType: { type: String, enum: ['Buy', 'Sell'], required: true },
  quantity: { type: Number, required: true },
  orderValue: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Submitted', 'Cancelled', 'Executed', 'Completed', 'Failed'],
    default: 'Submitted'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
