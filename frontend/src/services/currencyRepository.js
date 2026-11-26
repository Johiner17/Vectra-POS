import { db } from './db.js';

const CURRENCY_MIGRATION_KEY = 'currency_migrated_v1';
const SYNC_STATUS_KEY = 'bcv_sync_status';

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchDolarApi() {
    const res = await fetchWithTimeout('https://ve.dolarapi.com/v1/dolares/oficial', 8000);
    if (!res.ok) throw new Error(`DolarApi HTTP ${res.status}`);
    const data = await res.json();
    const tasa = parseFloat(data?.promedio);
    if (!tasa || isNaN(tasa) || tasa <= 0) {
        throw new Error('Respuesta inválida de DolarApi');
    }
    return { tasa, fuente: 'DolarApi.com (BCV Oficial)' };
}

async function fetchExchangeRateApi() {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', 8000);
    if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
    const data = await res.json();
    const tasa = parseFloat(data?.rates?.VES);
    if (!tasa || isNaN(tasa) || tasa <= 0) {
        throw new Error('Respuesta inválida de ExchangeRate-API');
    }
    return { tasa, fuente: 'ExchangeRate-API (VES)' };
}

let seedPromise = null;

/**
 * Importa una sola vez el historial de tasas desde el backend (si existe y hay token)
 * hacia IndexedDB.
 */
