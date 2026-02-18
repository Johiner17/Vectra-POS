const ProductRepository = require('../repositories/ProductRepository');
const InventoryRepository = require('../repositories/InventoryRepository');
const CurrencyUtils = require('../utils/currencyUtils');
const dbManager = require('../database/database');

/**
 * Servicio de gestión de inventario con Kardex (Async)
 */
class InventoryService {
    /**
     * Registra una entrada de inventario
     */
    async registerEntry(data) {
        if (!data.producto_id || !data.cantidad || !data.usuario_id) {
            throw new Error('Producto, cantidad y usuario son requeridos');
        }

        if (data.cantidad <= 0) {
            throw new Error('La cantidad debe ser mayor a cero');
        }

        return await dbManager.transaction(async (db) => {
            const productRepo = new ProductRepository(db);
            const inventoryRepo = new InventoryRepository(db);

            const producto = await productRepo.findById(data.producto_id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            const stockAnterior = producto.stock_actual;
            const stockNuevo = stockAnterior + data.cantidad;

            const lastCost = await inventoryRepo.getLastAverageCost(data.producto_id);
            const costoPromedioAnterior = lastCost || producto.precio_costo_usd_centavos;

            const costoEntrada = data.costo_unitario_usd ?
                CurrencyUtils.toCentavos(data.costo_unitario_usd) :
                producto.precio_costo_usd_centavos;

            const costoPromedioNuevo = inventoryRepo.calculateWeightedAverageCost(
                stockAnterior,
                costoPromedioAnterior,
                data.cantidad,
                costoEntrada
            );

            const movimiento = await inventoryRepo.createMovement({
                producto_id: data.producto_id,
                tipo_movimiento: 'entrada',
                cantidad: data.cantidad,
                costo_unitario_usd_centavos: costoEntrada,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                costo_promedio_anterior_centavos: costoPromedioAnterior,
                costo_promedio_nuevo_centavos: costoPromedioNuevo,
                usuario_id: data.usuario_id,
                observaciones: data.observaciones || 'Entrada de inventario'
            });

            await productRepo.updateStock(data.producto_id, stockNuevo);

            await productRepo.update(data.producto_id, {
                precio_costo_usd_centavos: costoPromedioNuevo
            });

            return movimiento;
        });
    }

    /**
     * Registra una salida de inventario
     */
    async registerExit(data) {
        if (!data.producto_id || !data.cantidad || !data.usuario_id) {
            throw new Error('Producto, cantidad y usuario son requeridos');
        }

        if (data.cantidad <= 0) {
            throw new Error('La cantidad debe ser mayor a cero');
        }

        return await dbManager.transaction(async (db) => {
            const productRepo = new ProductRepository(db);
            const inventoryRepo = new InventoryRepository(db);

            const producto = await productRepo.findById(data.producto_id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            const stockAnterior = producto.stock_actual;
            const stockNuevo = stockAnterior - data.cantidad;

            if (stockNuevo < 0) {
                throw new Error(`Stock insuficiente. Stock actual: ${stockAnterior}, solicitado: ${data.cantidad}`);
            }

            const lastCost = await inventoryRepo.getLastAverageCost(data.producto_id);
            const costoPromedio = lastCost || producto.precio_costo_usd_centavos;

            const movimiento = await inventoryRepo.createMovement({
                producto_id: data.producto_id,
                tipo_movimiento: 'salida',
                cantidad: -data.cantidad,
                costo_unitario_usd_centavos: costoPromedio,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                costo_promedio_anterior_centavos: costoPromedio,
                costo_promedio_nuevo_centavos: costoPromedio,
                usuario_id: data.usuario_id,
                observaciones: data.observaciones || 'Salida de inventario'
            });

            await productRepo.updateStock(data.producto_id, stockNuevo);

            return movimiento;
        });
    }

    /**
     * Registra un ajuste de inventario
     */
    async registerAdjustment(data) {
        if (!data.producto_id || data.stock_nuevo === undefined || !data.usuario_id) {
            throw new Error('Producto, stock nuevo y usuario son requeridos');
        }

        if (data.stock_nuevo < 0) {
            throw new Error('El stock no puede ser negativo');
        }

        return await dbManager.transaction(async (db) => {
            const productRepo = new ProductRepository(db);
            const inventoryRepo = new InventoryRepository(db);

            const producto = await productRepo.findById(data.producto_id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            const stockAnterior = producto.stock_actual;
            const diferencia = data.stock_nuevo - stockAnterior;

            const lastCost = await inventoryRepo.getLastAverageCost(data.producto_id);
            const costoPromedio = lastCost || producto.precio_costo_usd_centavos;

            const movimiento = await inventoryRepo.createMovement({
                producto_id: data.producto_id,
                tipo_movimiento: 'ajuste',
                cantidad: diferencia,
                costo_unitario_usd_centavos: costoPromedio,
                stock_anterior: stockAnterior,
                stock_nuevo: data.stock_nuevo,
                costo_promedio_anterior_centavos: costoPromedio,
                costo_promedio_nuevo_centavos: costoPromedio,
                usuario_id: data.usuario_id,
                observaciones: data.observaciones || `Ajuste de inventario. Diferencia: ${diferencia}`
            });

            await productRepo.updateStock(data.producto_id, data.stock_nuevo);

            return movimiento;
        });
    }

    /**
     * Registra una salida por venta (soporta transacción externa)
     */
    async registerSaleMovement(data, transactionDb = null) {
        const operation = async (db) => {
            const productRepo = new ProductRepository(db);
            const inventoryRepo = new InventoryRepository(db);

            const producto = await productRepo.findById(data.producto_id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            const stockAnterior = producto.stock_actual;
            const stockNuevo = stockAnterior - data.cantidad;

            if (stockNuevo < 0) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockAnterior}, solicitado: ${data.cantidad}`);
            }

            const lastCost = await inventoryRepo.getLastAverageCost(data.producto_id);
            const costoPromedio = lastCost || producto.precio_costo_usd_centavos;

            const movimiento = await inventoryRepo.createMovement({
                producto_id: data.producto_id,
                tipo_movimiento: 'venta',
                cantidad: -data.cantidad,
                costo_unitario_usd_centavos: costoPromedio,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                costo_promedio_anterior_centavos: costoPromedio,
                costo_promedio_nuevo_centavos: costoPromedio,
                venta_id: data.venta_id,
                usuario_id: data.usuario_id,
                observaciones: `Venta #${data.numero_factura || data.venta_id}`
            });

            await productRepo.updateStock(data.producto_id, stockNuevo);

            return movimiento;
        };

        if (transactionDb) {
            return await operation(transactionDb);
        } else {
            return await dbManager.transaction(operation);
        }
    }

    /**
     * Obtiene el Kardex de un producto
     */
    async getKardex(productoId, filters = {}) {
        // Para lectura no necesitamos transacción, pero sí conexión
        const db = await dbManager.getDb();
        const productRepo = new ProductRepository(db);
        const inventoryRepo = new InventoryRepository(db);

        const producto = await productRepo.findById(productoId);
        if (!producto) {
            throw new Error('Producto no encontrado');
        }

        const movimientos = await inventoryRepo.getKardex(productoId, filters);

        return {
            producto: {
                id: producto.id,
                nombre: producto.nombre,
                codigo_barras: producto.codigo_barras,
                stock_actual: producto.stock_actual,
                stock_minimo: producto.stock_minimo,
                costo_promedio: CurrencyUtils.fromCentavos(producto.precio_costo_usd_centavos)
            },
            movimientos: movimientos.map(m => ({
                ...m,
                costo_unitario_usd: CurrencyUtils.fromCentavos(m.costo_unitario_usd_centavos),
                costo_promedio_anterior: CurrencyUtils.fromCentavos(m.costo_promedio_anterior_centavos),
                costo_promedio_nuevo: CurrencyUtils.fromCentavos(m.costo_promedio_nuevo_centavos)
            }))
        };
    }

    async getLowStockProducts() {
        const db = await dbManager.getDb();
        const productRepo = new ProductRepository(db);
        return await productRepo.getLowStockProducts();
    }

    async validateStockAvailability(items) {
        const db = await dbManager.getDb();
        const productRepo = new ProductRepository(db);

        const errors = [];
        const warnings = [];

        for (const item of items) {
            const producto = await productRepo.findById(item.producto_id);
            if (!producto) {
                errors.push(`Producto ID ${item.producto_id} no encontrado`);
                continue;
            }

            if (producto.stock_actual < item.cantidad) {
                errors.push(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}, solicitado: ${item.cantidad}`);
            }

            if (producto.stock_actual - item.cantidad <= producto.stock_minimo) {
                warnings.push(`${producto.nombre} quedará por debajo del stock mínimo después de esta venta`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = InventoryService;
