const SaleService = require('../services/SaleService');
const CurrencyService = require('../services/CurrencyService');
const dbManager = require('../database/database');

const saleService = new SaleService();
const currencyService = new CurrencyService();

class SaleController {
    async processSale(req, res, next) {
        try {
            const data = { ...req.body };

            // Extraer usuario del token JWT (siempre disponible tras authMiddleware)
            data.usuario_id = req.user.id;

            // Obtener tasa BCV actual si no viene en el request
            if (!data.tasa_bcv_usada) {
                data.tasa_bcv_usada = await currencyService.getLatestRate();
            }

            // Obtener o crear apertura de caja automáticamente
            if (!data.apertura_caja_id) {
                const db = await dbManager.getDb();
                let apertura = await db.get(
                    `SELECT id FROM aperturas_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1`
                );
                if (!apertura) {
                    // Auto-crear apertura si no existe
                    const result = await db.run(
                        `INSERT INTO aperturas_caja (caja_id, usuario_id, monto_apertura_usd_centavos, monto_apertura_bs_centavos, estado)
                         VALUES (1, ?, 0, 0, 'abierta')`,
                        [data.usuario_id]
                    );
                    apertura = { id: result.lastID };
                }
                data.apertura_caja_id = apertura.id;
            }

            // Establecer moneda por defecto
            if (!data.moneda_venta) data.moneda_venta = 'USD';

            // Procesar venta
            const sale = await saleService.processSale(data);

            res.json({
                success: true,
                message: 'Venta procesada correctamente',
                data: sale
            });
        } catch (error) {
            console.error('Error procesando venta:', error);
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const sale = await saleService.getSale(req.params.id);
            if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
            res.json({ success: true, data: sale });
        } catch (error) {
            next(error);
        }
    }

    async getRecent(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const limit = parseInt(req.query.limit) || 20;
            const sales = await db.all(
                `SELECT v.*, u.username 
                 FROM ventas v
                 LEFT JOIN usuarios u ON v.usuario_id = u.id
                 ORDER BY v.fecha_venta DESC LIMIT ?`,
                [limit]
            );
            res.json({ success: true, data: sales });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SaleController();
