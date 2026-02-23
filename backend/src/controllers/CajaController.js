const dbManager = require('../database/database');

class CajaController {
    /**
     * Obtiene la apertura de caja activa o crea una automáticamente.
     * Esto simplifica el flujo para que el cajero no tenga que abrir la caja manualmente.
     */
    async getOrOpenSession(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const usuarioId = req.user.id;

            // Buscar apertura activa
            let apertura = await db.get(
                `SELECT * FROM aperturas_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1`
            );

            if (!apertura) {
                // Auto-abrir la caja 1 (principal) si no hay ninguna abierta
                const result = await db.run(
                    `INSERT INTO aperturas_caja (caja_id, usuario_id, monto_apertura_usd_centavos, monto_apertura_bs_centavos, estado)
                     VALUES (1, ?, 0, 0, 'abierta')`,
                    [usuarioId]
                );
                apertura = await db.get('SELECT * FROM aperturas_caja WHERE id = ?', [result.lastID]);
            }

            res.json({ success: true, data: apertura });
        } catch (error) {
            next(error);
        }
    }

    async closeSession(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const { apertura_caja_id, monto_cierre_usd, monto_cierre_bs } = req.body;

            await db.run(
                `UPDATE aperturas_caja 
                 SET estado = 'cerrada', fecha_cierre = datetime('now','localtime'),
                     monto_cierre_usd_centavos = ?, monto_cierre_bs_centavos = ?
                 WHERE id = ?`,
                [
                    Math.round((monto_cierre_usd || 0) * 100),
                    Math.round((monto_cierre_bs || 0) * 100),
                    apertura_caja_id
                ]
            );

            res.json({ success: true, message: 'Caja cerrada correctamente' });
        } catch (error) {
            next(error);
        }
    }

    async getSalesSummary(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const { apertura_id } = req.params;

            const summary = await db.get(
                `SELECT 
                    COUNT(*) as total_ventas,
                    SUM(total_usd_centavos) as total_usd_centavos,
                    SUM(total_bs_centavos) as total_bs_centavos
                 FROM ventas 
                 WHERE apertura_caja_id = ? AND estado = 'completada'`,
                [apertura_id]
            );

            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CajaController();
