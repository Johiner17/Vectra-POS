import { db } from './db.js';

const APP_CONFIG_KEY = 'app_config';
const INVOICE_COUNTER_KEY = 'ultimo_numero_factura';

export const DEFAULT_CONFIG = {
    empresa_nombre: 'Vectra POS',
    empresa_rif: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    tasa_iva_default: '16.0',
    moneda_principal: 'USD',
    prefijo_factura: 'VEC',
    redondeo_bs: '2',
    permitir_venta_sin_stock: '0',
    empresa_encabezado_ticket: '',
    empresa_pie_ticket: 'Gracias por su compra',
};

let seedConfigPromise = null;

async function ensureSeededFromBackend() {
    if (seedConfigPromise) return seedConfigPromise;

    seedConfigPromise = (async () => {
        try {
            const existing = await db.settings.get(APP_CONFIG_KEY);
            if (existing?.valor) return;

            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch('/api/config', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;

            const json = await res.json();
            if (json?.success && json?.data) {
                await db.settings.put({
                    clave: APP_CONFIG_KEY,
                    valor: { ...DEFAULT_CONFIG, ...json.data },
                    updated_at: new Date().toISOString(),
                });
            }
        } catch {
            // Sin backend, usa valores por defecto locales
        } finally {
            seedConfigPromise = null;
        }
    })();

    return seedConfigPromise;
}

export const settingsRepository = {
    ensureSeededFromBackend,

    async getConfig() {
        await ensureSeededFromBackend();
        const [appConfigEntry, counterEntry] = await Promise.all([
            db.settings.get(APP_CONFIG_KEY),
            db.settings.get(INVOICE_COUNTER_KEY),
        ]);

        const stored = appConfigEntry?.valor || {};
        return {
            ...DEFAULT_CONFIG,
            ...stored,
            ultimo_numero_factura: String(counterEntry?.valor ?? stored.ultimo_numero_factura ?? '0'),
        };
    },

    async saveConfig(nextConfig) {
        const now = new Date().toISOString();
        const { ultimo_numero_factura, ...rest } = nextConfig;
        const merged = { ...DEFAULT_CONFIG, ...rest };

        await db.transaction('rw', db.settings, async () => {
            await db.settings.put({
                clave: APP_CONFIG_KEY,
                valor: merged,
                updated_at: now,
            });

            if (ultimo_numero_factura !== undefined) {
                const parsedSeq = Math.max(0, parseInt(ultimo_numero_factura, 10) || 0);
                await db.settings.put({
                    clave: INVOICE_COUNTER_KEY,
                    valor: parsedSeq,
                    updated_at: now,
                });
            }
        });

        window.dispatchEvent(new CustomEvent('vectra:config-updated', { detail: merged }));
        return this.getConfig();
    },
};

export default settingsRepository;

