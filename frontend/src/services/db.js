import Dexie from 'dexie';

/**
 * Base de datos local de Vectra POS.
 *
 * Los datos viven en el navegador/dispositivo donde se instala la PWA.
 * No se sincronizan automáticamente con otros dispositivos.
 *
 * Los importes monetarios se guardan en centavos enteros.
 * Cada venta conserva su propia tasa_bcv_usada para no recalcular
 * operaciones históricas cuando cambie la tasa vigente.
 */
export const db = new Dexie('VectraPOS');

db.version(1).stores({
    products: '++id, &codigo_barras, nombre, activo',
    exchangeRates: '++id, &fecha, fuente',
    sales: '++id, &numero_factura, fecha_venta, estado, tasa_bcv_usada',
    saleItems: '++id, venta_id, producto_id, nombre_producto',
    payments: '++id, venta_id, tipo_pago, moneda',
    settings: '&clave'
});

// v2: Permite productos sin código de barras (null/vacío) sin ConstraintError en IndexedDB;
// la unicidad de códigos no vacíos se valida en productRepository.
db.version(2).stores({
    products: '++id, codigo_barras, nombre, activo',
    exchangeRates: '++id, &fecha, fuente',
    sales: '++id, &numero_factura, fecha_venta, estado, tasa_bcv_usada',
    saleItems: '++id, venta_id, producto_id, nombre_producto',
    payments: '++id, venta_id, tipo_pago, moneda',
    settings: '&clave'
});

// v3: Tabla local de movimientos de inventario (Kardex)
db.version(3).stores({
    products: '++id, codigo_barras, nombre, activo',
    exchangeRates: '++id, &fecha, fuente',
    sales: '++id, &numero_factura, fecha_venta, estado, tasa_bcv_usada',
    saleItems: '++id, venta_id, producto_id, nombre_producto',
    payments: '++id, venta_id, tipo_pago, moneda',
    settings: '&clave',
    inventoryMovements: '++id, producto_id, tipo_movimiento, fecha_movimiento'
});

export default db;
