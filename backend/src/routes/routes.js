const express = require('express');
const router = express.Router();

const ProductController = require('../controllers/ProductController');
const SaleController = require('../controllers/SaleController');
const CurrencyController = require('../controllers/CurrencyController');
const InventoryController = require('../controllers/InventoryController');
const CajaController = require('../controllers/CajaController');
const DashboardController = require('../controllers/DashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const config = require('../config/config');

// Health Check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Auth (Login mock)
router.post('/auth/login', (req, res) => {
    const jwt = require('jsonwebtoken');
    // Usar el mismo secret que authMiddleware (config.security.jwtSecret)
    const token = jwt.sign(
        { id: 1, username: req.body.username, rol: 'admin' },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn }
    );
    res.json({ success: true, token });
});

// Rutas protegidas
router.use(authMiddleware);

// Productos
router.get('/products/search', ProductController.search);
router.get('/products/low-stock', InventoryController.getLowStock);
router.get('/products/:id', ProductController.getById);
router.post('/products', ProductController.create); // Admin only recommended
router.put('/products/:id', ProductController.update); // Admin only recommended

// Inventario
router.get('/inventory/kardex/:id', InventoryController.getKardex);
router.post('/inventory/movement', InventoryController.registerMovement);

// Ventas
router.post('/sales', SaleController.processSale);
router.get('/sales', SaleController.getRecent);
router.get('/sales/:id', SaleController.getById);

// Caja
router.get('/caja/session', CajaController.getOrOpenSession);
router.post('/caja/close', CajaController.closeSession);
router.get('/caja/:apertura_id/summary', CajaController.getSalesSummary);

// Dashboard
router.get('/dashboard/stats', DashboardController.getStats);

// Categorias
router.get('/categories', async (req, res, next) => {
    try {
        const dbManager = require('../database/database');
        const db = await dbManager.getDb();
        const cats = await db.all('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: cats });
    } catch (e) { next(e); }
});

// Moneda
router.get('/currency/rate', CurrencyController.getLatestRate);
router.post('/currency/rate', CurrencyController.registerRate);
router.post('/currency/sync', CurrencyController.syncNow);
router.get('/currency/history', CurrencyController.getHistory);

module.exports = router;
