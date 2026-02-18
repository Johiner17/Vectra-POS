const SaleRepository = require('../repositories/SaleRepository');
const ProductRepository = require('../repositories/ProductRepository');
const InventoryService = require('./InventoryService');
const CurrencyUtils = require('../utils/currencyUtils');
const dbManager = require('../database/database');

/**
 * Servicio de Ventas (Async)
 */
class SaleService {
    constructor() {
        this.inventoryService = new InventoryService();
    }

    async processSale(data) {
        if (!data.items || data.items.length === 0) {
            throw new Error('La venta debe tener al menos un item');
        }

        return await dbManager.transaction(async (db) => {
            const saleRepo = new SaleRepository(db);
            const productRepo = new ProductRepository(db);

            // 1. Validar Stock e Items
            let subtotalUsdCentavos = 0;
            let ivaUsdCentavos = 0;
            let totalUsdCentavos = 0;

            const itemsProcessed = [];

            for (const item of data.items) {
                const producto = await productRepo.findById(item.producto_id);
                if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado`);

                // Validar stock (aunque InventoryService lo vuelve a chequear, es bueno fail-fast)
                if (producto.stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${producto.nombre}`);
                }

                const precioUnitarioUsdCentavos = producto.precio_venta_usd_centavos;
                const subtotalItem = precioUnitarioUsdCentavos * item.cantidad;

                let ivaItem = 0;
                if (producto.aplica_iva) {
                    ivaItem = CurrencyUtils.calcularIva(subtotalItem, producto.tasa_iva);
                }

                const totalItem = subtotalItem + ivaItem;

                // Acumular totales globales
                subtotalUsdCentavos += subtotalItem;
                ivaUsdCentavos += ivaItem;
                totalUsdCentavos += totalItem;

                // Crear objeto item para guardar
                itemsProcessed.push({
                    producto_id: producto.id,
                    cantidad: item.cantidad,
                    precio_unitario_usd_centavos: precioUnitarioUsdCentavos,
                    subtotal_usd_centavos: subtotalItem,
                    iva_usd_centavos: ivaItem,
                    total_usd_centavos: totalItem,
                    nombre_producto: producto.nombre,
                    tasa_iva: producto.tasa_iva,
                    // Convertir a BS
                    precio_unitario_bs_centavos: CurrencyUtils.convertUsdToBs(precioUnitarioUsdCentavos, data.tasa_bcv_usada),
                    subtotal_bs_centavos: CurrencyUtils.convertUsdToBs(subtotalItem, data.tasa_bcv_usada),
                    iva_bs_centavos: CurrencyUtils.convertUsdToBs(ivaItem, data.tasa_bcv_usada),
                    total_bs_centavos: CurrencyUtils.convertUsdToBs(totalItem, data.tasa_bcv_usada)
                });
            }

            // 2. Calcular totales en BS globales
            const subtotalBsCentavos = CurrencyUtils.convertUsdToBs(subtotalUsdCentavos, data.tasa_bcv_usada);
            const ivaBsCentavos = CurrencyUtils.convertUsdToBs(ivaUsdCentavos, data.tasa_bcv_usada);
            const totalBsCentavos = CurrencyUtils.convertUsdToBs(totalUsdCentavos, data.tasa_bcv_usada);

            // 3. Crear Venta
            const sale = await saleRepo.createSale({
                apertura_caja_id: data.apertura_caja_id,
                usuario_id: data.usuario_id,
                cliente_id: data.cliente_id,
                moneda_venta: data.moneda_venta,
                tasa_bcv_usada: data.tasa_bcv_usada,
                subtotal_usd_centavos: subtotalUsdCentavos,
                iva_usd_centavos: ivaUsdCentavos,
                total_usd_centavos: totalUsdCentavos,
                subtotal_bs_centavos: subtotalBsCentavos,
                iva_bs_centavos: ivaBsCentavos,
                total_bs_centavos: totalBsCentavos,
                observaciones: data.observaciones
            });

            // 4. Crear Detalle Items
            await saleRepo.createSaleItems(sale.id, itemsProcessed);

            // 5. Crear Pagos
            if (data.pagos && data.pagos.length > 0) {
                const processedPayments = data.pagos.map(p => ({
                    ...p,
                    tasa_cambio: data.tasa_bcv_usada
                }));
                await saleRepo.createPayments(sale.id, processedPayments);
            }

            // 6. Actualizar Inventario (usando la misma transacción)
            for (const item of itemsProcessed) {
                await this.inventoryService.registerSaleMovement({
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    venta_id: sale.id,
                    numero_factura: sale.numero_factura,
                    usuario_id: data.usuario_id
                }, db);
            }

            return sale;
        });
    }

    async getSale(id) {
        const db = await dbManager.getDb();
        const saleRepo = new SaleRepository(db);
        return await saleRepo.findById(id);
    }
}

module.exports = SaleService;
