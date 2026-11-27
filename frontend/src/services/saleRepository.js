import { db } from './db.js';
import { currencyRepository } from './currencyRepository.js';

const INVOICE_COUNTER_KEY = 'ultimo_numero_factura';
const SALES_MIGRATION_KEY = 'sales_migrated_v1';

/**
 * Devuelve YYYY-MM-DD en hora local para evitar desfases después de las 8pm UTC-4.
 */
function toLocalDateKey(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toLocalHourKey(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '00:00';
    return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function toLocalMonthKey(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convierte centavos USD a centavos Bs usando la tasa BCV proporcionada.
 */
function convertUsdCentavosToBsCentavos(usdCentavos, tasaBcv) {
    return Math.round(Number(usdCentavos || 0) * Number(tasaBcv || 0));
}

let seedSalesPromise = null;

async function ensureSeededFromBackend() {
    if (seedSalesPromise) return seedSalesPromise;

    seedSalesPromise = (async () => {
        try {
            const migrated = await db.settings.get(SALES_MIGRATION_KEY);
            const count = await db.sales.count();
            if (migrated?.valor || count > 0) return;

            const token = localStorage.getItem('token');
            if (!token) return;

            const listRes = await fetch('/api/sales?limit=50&offset=0', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!listRes.ok) return;

            const listJson = await listRes.json();
            const remoteSales = Array.isArray(listJson?.data) ? listJson.data : [];

            let maxSeq = 0;
            for (const summary of remoteSales) {
                if (!summary?.numero_factura) continue;
                const seqNum = parseInt(summary.numero_factura, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;

                const detailRes = await fetch(`/api/sales/${summary.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => null);
                const detailJson = detailRes && detailRes.ok ? await detailRes.json() : null;
                const full = detailJson?.data || summary;

                const existing = await db.sales
                    .where('numero_factura')
                    .equals(String(full.numero_factura))
                    .first();
                if (existing) continue;

                const saleId = await db.sales.add({
                    numero_factura: String(full.numero_factura),
                    fecha_venta: full.fecha_venta || new Date().toISOString(),
                    moneda_venta: full.moneda_venta || 'USD',
                    tasa_bcv_usada: Number(full.tasa_bcv_usada || 0),
                    subtotal_usd_centavos: Number(full.subtotal_usd_centavos || 0),
                    iva_usd_centavos: Number(full.iva_usd_centavos || 0),
                    total_usd_centavos: Number(full.total_usd_centavos || 0),
                    subtotal_bs_centavos: Number(full.subtotal_bs_centavos || 0),
                    iva_bs_centavos: Number(full.iva_bs_centavos || 0),
                    total_bs_centavos: Number(full.total_bs_centavos || 0),
                    estado: full.estado || 'completada',
                    cajero: full.cajero || full.username || 'Local',
                    observaciones: full.observaciones || null,
                });

                if (Array.isArray(full.items) && full.items.length > 0) {
                    await db.saleItems.bulkAdd(
                        full.items.map((item) => ({
                            venta_id: saleId,
                            producto_id: Number(item.producto_id),
                            cantidad: Number(item.cantidad || 0),
                            precio_unitario_usd_centavos: Number(item.precio_unitario_usd_centavos || 0),
                            subtotal_usd_centavos: Number(item.subtotal_usd_centavos || 0),
                            iva_usd_centavos: Number(item.iva_usd_centavos || 0),
                            total_usd_centavos: Number(item.total_usd_centavos || 0),
                            precio_unitario_bs_centavos: Number(item.precio_unitario_bs_centavos || 0),
                            subtotal_bs_centavos: Number(item.subtotal_bs_centavos || 0),
                            iva_bs_centavos: Number(item.iva_bs_centavos || 0),
                            total_bs_centavos: Number(item.total_bs_centavos || 0),
                            nombre_producto: item.nombre_producto || item.producto_nombre || 'Producto',
                            tasa_iva: Number(item.tasa_iva ?? 16),
                        }))
                    );
                }

                if (Array.isArray(full.payments) && full.payments.length > 0) {
                    await db.payments.bulkAdd(
                        full.payments.map((p) => ({
                            venta_id: saleId,
                            tipo_pago: p.tipo_pago,
                            moneda: p.moneda,
                            monto_centavos: Number(p.monto_centavos || 0),
                            tasa_cambio: Number(p.tasa_cambio || full.tasa_bcv_usada || 0),
                            referencia: p.referencia || null,
                        }))
                    );
                }
            }

            if (maxSeq > 0) {
                const currentCounter = await db.settings.get(INVOICE_COUNTER_KEY);
                const currentVal = Number(currentCounter?.valor || 0);
                if (maxSeq > currentVal) {
                    await db.settings.put({
                        clave: INVOICE_COUNTER_KEY,
                        valor: maxSeq,
                        updated_at: new Date().toISOString(),
                    });
                }
            }

            await db.settings.put({
                clave: SALES_MIGRATION_KEY,
                valor: true,
                updated_at: new Date().toISOString(),
            });
        } catch {
            // Si el backend no responde o no hay red, continuamos en modo local.
        } finally {
            seedSalesPromise = null;
        }
    })();

    return seedSalesPromise;
}

export const saleRepository = {
    /**
     * Registra una venta completa de manera atómica en IndexedDB:
     * - Valida stock disponible
     * - Congela la tasa BCV usada en la venta
     * - Guarda venta, detalle de ítems y pagos (simples o mixtos)
     * - Descuenta stock y registra salida en Kardex (inventoryMovements)
     */
    async processSale({ items, moneda_venta = 'USD', pagos = [], tasa_bcv_usada, observaciones = null }) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('La venta debe tener al menos un producto.');
        }

        let tasaBcv = Number(tasa_bcv_usada || 0);
        if (!tasaBcv || tasaBcv <= 0) {
            const latestRate = await currencyRepository.getLatestRate();
            tasaBcv = Number(latestRate?.tasa || 0);
        }

        const usesBs = moneda_venta === 'BS' || pagos.some((p) => p.moneda === 'BS');
        if (usesBs && tasaBcv <= 0) {
            throw new Error('Debes configurar una tasa BCV válida antes de cobrar en bolívares.');
        }

        return db.transaction(
            'rw',
            db.products,
            db.sales,
            db.saleItems,
            db.payments,
            db.inventoryMovements,
            db.settings,
            async () => {
                let subtotalUsdCentavos = 0;
                let ivaUsdCentavos = 0;
                let totalUsdCentavos = 0;

                const itemsProcessed = [];
                const productUpdates = [];

                for (const rawItem of items) {
                    const productoId = Number(rawItem.producto_id ?? rawItem.id);
                    const cantidad = Number(rawItem.cantidad ?? rawItem.quantity ?? 0);

                    if (!productoId || cantidad <= 0) {
                        throw new Error('Cantidad inválida en el carrito.');
                    }

                    const producto = await db.products.get(productoId);
                    if (!producto) {
                        throw new Error(`Producto #${productoId} no encontrado en la base local.`);
                    }

                    const sinControlStock = Boolean(producto.sin_control_stock);
                    const stockActual = Number(producto.stock_actual || 0);
                    if (!sinControlStock && stockActual < cantidad) {
                        throw new Error(`Stock insuficiente para ${producto.nombre} (disponible: ${stockActual}).`);
                    }

                    const precioUnitarioUsdCentavos = Number(producto.precio_venta_usd_centavos || 0);
                    const subtotalItem = Math.round(precioUnitarioUsdCentavos * cantidad);

                    let ivaItem = 0;
                    const tasaIva = Number(producto.tasa_iva ?? 16);
                    if (producto.aplica_iva) {
                        ivaItem = Math.round(subtotalItem * (tasaIva / 100));
                    }

                    const totalItem = subtotalItem + ivaItem;

                    subtotalUsdCentavos += subtotalItem;
                    ivaUsdCentavos += ivaItem;
                    totalUsdCentavos += totalItem;

                    itemsProcessed.push({
                        producto_id: producto.id,
                        cantidad,
                        precio_unitario_usd_centavos: precioUnitarioUsdCentavos,
                        subtotal_usd_centavos: subtotalItem,
                        iva_usd_centavos: ivaItem,
                        total_usd_centavos: totalItem,
                        nombre_producto: producto.nombre,
                        tasa_iva: tasaIva,
                        precio_unitario_bs_centavos: convertUsdCentavosToBsCentavos(precioUnitarioUsdCentavos, tasaBcv),
                        subtotal_bs_centavos: convertUsdCentavosToBsCentavos(subtotalItem, tasaBcv),
                        iva_bs_centavos: convertUsdCentavosToBsCentavos(ivaItem, tasaBcv),
                        total_bs_centavos: convertUsdCentavosToBsCentavos(totalItem, tasaBcv),
                    });

                    if (!sinControlStock) {
                        productUpdates.push({
                            producto,
                            cantidad,
                            stockAnterior: stockActual,
                            stockNuevo: stockActual - cantidad,
                        });
                    }
                }

                const subtotalBsCentavos = convertUsdCentavosToBsCentavos(subtotalUsdCentavos, tasaBcv);
                const ivaBsCentavos = convertUsdCentavosToBsCentavos(ivaUsdCentavos, tasaBcv);
                const totalBsCentavos = convertUsdCentavosToBsCentavos(totalUsdCentavos, tasaBcv);

                // Validar cobertura de pagos
                if (Array.isArray(pagos) && pagos.length > 0) {
                    let paidUsdCentavos = 0;
                    for (const p of pagos) {
                        const amountCentavos = Number(p.monto_centavos || 0);
                        if (p.moneda === 'BS') {
                            paidUsdCentavos += tasaBcv > 0 ? amountCentavos / tasaBcv : 0;
                        } else {
                            paidUsdCentavos += amountCentavos;
                        }
                    }
                    // Tolerancia de 2 centavos por redondeos de conversión Bs <-> USD
                    if (paidUsdCentavos + 2 < totalUsdCentavos) {
                        throw new Error('El monto pagado no cubre el total de la venta.');
                    }
                }

                // Generar número de factura secuencial único
                const counterSetting = await db.settings.get(INVOICE_COUNTER_KEY);
                let nextSeq = Number(counterSetting?.valor || 0) + 1;
                let numeroFactura = String(nextSeq).padStart(8, '0');
                while (await db.sales.where('numero_factura').equals(numeroFactura).first()) {
                    nextSeq += 1;
                    numeroFactura = String(nextSeq).padStart(8, '0');
                }

                const now = new Date().toISOString();
                await db.settings.put({
                    clave: INVOICE_COUNTER_KEY,
                    valor: nextSeq,
                    updated_at: now,
                });

                const saleRecord = {
                    numero_factura: numeroFactura,
                    fecha_venta: now,
                    moneda_venta,
                    tasa_bcv_usada: tasaBcv,
                    subtotal_usd_centavos: subtotalUsdCentavos,
                    iva_usd_centavos: ivaUsdCentavos,
                    total_usd_centavos: totalUsdCentavos,
                    subtotal_bs_centavos: subtotalBsCentavos,
                    iva_bs_centavos: ivaBsCentavos,
                    total_bs_centavos: totalBsCentavos,
                    estado: 'completada',
                    cajero: 'Local',
                    observaciones,
                };

                const saleId = await db.sales.add(saleRecord);

                if (itemsProcessed.length > 0) {
                    await db.saleItems.bulkAdd(
                        itemsProcessed.map((item) => ({
                            venta_id: saleId,
                            ...item,
                        }))
                    );
                }

                const processedPayments = (pagos || []).map((p) => ({
                    venta_id: saleId,
                    tipo_pago: p.tipo_pago,
                    moneda: p.moneda,
                    monto_centavos: Number(p.monto_centavos || 0),
                    tasa_cambio: tasaBcv,
                    referencia: p.referencia || null,
                    created_at: now,
                }));

                if (processedPayments.length > 0) {
                    await db.payments.bulkAdd(processedPayments);
                }

                for (const upd of productUpdates) {
                    await db.products.update(upd.producto.id, {
                        stock_actual: upd.stockNuevo,
                        updated_at: now,
                    });

                    await db.inventoryMovements.add({
                        producto_id: upd.producto.id,
                        tipo_movimiento: 'salida',
                        cantidad: -upd.cantidad,
                        costo_unitario_usd_centavos: Number(upd.producto.precio_costo_usd_centavos || 0),
                        stock_anterior: upd.stockAnterior,
                        stock_nuevo: upd.stockNuevo,
                        observaciones: `Venta #${numeroFactura}`,
                        fecha_movimiento: now,
                    });
                }

                return {
                    id: saleId,
                    ...saleRecord,
                    items: itemsProcessed,
                    pagos: processedPayments,
                };
            }
        );
    },

    ensureSeededFromBackend,

    /**
     * Lista ventas almacenadas en IndexedDB con filtros opcionales de fecha y búsqueda.
     */
    async getSales({ fechaInicio = '', fechaFin = '', search = '' } = {}) {
        await ensureSeededFromBackend();

        const [allSales, allItems] = await Promise.all([
            db.sales.toArray(),
            db.saleItems.toArray(),
        ]);

        const itemsCountBySale = new Map();
        for (const item of allItems) {
            const key = Number(item.venta_id);
            itemsCountBySale.set(key, (itemsCountBySale.get(key) || 0) + Number(item.cantidad || 0));
        }

        const q = String(search || '').trim().toLowerCase();

        return allSales
            .filter((sale) => {
                const dateKey = toLocalDateKey(sale.fecha_venta);
                if (fechaInicio && dateKey < fechaInicio) return false;
                if (fechaFin && dateKey > fechaFin) return false;
                if (q) {
                    const invMatch = String(sale.numero_factura || '').toLowerCase().includes(q);
                    const userMatch = String(sale.cajero || sale.username || '').toLowerCase().includes(q);
                    if (!invMatch && !userMatch) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
            .map((sale) => ({
                ...sale,
                items_count: itemsCountBySale.get(Number(sale.id)) || 0,
            }));
    },

    /**
     * Obtiene una venta completa con sus ítems y pagos desde IndexedDB.
     */
    async getSaleById(id) {
        const numericId = Number(id);
        const sale = await db.sales.get(numericId);
        if (!sale) return null;

        const [items, payments] = await Promise.all([
            db.saleItems.where('venta_id').equals(numericId).toArray(),
            db.payments.where('venta_id').equals(numericId).toArray(),
        ]);

        return {
            ...sale,
            items,
            payments,
        };
    },

    /**
     * Calcula las estadísticas del Dashboard directamente desde IndexedDB.
     */
    async getDashboardStats() {
        await ensureSeededFromBackend();

        const today = new Date();
        const todayStr = toLocalDateKey(today);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        const weekAgoStr = toLocalDateKey(weekAgo);

        const [allSales, allItems, allProducts, latestRate] = await Promise.all([
            db.sales.toArray(),
            db.saleItems.toArray(),
            db.products.toArray(),
            currencyRepository.getLatestRate(),
        ]);

        const completedSales = allSales.filter((s) => s.estado === 'completada');
        const todaySales = completedSales.filter((s) => toLocalDateKey(s.fecha_venta) === todayStr);

        const todayUsdCentavos = todaySales.reduce((acc, s) => acc + Number(s.total_usd_centavos || 0), 0);
        const todayBsCentavos = todaySales.reduce((acc, s) => acc + Number(s.total_bs_centavos || 0), 0);

        const weekSalesMap = new Map();
        const weekSaleIds = new Set();

        for (const sale of completedSales) {
            const dk = toLocalDateKey(sale.fecha_venta);
            if (dk >= weekAgoStr) {
                weekSaleIds.add(Number(sale.id));
                const prev = weekSalesMap.get(dk) || { count: 0, total_usd_centavos: 0 };
                prev.count += 1;
                prev.total_usd_centavos += Number(sale.total_usd_centavos || 0);
                weekSalesMap.set(dk, prev);
            }
        }

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const weekData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const ds = toLocalDateKey(d);
            const found = weekSalesMap.get(ds);
            weekData.push({
                fecha: ds,
                name: dayNames[d.getDay()],
                ventas: found ? parseFloat((found.total_usd_centavos / 100).toFixed(2)) : 0,
                count: found ? found.count : 0,
            });
        }

        const activeProducts = allProducts.filter((p) => p.activo !== 0);
        const lowStockCount = activeProducts.filter(
            (p) => Number(p.stock_actual || 0) <= Number(p.stock_minimo || 0) && Number(p.stock_minimo || 0) > 0
        ).length;

        const productAgg = new Map();
        for (const item of allItems) {
            if (!weekSaleIds.has(Number(item.venta_id))) continue;
            const pid = Number(item.producto_id);
            const prev = productAgg.get(pid) || {
                nombre: item.nombre_producto || 'Producto',
                total_vendido: 0,
                total_usd_centavos: 0,
            };
            prev.total_vendido += Number(item.cantidad || 0);
            prev.total_usd_centavos += Number(item.total_usd_centavos || 0);
            productAgg.set(pid, prev);
        }

        const topProducts = Array.from(productAgg.values())
            .sort((a, b) => b.total_vendido - a.total_vendido)
            .slice(0, 5)
            .map((p) => ({
                nombre: p.nombre,
                total_vendido: p.total_vendido,
                total_usd: parseFloat((p.total_usd_centavos / 100).toFixed(2)),
            }));

        const recentSales = [...completedSales]
            .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
            .slice(0, 8)
            .map((s) => ({
                id: s.id,
                numero_factura: s.numero_factura,
                total_usd: parseFloat((Number(s.total_usd_centavos || 0) / 100).toFixed(2)),
                total_bs: parseFloat((Number(s.total_bs_centavos || 0) / 100).toFixed(2)),
                fecha_venta: s.fecha_venta,
                moneda_venta: s.moneda_venta,
                cajero: s.cajero || s.username || 'Local',
            }));

        return {
            today: {
                count: todaySales.length,
                total_usd: parseFloat((todayUsdCentavos / 100).toFixed(2)),
                total_bs: parseFloat((todayBsCentavos / 100).toFixed(2)),
            },
            week: weekData,
            products: {
                total: activeProducts.length,
                low_stock: lowStockCount,
            },
            rate: Number(latestRate?.tasa || 0),
            top_products: topProducts,
            recent_sales: recentSales,
        };
    },

    /**
     * Calcula las métricas avanzadas de Reportería por período desde IndexedDB.
     */
    async getReportStats(period = 'semana') {
        await ensureSeededFromBackend();

        const today = new Date();
        const todayStr = toLocalDateKey(today);
        let startDateStr = todayStr;

        if (period === 'semana') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 6);
            startDateStr = toLocalDateKey(weekAgo);
        } else if (period === 'mes') {
            startDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        } else if (period === 'anio') {
            startDateStr = `${today.getFullYear()}-01-01`;
        }

        const [allSales, allItems, allPayments, allProducts, latestRate] = await Promise.all([
            db.sales.toArray(),
            db.saleItems.toArray(),
            db.payments.toArray(),
            db.products.toArray(),
            currencyRepository.getLatestRate(),
        ]);

        const periodSales = allSales.filter((s) => {
            if (s.estado !== 'completada') return false;
            const dk = toLocalDateKey(s.fecha_venta);
            return period === 'dia' ? dk === todayStr : dk >= startDateStr;
        });

        const saleById = new Map(periodSales.map((s) => [Number(s.id), s]));

        const totalUsdCentavos = periodSales.reduce((acc, s) => acc + Number(s.total_usd_centavos || 0), 0);
        const totalBsCentavos = periodSales.reduce((acc, s) => acc + Number(s.total_bs_centavos || 0), 0);

        // Desglose de métodos de pago normalizado a USD para el gráfico circular
        const paymentsMap = new Map();
        for (const pay of allPayments) {
            const sale = saleById.get(Number(pay.venta_id));
            if (!sale) continue;

            const tasaRef = Number(pay.tasa_cambio || sale.tasa_bcv_usada || latestRate?.tasa || 0);
            const rawAmount = Number(pay.monto_centavos || 0) / 100;
            const usdEquivalent =
                pay.moneda === 'BS' ? (tasaRef > 0 ? rawAmount / tasaRef : 0) : rawAmount;

            const prev = paymentsMap.get(pay.tipo_pago) || {
                tipo_pago: pay.tipo_pago,
                moneda: 'USD',
                monto: 0,
            };
            prev.monto += usdEquivalent;
            paymentsMap.set(pay.tipo_pago, prev);
        }

        const paymentsFormatted = Array.from(paymentsMap.values()).map((p) => ({
            ...p,
            monto: parseFloat(p.monto.toFixed(2)),
        }));

        // Agregado por producto en el período
        const productSalesMap = new Map();
        for (const item of allItems) {
            if (!saleById.has(Number(item.venta_id))) continue;
            const pid = Number(item.producto_id);
            const prev = productSalesMap.get(pid) || {
                total_cantidad: 0,
                total_usd_centavos: 0,
                nombre_fallback: item.nombre_producto || 'Producto',
            };
            prev.total_cantidad += Number(item.cantidad || 0);
            prev.total_usd_centavos += Number(item.total_usd_centavos || 0);
            productSalesMap.set(pid, prev);
        }

        const productById = new Map(allProducts.map((p) => [Number(p.id), p]));

        const topProducts = Array.from(productSalesMap.entries())
            .map(([pid, agg]) => {
                const prod = productById.get(pid);
                return {
                    producto_id: pid,
                    nombre: prod?.nombre || agg.nombre_fallback,
                    codigo_barras: prod?.codigo_barras || null,
                    stock_actual: Number(prod?.stock_actual ?? 0),
                    sin_control_stock: Boolean(prod?.sin_control_stock),
                    unidad_medida: prod?.unidad_medida || 'unidad',
                    total_cantidad: agg.total_cantidad,
                    total_usd: parseFloat((agg.total_usd_centavos / 100).toFixed(2)),
                };
            })
            .sort((a, b) => b.total_cantidad - a.total_cantidad)
            .slice(0, 10);

        const activeProducts = allProducts.filter((p) => p.activo !== 0);
        const lowProducts = activeProducts
            .map((prod) => {
                const agg = productSalesMap.get(Number(prod.id));
                return {
                    producto_id: prod.id,
                    nombre: prod.nombre,
                    codigo_barras: prod.codigo_barras || null,
                    stock_actual: Number(prod.stock_actual ?? 0),
                    sin_control_stock: Boolean(prod.sin_control_stock),
                    unidad_medida: prod.unidad_medida || 'unidad',
                    total_cantidad: agg ? agg.total_cantidad : 0,
                    total_usd: agg ? parseFloat((agg.total_usd_centavos / 100).toFixed(2)) : 0,
                };
            })
            .sort((a, b) => {
                if (a.total_cantidad !== b.total_cantidad) return a.total_cantidad - b.total_cantidad;
                return a.nombre.localeCompare(b.nombre, 'es');
            })
            .slice(0, 10);

        // Tendencia agrupada por hora / día / mes
        const trendMap = new Map();
        for (const sale of periodSales) {
            let punto = '';
            if (period === 'dia') {
                punto = toLocalHourKey(sale.fecha_venta);
            } else if (period === 'anio') {
                punto = toLocalMonthKey(sale.fecha_venta);
            } else {
                punto = toLocalDateKey(sale.fecha_venta);
            }
            const prev = trendMap.get(punto) || { punto, total_usd_centavos: 0, count: 0 };
            prev.total_usd_centavos += Number(sale.total_usd_centavos || 0);
            prev.count += 1;
            trendMap.set(punto, prev);
        }

        const trendFormatted = Array.from(trendMap.values())
            .sort((a, b) => a.punto.localeCompare(b.punto))
            .map((t) => ({
                punto: t.punto,
                ventas: parseFloat((t.total_usd_centavos / 100).toFixed(2)),
                count: t.count,
            }));

        return {
            period,
            total_sales_count: periodSales.length,
            total_usd: parseFloat((totalUsdCentavos / 100).toFixed(2)),
            total_bs: parseFloat((totalBsCentavos / 100).toFixed(2)),
            rate: Number(latestRate?.tasa || 0),
            payments: paymentsFormatted,
            top_products: topProducts,
            low_products: lowProducts,
            trend: trendFormatted,
        };
    },
};

export default saleRepository;

