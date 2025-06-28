// File: server.js
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = 3000;

app.use(bodyParser.json());

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
  apis: ['./server.js']
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

// Use Case 1: Create Trade Order
app.post('/api/orders', async (req, res) => {
  const { fundName, transactionType, quantity } = req.body;

  // Input validation
  if (!funds.includes(fundName)) {
    return res.status(400).json({ message: 'Invalid Security Name' });
  }
  if (!['Buy', 'Sell'].includes(transactionType)) {
    return res.status(400).json({ message: 'Invalid Transaction Type' });
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ message: 'Invalid Quantity' });
  }

  // Mock Order Value computation
  const orderValue = quantity * 100; // assuming unit price = 100
  const newOrder = {
    id: orderIdCounter++,
    fundName,
    transactionType,
    quantity,
    orderValue,
    status: 'Submitted',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);

  // Save audit action (mock)
  console.log(`AUDIT: Order ${newOrder.id} created by user.`);

  // Submit to legacy system
  try {
    const processedOrder = await processOrderLegacy(newOrder);
    processedOrder.status = 'Completed';
    return res.status(201).json(processedOrder);
  } catch (err) {
    newOrder.status = 'Failed';
    return res.status(500).json({ message: 'Legacy system error. Please try again later.' });
  }
});

// Use Case 2: View Available Funds
app.get('/api/funds', (req, res) => {
  return res.json(funds);
});

// Use Case 3: Cancel Order
app.post('/api/orders/:id/cancel', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'Submitted') return res.status(400).json({ message: 'Order cannot be cancelled' });

  order.status = 'Cancelled';
  console.log(`AUDIT: Order ${order.id} cancelled.`);
  return res.json(order);
});

// Use Case 4: View All Orders
app.get('/api/orders', (req, res) => {
  return res.json(orders);
});

app.listen(port, () => {
  console.log(`Order Entry API running at http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
