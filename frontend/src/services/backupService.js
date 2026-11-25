import { db } from './db.js';

const LAST_BACKUP_KEY = 'last_backup_at';
const CUSTOMIZATION_KEYS = [
    'pos_product_icon',
    'pos_product_bg',
    'pos_product_icon_color',
    'pos_product_use_image',
    'pos_product_image',
];

function getTodayStamp() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export const backupService = {
    /**
     * Solicita almacenamiento persistente al navegador si la API está disponible.
     */
    async requestPersistentStorage() {
        try {
            if (navigator.storage?.persist) {
                return await navigator.storage.persist();
            }
        } catch {
            // Ignorar si el navegador no lo soporta
        }
        return false;
    },

    async getStatus() {
        const [productsCount, salesCount, ratesCount, movementsCount, lastBackupEntry] = await Promise.all([
            db.products.count(),
            db.sales.count(),
            db.exchangeRates.count(),
            db.inventoryMovements.count(),
            db.settings.get(LAST_BACKUP_KEY),
        ]);

        let persisted = false;
        try {
            if (navigator.storage?.persisted) {
                persisted = await navigator.storage.persisted();
            }
        } catch {
            persisted = false;
        }

        return {
            lastBackupAt: lastBackupEntry?.valor || null,
            persisted,
            counts: {
                products: productsCount,
                sales: salesCount,
                exchangeRates: ratesCount,
                inventoryMovements: movementsCount,
            },
        };
    },

    /**
     * Exporta toda la base IndexedDB + personalización visual a un archivo JSON descargable.
     */
    async exportBackup() {
        const [products, exchangeRates, sales, saleItems, payments, inventoryMovements, settings] =
            await Promise.all([
                db.products.toArray(),
                db.exchangeRates.toArray(),
                db.sales.toArray(),
                db.saleItems.toArray(),
                db.payments.toArray(),
                db.inventoryMovements.toArray(),
                db.settings.toArray(),
            ]);

        const customization = {};
        for (const key of CUSTOMIZATION_KEYS) {
            const val = localStorage.getItem(key);
            if (val !== null) customization[key] = val;
        }

        const now = new Date().toISOString();
        const payload = {
            app: 'Vectra POS',
            version: 1,
            exportedAt: now,
            tables: {
                products,
                exchangeRates,
                sales,
                saleItems,
                payments,
                inventoryMovements,
                settings,
            },
            customization,
        };

        await db.settings.put({
            clave: LAST_BACKUP_KEY,
            valor: now,
            updated_at: now,
        });

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vectra-pos-backup-${getTodayStamp()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return {
            exportedAt: now,
            counts: {
                products: products.length,
                sales: sales.length,
                exchangeRates: exchangeRates.length,
            },
        };
    },

    /**
     * Restaura un archivo JSON exportado previamente, reemplazando las tablas locales de forma atómica.
     */
    async importBackup(file) {
        if (!file) throw new Error('Selecciona un archivo JSON válido.');

        const text = await file.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            throw new Error('El archivo no tiene un formato JSON válido.');
        }

        if (!parsed || parsed.app !== 'Vectra POS' || !parsed.tables) {
            throw new Error('El archivo no corresponde a una copia de seguridad de Vectra POS.');
        }

        const {
            products = [],
            exchangeRates = [],
            sales = [],
            saleItems = [],
            payments = [],
            inventoryMovements = [],
            settings = [],
        } = parsed.tables;

        await db.transaction(
            'rw',
            db.products,
            db.exchangeRates,
            db.sales,
            db.saleItems,
            db.payments,
            db.inventoryMovements,
            db.settings,
            async () => {
                await Promise.all([
                    db.products.clear(),
                    db.exchangeRates.clear(),
                    db.sales.clear(),
                    db.saleItems.clear(),
                    db.payments.clear(),
                    db.inventoryMovements.clear(),
                    db.settings.clear(),
                ]);

                if (products.length) await db.products.bulkPut(products);
                if (exchangeRates.length) await db.exchangeRates.bulkPut(exchangeRates);
                if (sales.length) await db.sales.bulkPut(sales);
                if (saleItems.length) await db.saleItems.bulkPut(saleItems);
                if (payments.length) await db.payments.bulkPut(payments);
                if (inventoryMovements.length) await db.inventoryMovements.bulkPut(inventoryMovements);
                if (settings.length) await db.settings.bulkPut(settings);
            }
        );

        if (parsed.customization && typeof parsed.customization === 'object') {
            for (const key of CUSTOMIZATION_KEYS) {
                if (parsed.customization[key] !== undefined) {
                    localStorage.setItem(key, parsed.customization[key]);
                }
            }
        }

        window.dispatchEvent(new CustomEvent('vectra:config-updated'));
        return {
            products: products.length,
            sales: sales.length,
            exchangeRates: exchangeRates.length,
        };
    },

    /**
     * Exporta el historial de ventas en formato CSV compatible con Excel / Google Sheets.
     */
    async exportSalesCsv() {
        const [sales, items] = await Promise.all([db.sales.toArray(), db.saleItems.toArray()]);
        if (sales.length === 0) {
            throw new Error('No hay ventas registradas para exportar.');
        }

        const itemsBySale = new Map();
        for (const item of items) {
            const list = itemsBySale.get(Number(item.venta_id)) || [];
            list.push(`${item.cantidad}x ${item.nombre_producto}`);
            itemsBySale.set(Number(item.venta_id), list);
        }

        const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const headers = ['Factura', 'Fecha', 'Moneda', 'Tasa BCV', 'Total USD', 'Total Bs', 'Productos', 'Estado'];
        const rows = sales
            .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
            .map((s) => [
                s.numero_factura,
                new Date(s.fecha_venta).toLocaleString('es-VE'),
                s.moneda_venta,
                Number(s.tasa_bcv_usada || 0).toFixed(4),
                (Number(s.total_usd_centavos || 0) / 100).toFixed(2),
                (Number(s.total_bs_centavos || 0) / 100).toFixed(2),
                (itemsBySale.get(Number(s.id)) || []).join(' | '),
                s.estado || 'completada',
            ]);

        const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vectra-pos-ventas-${getTodayStamp()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return sales.length;
    },
};

export default backupService;

