// File: server.js
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const orderService = require('./services/orderService');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// MongoDB Setup
mongoose.connect('mongodb://localhost:27017/orderentry', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Entry API',
      version: '1.0.0',
      description: 'API documentation for Order Entry module'
    }
  },
   apis: [path.join(__dirname, 'server.js')]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mock database and legacy processor
const orders = [];
const funds = ['FundA', 'FundB', 'FundC'];
let orderIdCounter = 1;

// Helper: Simulate legacy app (1 trade at a time with 1s SLA)
const processOrderLegacy = (order) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      order.status = 'Executed';
      resolve(order);
    }, 1000);
  });
};

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a trade order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fundName:
 *                 type: string
 *               transactionType:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Legacy system error
 */
app.post('/api/orders', async (req, res) => {
  const { fundName, transactionType, quantity } = req.body;
  if (!funds.includes(fundName)) {
    return res.status(400).json({ message: 'Invalid Security Name' });
  }
  if (!['Buy', 'Sell'].includes(transactionType)) {
    return res.status(400).json({ message: 'Invalid Transaction Type' });
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ message: 'Invalid Quantity' });
  }

  try {
    const newOrder = await orderService.createOrder(fundName, transactionType, quantity);
    console.log(`AUDIT: Order ${newOrder._id} created by user.`);

    const processedOrder = await processOrderLegacy(newOrder);
    processedOrder.status = 'Completed';
    await orderService.updateOrderStatus(processedOrder._id, 'Completed');
    return res.status(201).json(processedOrder);
  } catch (err) {
    await orderService.updateOrderStatus(newOrder._id, 'Failed');
    return res.status(500).json({ message: 'Legacy system error. Please try again later.' });
  }
});

/**
 * @swagger
 * /api/funds:
 *   get:
 *     summary: View available funds
 *     responses:
 *       200:
 *         description: List of funds
 */
app.get('/api/funds', (req, res) => {
  return res.json(funds);
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order cancelled
 *       404:
 *         description: Order not found
 *       400:
 *         description: Invalid cancellation request
 */
app.post('/api/orders/:id/cancel', async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'Submitted') return res.status(400).json({ message: 'Order cannot be cancelled' });

  await orderService.updateOrderStatus(order._id, 'Cancelled');
  console.log(`AUDIT: Order ${order._id} cancelled.`);
  return res.json(order);
});


/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: View all orders
 *     responses:
 *       200:
 *         description: List of orders
 */
app.get('/api/orders', async (req, res) => {
   const allOrders = await orderService.getAllOrders();
  return res.json(allOrders);
});

app.listen(port, () => {
  console.log(`Order Entry API running at http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
