/**
 * Repositorio de Ventas (Async - sqlite3)
 */
class SaleRepository {
    constructor(db) {
        this.db = db;
    }

    async createSale(sale) {
        // Generar número de factura antes del INSERT (numero_factura es NOT NULL)
        // Incrementar el contador en configuraciones
        await this.db.run(
            "UPDATE configuraciones SET valor = CAST(CAST(valor AS INTEGER) + 1 AS TEXT) WHERE clave = 'ultimo_numero_factura'"
        );
        const counter = await this.db.get(
            "SELECT valor FROM configuraciones WHERE clave = 'ultimo_numero_factura'"
        );
        const numeroFactura = (counter ? counter.valor : '1').padStart(8, '0');

        const result = await this.db.run(`
      INSERT INTO ventas (
        numero_factura, apertura_caja_id, usuario_id, cliente_id,
        moneda_venta, tasa_bcv_usada,
        subtotal_usd_centavos, iva_usd_centavos, total_usd_centavos,
        subtotal_bs_centavos, iva_bs_centavos, total_bs_centavos,
        estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numeroFactura,
                sale.apertura_caja_id,
                sale.usuario_id,
                sale.cliente_id,
                sale.moneda_venta,
                sale.tasa_bcv_usada,
                sale.subtotal_usd_centavos,
                sale.iva_usd_centavos,
                sale.total_usd_centavos,
                sale.subtotal_bs_centavos,
                sale.iva_bs_centavos,
                sale.total_bs_centavos,
                'completada',
                sale.observaciones
            ]
        );

        const saleId = result.lastID;

        return { id: saleId, numero_factura: numeroFactura, ...sale };
    }

    async createSaleItems(saleId, items) {
        for (const item of items) {
            await this.db.run(`
        INSERT INTO detalle_ventas (
          venta_id, producto_id, cantidad,
          precio_unitario_usd_centavos, subtotal_usd_centavos, iva_usd_centavos, total_usd_centavos,
          precio_unitario_bs_centavos, subtotal_bs_centavos, iva_bs_centavos, total_bs_centavos,
          nombre_producto, tasa_iva
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    saleId,
                    item.producto_id,
                    item.cantidad,
                    item.precio_unitario_usd_centavos,
                    item.subtotal_usd_centavos,
                    item.iva_usd_centavos,
                    item.total_usd_centavos,
                    item.precio_unitario_bs_centavos,
                    item.subtotal_bs_centavos,
                    item.iva_bs_centavos,
                    item.total_bs_centavos,
                    item.nombre_producto,
                    item.tasa_iva
                ]
            );
        }
    }

    async createPayments(saleId, payments) {
        for (const payment of payments) {
            await this.db.run(`
        INSERT INTO pagos (
          venta_id, tipo_pago, moneda,
          monto_centavos, referencia
        ) VALUES (?, ?, ?, ?, ?)`,
                [
                    saleId,
                    payment.tipo_pago,
                    payment.moneda,
                    payment.monto_centavos,
                    payment.referencia
                ]
            );
        }
    }

    async findById(id) {
        const sale = await this.db.get('SELECT * FROM ventas WHERE id = ?', [id]);
        if (!sale) return null;

        const items = await this.db.all(`
      SELECT d.*, p.nombre as producto_nombre 
      FROM detalle_ventas d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.venta_id = ?`,
            [id]
        );

        const payments = await this.db.all('SELECT * FROM pagos WHERE venta_id = ?', [id]);

        return { ...sale, items, payments };
    }
}

module.exports = SaleRepository;
