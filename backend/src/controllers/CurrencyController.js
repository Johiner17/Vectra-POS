const CurrencyService = require('../services/CurrencyService');
const bcvSyncService = require('../services/BcvSyncService');
const dbManager = require('../database/database');

const currencyService = new CurrencyService();

class CurrencyController {
    async getLatestRate(req, res, next) {
        try {
            const db = await dbManager.getDb();

            // Obtener el registro completo más reciente (no solo la tasa)
            const record = await db.get(
                `SELECT tasa, fecha, fuente, created_at FROM tasas_bcv ORDER BY fecha DESC, id DESC LIMIT 1`
            );

            const syncStatus = bcvSyncService.getStatus();

            res.json({
                success: true,
                data: {
                    tasa: record?.tasa || 0,
                    fecha: record?.fecha || null,
                    fuente: record?.fuente || 'Manual',
                    sync: {
                        lastStatus: syncStatus.lastStatus,
                        lastAttempt: syncStatus.lastAttempt,
                        lastSuccess: syncStatus.lastSuccess,
                        isSyncing: syncStatus.isSyncing
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Fuerza una sincronización manual con el BCV (requiere internet)
     */
    async syncNow(req, res, next) {
        try {
            if (bcvSyncService.isSyncing) {
                return res.json({ success: false, message: 'Ya hay una sincronización en proceso' });
            }

            // Ejecutar sync en background y responder inmediatamente
            bcvSyncService.sync().then(() => {
                console.log('Sincronización manual completada');
            });

            res.json({ success: true, message: 'Sincronización iniciada...' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Actualización manual de la tasa (sin internet)
     */
    async registerRate(req, res, next) {
        try {
            const { tasa } = req.body;
            if (!tasa || isNaN(tasa) || tasa <= 0) {
                return res.status(400).json({ error: 'Tasa inválida' });
            }

            const db = await dbManager.getDb();
            const today = new Date().toISOString().split('T')[0];

            const existing = await db.get('SELECT id FROM tasas_bcv WHERE fecha = ?', [today]);
            if (existing) {
                await db.run(
                    'UPDATE tasas_bcv SET tasa = ?, fuente = ? WHERE fecha = ?',
                    [parseFloat(tasa), 'Manual', today]
                );
            } else {
                await db.run(
                    'INSERT INTO tasas_bcv (fecha, tasa, fuente) VALUES (?, ?, ?)',
                    [today, parseFloat(tasa), 'Manual']
                );
            }

            res.json({ success: true, message: 'Tasa actualizada manualmente', data: { tasa: parseFloat(tasa), fecha: today, fuente: 'Manual' } });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const history = await db.all(
                `SELECT fecha, tasa, fuente, created_at FROM tasas_bcv ORDER BY fecha DESC LIMIT 30`
            );
            res.json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CurrencyController();
