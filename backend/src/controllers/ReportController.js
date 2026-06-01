const dbManager = require('../database/database');

class ReportController {
    async getReportStats(req, res, next) {
        try {
            const db = await dbManager.getDb();
            const { period = 'semana' } = req.query;

            // Calcular rangos de fecha en base al periodo (localtime)
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            let dateFilter = '';
            let dateParams = [];
            let startDateStr = '';

            if (period === 'dia') {
                dateFilter = 'DATE(v.fecha_venta) = ?';
                dateParams = [todayStr];
            } else if (period === 'semana') {
                const weekAgo = new Date();
                weekAgo.setDate(today.getDate() - 6);
                startDateStr = weekAgo.toISOString().split('T')[0];
                dateFilter = 'DATE(v.fecha_venta) >= ?';
                dateParams = [startDateStr];
            } else if (period === 'mes') {
                startDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
                dateFilter = 'DATE(v.fecha_venta) >= ?';
                dateParams = [startDateStr];
            } else if (period === 'anio') {
                startDateStr = `${today.getFullYear()}-01-01`;
                dateFilter = 'DATE(v.fecha_venta) >= ?';
                dateParams = [startDateStr];
            } else {
                return res.status(400).json({ success: false, message: 'Periodo inválido. Use dia, semana, mes o anio.' });
            }

            // 1. Ingresos Totales (en el periodo)
            const totalSales = await db.get(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(total_usd_centavos), 0) as total_usd_centavos,
                    COALESCE(SUM(total_bs_centavos), 0) as total_bs_centavos
                FROM ventas v
                WHERE ${dateFilter} AND v.estado = 'completada'
            `, dateParams);

            const totalUsd = parseFloat((totalSales.total_usd_centavos / 100).toFixed(2));
            const totalBs = parseFloat((totalSales.total_bs_centavos / 100).toFixed(2));

            // 2. Desglose de Métodos de Pago
            const payments = await db.all(`
                SELECT 
                    p.tipo_pago,
                    p.moneda,
                    COALESCE(SUM(p.monto_centavos), 0) as total_centavos
                FROM pagos p
                JOIN ventas v ON p.venta_id = v.id
                WHERE ${dateFilter.replace(/v\./g, 'v.')} AND v.estado = 'completada'
                GROUP BY p.tipo_pago, p.moneda
            `, dateParams);

            const paymentsFormatted = payments.map(pay => ({
                tipo_pago: pay.tipo_pago,
                moneda: pay.moneda,
                monto: parseFloat((pay.total_centavos / 100).toFixed(2))
            }));

            // 3. Top 10 Productos Más Vendidos
            const topProducts = await db.all(`
                SELECT 
                    p.id as producto_id,
                    p.nombre,
                    p.codigo_barras,
                    p.stock_actual,
                    p.unidad_medida,
                    SUM(dv.cantidad) as total_cantidad,
                    SUM(dv.total_usd_centavos) as total_usd_centavos
                FROM detalle_ventas dv
                JOIN productos p ON dv.producto_id = p.id
                JOIN ventas v ON dv.venta_id = v.id
                WHERE ${dateFilter} AND v.estado = 'completada'
                GROUP BY dv.producto_id
                ORDER BY total_cantidad DESC
                LIMIT 10
            `, dateParams);

            const topProductsFormatted = topProducts.map(p => ({
                producto_id: p.producto_id,
                nombre: p.nombre,
                codigo_barras: p.codigo_barras,
                stock_actual: p.stock_actual,
                unidad_medida: p.unidad_medida,
                total_cantidad: p.total_cantidad,
                total_usd: parseFloat((p.total_usd_centavos / 100).toFixed(2))
            }));

            // 4. Top 10 Productos Menos Vendidos (incluye activos con 0 ventas)
            const lowProducts = await db.all(`
                WITH ventas_periodo AS (
                    SELECT 
                        dv.producto_id, 
                        SUM(dv.cantidad) as total_cantidad, 
                        SUM(dv.total_usd_centavos) as total_usd_centavos
                    FROM detalle_ventas dv
                    JOIN ventas v ON dv.venta_id = v.id
                    WHERE ${dateFilter} AND v.estado = 'completada'
                    GROUP BY dv.producto_id
                )
                SELECT 
                    p.id as producto_id,
                    p.nombre,
                    p.codigo_barras,
                    p.stock_actual,
                    p.unidad_medida,
                    COALESCE(vp.total_cantidad, 0) as total_cantidad,
                    COALESCE(vp.total_usd_centavos, 0) as total_usd_centavos
                FROM productos p
                LEFT JOIN ventas_periodo vp ON p.id = vp.producto_id
                WHERE p.activo = 1
                ORDER BY total_cantidad ASC, p.nombre ASC
                LIMIT 10
            `, dateParams);

            const lowProductsFormatted = lowProducts.map(p => ({
                producto_id: p.producto_id,
                nombre: p.nombre,
                codigo_barras: p.codigo_barras,
                stock_actual: p.stock_actual,
                unidad_medida: p.unidad_medida,
                total_cantidad: p.total_cantidad,
                total_usd: parseFloat((p.total_usd_centavos / 100).toFixed(2))
            }));

            // 5. Tendencia de ingresos
            let trendQuery = '';
            if (period === 'dia') {
                trendQuery = `
                    SELECT 
                        strftime('%H:00', v.fecha_venta) as punto,
                        COALESCE(SUM(v.total_usd_centavos), 0) as total_usd_centavos,
                        COUNT(*) as count
                    FROM ventas v
                    WHERE ${dateFilter} AND v.estado = 'completada'
                    GROUP BY strftime('%H:00', v.fecha_venta)
                    ORDER BY punto ASC
                `;
            } else if (period === 'semana' || period === 'mes') {
                trendQuery = `
                    SELECT 
                        DATE(v.fecha_venta) as punto,
                        COALESCE(SUM(v.total_usd_centavos), 0) as total_usd_centavos,
                        COUNT(*) as count
                    FROM ventas v
                    WHERE ${dateFilter} AND v.estado = 'completada'
                    GROUP BY DATE(v.fecha_venta)
                    ORDER BY punto ASC
                `;
            } else { // anio
                trendQuery = `
                    SELECT 
                        strftime('%Y-%m', v.fecha_venta) as punto,
                        COALESCE(SUM(v.total_usd_centavos), 0) as total_usd_centavos,
                        COUNT(*) as count
                    FROM ventas v
                    WHERE ${dateFilter} AND v.estado = 'completada'
                    GROUP BY strftime('%Y-%m', v.fecha_venta)
                    ORDER BY punto ASC
                `;
            }

            const trend = await db.all(trendQuery, dateParams);
            const trendFormatted = trend.map(t => ({
                punto: t.punto,
                ventas: parseFloat((t.total_usd_centavos / 100).toFixed(2)),
                count: t.count
            }));

            // Tasa BCV actual
            const rateObj = await db.get(
                `SELECT tasa FROM tasas_bcv ORDER BY fecha DESC LIMIT 1`
            );
            const rate = rateObj?.tasa || 0;

            res.json({
                success: true,
                data: {
                    period,
                    total_sales_count: totalSales.count,
                    total_usd: totalUsd,
                    total_bs: totalBs,
                    rate,
                    payments: paymentsFormatted,
                    top_products: topProductsFormatted,
                    low_products: lowProductsFormatted,
                    trend: trendFormatted
                }
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReportController();
