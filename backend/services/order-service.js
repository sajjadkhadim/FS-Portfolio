// File: services/orderService.js
const mongoose = require('mongoose');
// File: services/orderService.js
const Order = require('../models/order');

// Define Order Schema
const orderSchema = new mongoose.Schema({
  fundName: { type: String, required: true },
  transactionType: { type: String, enum: ['Buy', 'Sell'], required: true },
  quantity: { type: Number, required: true },
  orderValue: { type: Number, required: true },
  status: { type: String, enum: ['Submitted', 'Cancelled', 'Executed', 'Completed', 'Failed'], default: 'Submitted' },
  createdAt: { type: Date, default: Date.now }
});

// Compile Model
const Order = mongoose.model('Order', orderSchema);

// Create a new order
async function createOrder(fundName, transactionType, quantity) {
  const orderValue = quantity * 100; // Assuming fixed price of 100/unit for simplicity
  const order = new Order({ fundName, transactionType, quantity, orderValue });
  return await order.save();
}

// Update order status
async function updateOrderStatus(id, status) {
  return await Order.findByIdAndUpdate(id, { status }, { new: true });
}

// Get order by ID
async function getOrderById(id) {
  return await Order.findById(id);
}

// Get all orders
async function getAllOrders() {
  return await Order.find().sort({ createdAt: -1 });
}

module.exports = {
  createOrder,
  updateOrderStatus,
  getOrderById,
  getAllOrders
};
