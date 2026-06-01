const express = require('express');
const router = express.Router();

const ProductController = require('../controllers/ProductController');
const SaleController = require('../controllers/SaleController');
const CurrencyController = require('../controllers/CurrencyController');
const InventoryController = require('../controllers/InventoryController');
const CajaController = require('../controllers/CajaController');
const DashboardController = require('../controllers/DashboardController');
const ReportController = require('../controllers/ReportController');
const AuthController = require('../controllers/AuthController');
const ConfigController = require('../controllers/ConfigController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

// Health Check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Auth - Login (público)
router.post('/auth/login', AuthController.login);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================
router.use(authMiddleware);

// --- Auth (autenticado) ---
router.get('/auth/profile', AuthController.getProfile);
router.put('/auth/password', AuthController.changePassword);

// --- Usuarios (solo admin) ---
router.get('/users', roleMiddleware('admin', 'supervisor'), AuthController.listUsers);
router.post('/users', roleMiddleware('admin'), AuthController.createUser);
router.put('/users/:id/toggle', roleMiddleware('admin'), AuthController.toggleUser);
router.put('/users/:id/reset-password', roleMiddleware('admin'), AuthController.resetPassword);

// --- Configuración ---
router.get('/config', ConfigController.getConfig);
router.get('/config/all', roleMiddleware('admin'), ConfigController.getAllConfig);
router.get('/config/:key', ConfigController.getByKey);
router.put('/config', roleMiddleware('admin'), ConfigController.updateConfig);
router.put('/config/:key', roleMiddleware('admin'), ConfigController.updateByKey);

// --- Productos ---
router.get('/products/search', ProductController.search);
router.get('/products/low-stock', InventoryController.getLowStock);
router.get('/products/:id', ProductController.getById);
router.post('/products', roleMiddleware('admin', 'supervisor'), ProductController.create);
router.put('/products/:id', roleMiddleware('admin', 'supervisor'), ProductController.update);

// --- Inventario ---
router.get('/inventory/kardex/:id', InventoryController.getKardex);
router.post('/inventory/movement', roleMiddleware('admin', 'supervisor'), InventoryController.registerMovement);

// --- Ventas ---
router.post('/sales', SaleController.processSale);
router.get('/sales', SaleController.getRecent);
router.get('/sales/:id', SaleController.getById);

// --- Caja ---
router.get('/caja/session', CajaController.getOrOpenSession);
router.post('/caja/close', CajaController.closeSession);
router.get('/caja/:apertura_id/summary', CajaController.getSalesSummary);

// --- Dashboard ---
router.get('/dashboard/stats', DashboardController.getStats);

// --- Reportes ---
router.get('/reports/stats', ReportController.getReportStats);

// --- Categorías ---
router.get('/categories', async (req, res, next) => {
    try {
        const dbManager = require('../database/database');
        const db = await dbManager.getDb();
        const cats = await db.all('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: cats });
    } catch (e) { next(e); }
});

router.post('/categories', roleMiddleware('admin'), async (req, res, next) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
        }
        const dbManager = require('../database/database');
        const db = await dbManager.getDb();
        const result = await db.run(
            'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion || null]
        );
        res.status(201).json({ success: true, data: { id: result.lastID, nombre, descripcion } });
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, message: 'Ya existe una categoría con ese nombre' });
        }
        next(e);
    }
});

// --- Moneda ---
router.get('/currency/rate', CurrencyController.getLatestRate);
router.post('/currency/rate', roleMiddleware('admin', 'supervisor'), CurrencyController.registerRate);
router.post('/currency/sync', roleMiddleware('admin'), CurrencyController.syncNow);
router.get('/currency/history', CurrencyController.getHistory);

module.exports = router;
