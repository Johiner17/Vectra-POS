import { db } from './db.js';

const MIGRATION_KEY = 'products_migrated_v1';

/**
 * Normaliza un objeto de producto al formato almacenado en IndexedDB.
 * Mantiene los importes monetarios como centavos enteros.
 */
function normalizeProduct(raw, existing = null) {
    const now = new Date().toISOString();
    const trimmedCode = typeof raw.codigo_barras === 'string' ? raw.codigo_barras.trim() : '';

    const hasVentaUsd = raw.precio_venta_usd !== undefined && raw.precio_venta_usd !== '';
    const ventaCentavos = hasVentaUsd
        ? Math.round((parseFloat(raw.precio_venta_usd) || 0) * 100)
        : Math.round(Number(raw.precio_venta_usd_centavos ?? existing?.precio_venta_usd_centavos ?? 0));

    const hasCostoUsd = raw.precio_costo_usd !== undefined && raw.precio_costo_usd !== '';
    const costoCentavos = hasCostoUsd
        ? Math.round((parseFloat(raw.precio_costo_usd) || 0) * 100)
        : Math.round(Number(raw.precio_costo_usd_centavos ?? existing?.precio_costo_usd_centavos ?? 0));

    const normalized = {
        codigo_barras: trimmedCode || null,
        nombre: String(raw.nombre || '').trim(),
        descripcion: raw.descripcion ?? existing?.descripcion ?? null,
        categoria_id: Number(raw.categoria_id ?? existing?.categoria_id ?? 1),
        precio_venta_usd_centavos: ventaCentavos,
        precio_costo_usd_centavos: costoCentavos,
        stock_actual: Number(raw.stock_actual ?? existing?.stock_actual ?? 0),
        stock_minimo: Number(raw.stock_minimo ?? existing?.stock_minimo ?? 0),
        sin_control_stock: Boolean(raw.sin_control_stock ?? existing?.sin_control_stock ?? false),
        unidad_medida: String(raw.unidad_medida || existing?.unidad_medida || 'unidad').toLowerCase(),
        unidades_por_bulto: Number(raw.unidades_por_bulto ?? existing?.unidades_por_bulto ?? 1),
        aplica_iva: Number(raw.aplica_iva ?? existing?.aplica_iva ?? 1) ? 1 : 0,
        tasa_iva: Number(raw.tasa_iva ?? existing?.tasa_iva ?? 16),
        activo: raw.activo !== undefined ? (Number(raw.activo) ? 1 : 0) : (existing?.activo ?? 1),
        imagen: raw.imagen !== undefined ? (raw.imagen || null) : (existing?.imagen ?? null),
        created_at: raw.created_at || existing?.created_at || now,
        updated_at: now,
    };

    if (raw.id !== undefined && raw.id !== null) {
        normalized.id = Number(raw.id);
    } else if (existing?.id !== undefined) {
        normalized.id = existing.id;
    }

    return normalized;
}

/**
 * Verifica que el código de barras (si no está vacío) no esté duplicado en otro producto.
 */
async function assertUniqueBarcode(codigoBarras, excludeId = null) {
    if (!codigoBarras) return;

    const matches = await db.products
        .where('codigo_barras')
        .equals(codigoBarras)
        .toArray();

    const duplicate = matches.find(
        (p) => p.activo !== 0 && (excludeId === null || p.id !== Number(excludeId))
    );

    if (duplicate) {
        throw new Error(`El código "${codigoBarras}" ya está registrado.`);
    }
}

let seedPromise = null;

/**
 * Importa una sola vez los productos existentes del backend (si está disponible)
 * hacia IndexedDB para no perder el catálogo ya cargado en SQLite.
 */
