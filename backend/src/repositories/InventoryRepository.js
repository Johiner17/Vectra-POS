/**
 * Repositorio de Inventario (Async - sqlite3)
 */
class InventoryRepository {
    constructor(db) {
        this.db = db;
    }

    async createMovement(data) {
        const sql = `
      INSERT INTO movimientos_inventario (
        producto_id, tipo_movimiento, cantidad,
        costo_unitario_usd_centavos, stock_anterior, stock_nuevo,
        costo_promedio_anterior_centavos, costo_promedio_nuevo_centavos,
        venta_id, usuario_id, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await this.db.run(sql, [
            data.producto_id,
            data.tipo_movimiento,
            data.cantidad,
            data.costo_unitario_usd_centavos,
            data.stock_anterior,
            data.stock_nuevo,
            data.costo_promedio_anterior_centavos,
            data.costo_promedio_nuevo_centavos,
            data.venta_id || null,
            data.usuario_id,
            data.observaciones
        ]);

        return { id: result.lastID, ...data };
    }

    async getLastAverageCost(productoId) {
        const lastMovement = await this.db.get(
            `SELECT costo_promedio_nuevo_centavos 
       FROM movimientos_inventario 
       WHERE producto_id = ? 
       ORDER BY id DESC LIMIT 1`,
            [productoId]
        );

        return lastMovement ? lastMovement.costo_promedio_nuevo_centavos : null;
    }

    async getKardex(productoId, filters = {}) {
        let sql = 'SELECT * FROM movimientos_inventario WHERE producto_id = ?';
        const params = [productoId];

        if (filters.fecha_inicio) {
            sql += ' AND fecha_movimiento >= ?';
            params.push(filters.fecha_inicio);
        }

        if (filters.fecha_fin) {
            sql += ' AND fecha_movimiento <= ?';
            params.push(filters.fecha_fin);
        }

        sql += ' ORDER BY id DESC LIMIT 100';

        return await this.db.all(sql, params);
    }

    // Helper para cálculo en memoria (no BD)
    calculateWeightedAverageCost(stockActual, costPromedioActual, cantidadEntrada, costoEntrada) {
        const valorActual = stockActual * costPromedioActual;
        const valorEntrada = cantidadEntrada * costoEntrada;
        const nuevoStock = stockActual + cantidadEntrada;

        if (nuevoStock <= 0) return costPromedioActual; // Evitar división por cero

        return Math.round((valorActual + valorEntrada) / nuevoStock);
    }
}

module.exports = InventoryRepository;
