const dbManager = require('../database/database');

class DashboardController {
    async getStats(req, res, next) {
        try {
            const db = await dbManager.getDb();

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 6);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];

            // Ventas de hoy
            const todaySales = await db.get(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(total_usd_centavos), 0) as total_usd_centavos,
                    COALESCE(SUM(total_bs_centavos), 0) as total_bs_centavos
                FROM ventas
                WHERE DATE(fecha_venta) = ? AND estado = 'completada'
            `, [todayStr]);

            // Ventas por día (últimos 7 días) para el gráfico
            const weekSales = await db.all(`
                SELECT 
                    DATE(fecha_venta) as fecha,
                    COUNT(*) as count,
                    COALESCE(SUM(total_usd_centavos), 0) as total_usd_centavos
                FROM ventas
                WHERE DATE(fecha_venta) >= ? AND estado = 'completada'
                GROUP BY DATE(fecha_venta)
                ORDER BY fecha ASC
            `, [weekAgoStr]);

            // Llenar días sin ventas con 0
            const weekData = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const found = weekSales.find(r => r.fecha === ds);
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                weekData.push({
                    fecha: ds,
                    name: dayNames[d.getDay()],
                    ventas: found ? parseFloat((found.total_usd_centavos / 100).toFixed(2)) : 0,
                    count: found ? found.count : 0
                });
            }

            // Total productos activos
            const productsCount = await db.get(
                `SELECT COUNT(*) as count FROM productos WHERE activo = 1`
            );

            // Productos con stock bajo
            const lowStock = await db.get(
                `SELECT COUNT(*) as count FROM productos WHERE activo = 1 AND stock_actual <= stock_minimo AND stock_minimo > 0`
            );

            // Tasa BCV actual
            const rate = await db.get(
                `SELECT tasa FROM tasas_bcv ORDER BY fecha DESC LIMIT 1`
            );

            // Top productos más vendidos (últimos 7 días)
            const topProducts = await db.all(`
                SELECT 
                    p.nombre,
                    SUM(dv.cantidad) as total_vendido,
                    SUM(dv.total_usd_centavos) as total_usd_centavos
                FROM detalle_ventas dv
                JOIN productos p ON dv.producto_id = p.id
                JOIN ventas v ON dv.venta_id = v.id
                WHERE DATE(v.fecha_venta) >= ? AND v.estado = 'completada'
                GROUP BY dv.producto_id
                ORDER BY total_vendido DESC
                LIMIT 5
            `, [weekAgoStr]);

            // Últimas ventas
            const recentSales = await db.all(`
                SELECT v.id, v.numero_factura, v.total_usd_centavos, v.total_bs_centavos,
                       v.fecha_venta, v.moneda_venta, u.username as cajero
                FROM ventas v
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.estado = 'completada'
                ORDER BY v.fecha_venta DESC
                LIMIT 8
            `);

            res.json({
                success: true,
                data: {
                    today: {
                        count: todaySales.count,
                        total_usd: parseFloat((todaySales.total_usd_centavos / 100).toFixed(2)),
                        total_bs: parseFloat((todaySales.total_bs_centavos / 100).toFixed(2))
                    },
                    week: weekData,
                    products: {
                        total: productsCount.count,
                        low_stock: lowStock.count
                    },
                    rate: rate?.tasa || 0,
                    top_products: topProducts.map(p => ({
                        nombre: p.nombre,
                        total_vendido: p.total_vendido,
                        total_usd: parseFloat((p.total_usd_centavos / 100).toFixed(2))
                    })),
                    recent_sales: recentSales.map(s => ({
                        id: s.id,
                        numero_factura: s.numero_factura,
                        total_usd: parseFloat((s.total_usd_centavos / 100).toFixed(2)),
                        total_bs: parseFloat((s.total_bs_centavos / 100).toFixed(2)),
                        fecha_venta: s.fecha_venta,
                        moneda_venta: s.moneda_venta,
                        cajero: s.cajero
                    }))
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();