async function ensureSeededFromBackend() {
    if (seedPromise) return seedPromise;

    seedPromise = (async () => {
        try {
            const migrated = await db.settings.get(MIGRATION_KEY);
            const currentCount = await db.products.count();

            if (migrated?.valor || currentCount > 0) {
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/products/search?q=', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return;

            const json = await response.json();
            const remoteProducts = Array.isArray(json?.data) ? json.data : [];

            if (remoteProducts.length > 0) {
                const normalized = remoteProducts.map((item) => normalizeProduct(item));
                await db.products.bulkPut(normalized);
            }

            await db.settings.put({
                clave: MIGRATION_KEY,
                valor: true,
                updated_at: new Date().toISOString(),
            });
        } catch {
            // Si el backend no está encendido o no hay red, continuamos en modo local sin fallar.
        } finally {
            seedPromise = null;
        }
    })();

    return seedPromise;
}

export const productRepository = {
    ensureSeededFromBackend,

    /**
     * Lista todos los productos activos ordenados alfabéticamente.
     */
    async getAll() {
        await ensureSeededFromBackend();
        const items = await db.products.toArray();
        return items
            .filter((p) => p.activo !== 0)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },

    /**
     * Busca productos activos por nombre o código de barras.
     */
    async search(query = '') {
        const all = await this.getAll();
        const q = String(query || '').trim().toLowerCase();
        if (!q) return all;

        return all.filter(
            (p) =>
                p.nombre.toLowerCase().includes(q) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q))
        );
    },

    /**
     * Obtiene productos con stock menor o igual al stock mínimo.
     */
    async getLowStock() {
        const all = await this.getAll();
        return all.filter((p) => !p.sin_control_stock && Number(p.stock_actual) <= Number(p.stock_minimo));
    },

    async getById(id) {
        return db.products.get(Number(id));
    },

    /**
     * Crea un nuevo producto en IndexedDB.
     */
    async create(rawData) {
        const product = normalizeProduct(rawData);
        if (!product.nombre) {
            throw new Error('El nombre del producto es obligatorio.');
        }

        await assertUniqueBarcode(product.codigo_barras, null);
        const id = await db.products.add(product);
        return db.products.get(id);
    },

    /**
     * Actualiza un producto existente en IndexedDB.
     * Si cambió stock_actual, registra automáticamente un movimiento de ajuste en Kardex.
     */
    async update(id, rawData) {
        const numericId = Number(id);
        const existing = await db.products.get(numericId);
        if (!existing) {
            throw new Error('Producto no encontrado en la base local.');
        }

        const updated = normalizeProduct({ ...existing, ...rawData, id: numericId }, existing);
        if (!updated.nombre) {
            throw new Error('El nombre del producto es obligatorio.');
        }

        await assertUniqueBarcode(updated.codigo_barras, numericId);

        await db.transaction('rw', db.products, db.inventoryMovements, async () => {
            await db.products.put(updated);

            const prevStock = Number(existing.stock_actual || 0);
            const nextStock = Number(updated.stock_actual || 0);
            if (prevStock !== nextStock) {
                await db.inventoryMovements.add({
                    producto_id: numericId,
                    tipo_movimiento: 'ajuste',
                    cantidad: nextStock - prevStock,
                    costo_unitario_usd_centavos: updated.precio_costo_usd_centavos || 0,
                    stock_anterior: prevStock,
                    stock_nuevo: nextStock,
                    observaciones: 'Ajuste desde edición de producto',
                    fecha_movimiento: new Date().toISOString(),
                });
            }
        });

        return db.products.get(numericId);
    },

    /**
     * Registra una entrada, salida o ajuste de inventario en IndexedDB y actualiza el Kardex local.
     */
    async registerStockMovement({ producto_id, type, cantidad, stock_nuevo, costo_unitario_usd, observaciones }) {
        const numericId = Number(producto_id);

        return db.transaction('rw', db.products, db.inventoryMovements, async () => {
            const existing = await db.products.get(numericId);
            if (!existing) {
                throw new Error('Producto no encontrado en la base local.');
            }

            const stockAnterior = Number(existing.stock_actual || 0);
            const now = new Date().toISOString();
            let stockNuevo = stockAnterior;
            let delta = 0;
            let costoCentavos = Number(existing.precio_costo_usd_centavos || 0);
            let nextProductCost = costoCentavos;

            if (type === 'entrada') {
                const qty = Number(cantidad);
                if (!qty || qty <= 0) {
                    throw new Error('La cantidad debe ser mayor a cero.');
                }
                stockNuevo = stockAnterior + qty;
                delta = qty;
                if (costo_unitario_usd !== undefined && costo_unitario_usd !== '' && !isNaN(Number(costo_unitario_usd))) {
                    costoCentavos = Math.round(Number(costo_unitario_usd) * 100);
                    nextProductCost = costoCentavos;
                }
            } else if (type === 'salida') {
                const qty = Number(cantidad);
                if (!qty || qty <= 0) {
                    throw new Error('La cantidad debe ser mayor a cero.');
                }
                if (stockAnterior - qty < 0) {
                    throw new Error(`Stock insuficiente. Stock actual: ${stockAnterior}, solicitado: ${qty}.`);
                }
                stockNuevo = stockAnterior - qty;
                delta = -qty;
            } else if (type === 'ajuste') {
                const target = Number(stock_nuevo);
                if (isNaN(target) || target < 0) {
                    throw new Error('El stock nuevo no puede ser negativo.');
                }
                stockNuevo = target;
                delta = target - stockAnterior;
            } else {
                throw new Error('Tipo de movimiento inválido.');
            }

            await db.products.update(numericId, {
                stock_actual: stockNuevo,
                precio_costo_usd_centavos: nextProductCost,
                updated_at: now,
            });

            const defaultNote =
                type === 'entrada'
                    ? 'Entrada de inventario'
                    : type === 'salida'
                    ? 'Salida de inventario'
                    : 'Ajuste de inventario';

            const movId = await db.inventoryMovements.add({
                producto_id: numericId,
                tipo_movimiento: type,
                cantidad: delta,
                costo_unitario_usd_centavos: costoCentavos,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                observaciones: String(observaciones || '').trim() || defaultNote,
                fecha_movimiento: now,
            });

            return db.inventoryMovements.get(movId);
        });
    },

    /**
     * Obtiene el historial de movimientos (Kardex) de un producto desde IndexedDB,
     * con respaldo de lectura al backend si no hay movimientos locales aún.
     */
    async getKardex(productoId) {
        const numericId = Number(productoId);
        const localMovements = await db.inventoryMovements
            .where('producto_id')
            .equals(numericId)
            .toArray();

        if (localMovements.length > 0) {
            return localMovements.sort(
                (a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento)
            );
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return [];

            const response = await fetch(`/api/inventory/kardex/${numericId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return [];

            const json = await response.json();
            return Array.isArray(json?.data?.movimientos) ? json.data.movimientos : [];
        } catch {
            return [];
        }
    },

    /**
     * Descuenta o suma stock localmente (por ejemplo tras una venta o ajuste).
     */
    async adjustStock(id, delta) {
        const numericId = Number(id);
        const existing = await db.products.get(numericId);
        if (!existing) return null;

        const nextStock = Math.max(0, Number(existing.stock_actual || 0) + Number(delta || 0));
        await db.products.update(numericId, {
            stock_actual: nextStock,
            updated_at: new Date().toISOString(),
        });
        return nextStock;
    },

    /**
     * Sincroniza un producto puntual desde el backend hacia Dexie (útil durante transición).
     */
    async syncOneFromBackend(id) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await fetch(`/api/products/${Number(id)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return null;

            const json = await response.json();
            if (!json?.data) return null;

            const normalized = normalizeProduct(json.data);
            await db.products.put(normalized);
            return normalized;
        } catch {
            return null;
        }
    },
};

export default productRepository;