async function ensureSeededFromBackend() {
    if (seedPromise) return seedPromise;

    seedPromise = (async () => {
        try {
            const migrated = await db.settings.get(CURRENCY_MIGRATION_KEY);
            const count = await db.exchangeRates.count();
            if (migrated?.valor || count > 0) return;

            const token = localStorage.getItem('token');
            if (!token) return;

            const [rateRes, histRes] = await Promise.all([
                fetch('/api/currency/rate', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
                fetch('/api/currency/history', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
            ]);

            const toStore = [];
            if (histRes && histRes.ok) {
                const histJson = await histRes.json();
                if (Array.isArray(histJson?.data)) {
                    for (const row of histJson.data) {
                        if (row?.fecha && Number(row?.tasa) > 0) {
                            toStore.push({
                                fecha: String(row.fecha).slice(0, 10),
                                tasa: Number(row.tasa),
                                fuente: row.fuente || 'Importado',
                                created_at: row.created_at || new Date().toISOString(),
                            });
                        }
                    }
                }
            }

            if (toStore.length === 0 && rateRes && rateRes.ok) {
                const rateJson = await rateRes.json();
                const latest = rateJson?.data;
                if (latest?.tasa && Number(latest.tasa) > 0) {
                    toStore.push({
                        fecha: String(latest.fecha || getTodayDateString()).slice(0, 10),
                        tasa: Number(latest.tasa),
                        fuente: latest.fuente || 'Importado',
                        created_at: new Date().toISOString(),
                    });
                }
            }

            for (const item of toStore) {
                const existing = await db.exchangeRates.where('fecha').equals(item.fecha).first();
                if (existing) {
                    await db.exchangeRates.update(existing.id, {
                        tasa: item.tasa,
                        fuente: item.fuente,
                    });
                } else {
                    await db.exchangeRates.add(item);
                }
            }

            await db.settings.put({
                clave: CURRENCY_MIGRATION_KEY,
                valor: true,
                updated_at: new Date().toISOString(),
            });
        } catch {
            // Si no hay backend o no hay red, continuamos en modo local sin fallar.
        } finally {
            seedPromise = null;
        }
    })();

    return seedPromise;
}

export const currencyRepository = {
    ensureSeededFromBackend,

    /**
     * Guarda o actualiza la tasa para una fecha (por defecto hoy).
     */
    async saveRate({ tasa, fuente = 'Manual', fecha = getTodayDateString() }) {
        const numericRate = Number(parseFloat(tasa).toFixed(4));
        if (isNaN(numericRate) || numericRate <= 0) {
            throw new Error('Ingresa una tasa válida mayor a 0.');
        }

        const dateKey = String(fecha).slice(0, 10);
        const now = new Date().toISOString();
        const existing = await db.exchangeRates.where('fecha').equals(dateKey).first();

        if (existing) {
            await db.exchangeRates.update(existing.id, {
                tasa: numericRate,
                fuente,
                updated_at: now,
            });
            return db.exchangeRates.get(existing.id);
        }

        const id = await db.exchangeRates.add({
            fecha: dateKey,
            tasa: numericRate,
            fuente,
            created_at: now,
            updated_at: now,
        });
        return db.exchangeRates.get(id);
    },

    /**
     * Obtiene la última tasa guardada en IndexedDB junto con el estado de sincronización.
     */
    async getLatestRate() {
        await ensureSeededFromBackend();
        const all = await db.exchangeRates.toArray();
        all.sort((a, b) => {
            const cmp = String(b.fecha).localeCompare(String(a.fecha));
            return cmp !== 0 ? cmp : Number(b.id) - Number(a.id);
        });

        const latest = all[0] || null;
        const syncSetting = await db.settings.get(SYNC_STATUS_KEY);

        return {
            tasa: latest?.tasa || 0,
            fecha: latest?.fecha || null,
            fuente: latest?.fuente || null,
            sync: syncSetting?.valor || {
                lastStatus: null,
                lastAttempt: null,
                lastSuccess: null,
            },
        };
    },

    /**
     * Obtiene el historial de tasas ordenado de la más reciente a la más antigua.
     */
    async getHistory(limit = 30) {
        await ensureSeededFromBackend();
        const all = await db.exchangeRates.toArray();
        all.sort((a, b) => {
            const cmp = String(b.fecha).localeCompare(String(a.fecha));
            return cmp !== 0 ? cmp : Number(b.id) - Number(a.id);
        });
        return all.slice(0, limit);
    },

    /**
     * Consulta fuentes BCV públicas directamente desde el navegador y guarda en IndexedDB.
     * Si no hay conexión o fallan las fuentes, conserva la última tasa guardada.
     */
    async syncFromOnline() {
        const now = new Date().toISOString();
        const prevSync = (await db.settings.get(SYNC_STATUS_KEY))?.valor || {};

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            const status = {
                ...prevSync,
                lastStatus: 'offline',
                lastAttempt: now,
            };
            await db.settings.put({ clave: SYNC_STATUS_KEY, valor: status, updated_at: now });
            return { synced: false, offline: true, status };
        }

        const sources = [fetchDolarApi, fetchExchangeRateApi];
        for (const fetchSource of sources) {
            try {
                const { tasa, fuente } = await fetchSource();
                const saved = await this.saveRate({ tasa, fuente, fecha: getTodayDateString() });
                const status = {
                    lastStatus: 'success',
                    lastAttempt: now,
                    lastSuccess: now,
                    fuente,
                };
                await db.settings.put({ clave: SYNC_STATUS_KEY, valor: status, updated_at: now });
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('vectra:rate-updated', { detail: saved }));
                }
                return { synced: true, rate: saved, status };
            } catch {
                // Intentar siguiente fuente
            }
        }

        const status = {
            ...prevSync,
            lastStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
            lastAttempt: now,
        };
        await db.settings.put({ clave: SYNC_STATUS_KEY, valor: status, updated_at: now });
        return { synced: false, offline: status.lastStatus === 'offline', status };
    },

    /**
     * Garantiza que la tasa esté actualizada al día de hoy (o cada 4h si es automática).
     * Respeta tasas ingresadas manualmente hoy para no sobreescribirlas.
     * Devuelve el estado actual junto con `isFromToday` y `syncFailed`.
     */
    async ensureUpToDateRate() {
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
        const today = getTodayDateString();
        let latest = await this.getLatestRate();

        const hasRate = latest?.tasa > 0;
        const isManualToday = latest?.fecha === today && latest?.fuente === 'Manual';
        const lastSuccessMs = latest?.sync?.lastSuccess
            ? new Date(latest.sync.lastSuccess).getTime()
            : 0;
        const isStale = !lastSuccessMs || (Date.now() - lastSuccessMs) > FOUR_HOURS_MS;
        const hadPendingFailure = latest?.sync?.lastStatus === 'offline' || latest?.sync?.lastStatus === 'error';

        const needsSync = !hasRate || latest?.fecha !== today || (!isManualToday && (isStale || hadPendingFailure));

        let syncFailed = false;
        if (needsSync) {
            const syncRes = await this.syncFromOnline();
            latest = await this.getLatestRate();
            syncFailed = !syncRes.synced;
        }

        return {
            ...latest,
            isFromToday: latest?.fecha === today,
            syncFailed,
        };
    },
};

export default currencyRepository;

