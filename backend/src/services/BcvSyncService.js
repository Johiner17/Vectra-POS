/**
 * BcvSyncService — Sincronización automática de la tasa del BCV
 * 
 * Filosofía: OFFLINE-FIRST
 * - El sistema funciona 100% sin internet usando la última tasa guardada en SQLite
 * - Cuando hay conexión disponible, sincroniza automáticamente la tasa oficial del BCV
 * - Múltiples fuentes con fallback para máxima confiabilidad
 */

const dbManager = require('../database/database');

class BcvSyncService {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastStatus = null; // 'success' | 'offline' | 'error'
        this.lastAttempt = null;
        this.lastSuccess = null;
    }

    /**
     * Fuentes de datos en orden de prioridad.
     * Si una falla, se intenta la siguiente.
     */
    get sources() {
        return [
            {
                name: 'DolarApi.com',
                fetch: () => this._fetchDolarApi()
            },
            {
                name: 'bcv.justcarlux.dev',
                fetch: () => this._fetchJustcarlux()
            },
            {
                name: 'BCV Directo (scraping)',
                fetch: () => this._fetchBcvDirect()
            }
        ];
    }

    /**
     * Fuente 1: ve.dolarapi.com — API pública sin autenticación
     */
    async _fetchDolarApi() {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`DolarApi HTTP ${res.status}`);
        const data = await res.json();

        // Buscar el dólar oficial (BCV)
        const oficial = data.find(d =>
            d.fuente === 'BCV' ||
            d.nombre?.toLowerCase().includes('oficial') ||
            d.nombreCorto?.toLowerCase().includes('oficial')
        );

        if (!oficial || !oficial.promedio) throw new Error('No se encontró tasa oficial en DolarApi');

        return {
            tasa: parseFloat(oficial.promedio),
            fuente: 'DolarApi.com (BCV Oficial)'
        };
    }

    /**
     * Fuente 2: API comunitaria bcv.justcarlux.dev
     */
    async _fetchJustcarlux() {
        const res = await fetch('https://bcv.justcarlux.dev/api/v1/rates', {
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`Justcarlux HTTP ${res.status}`);
        const data = await res.json();

        const tasa = data?.usd || data?.USD || data?.dolar || data?.dollar;
        if (!tasa) throw new Error('Estructura inesperada en Justcarlux');

        return {
            tasa: parseFloat(tasa),
            fuente: 'bcv.justcarlux.dev'
        };
    }

    /**
     * Fuente 3: Scraping directo del BCV
     * El BCV publica las tasas en su web como texto plano en algunos endpoints
     */
    async _fetchBcvDirect() {
        const res = await fetch('https://www.bcv.org.ve/tasas-informativas-del-sistema-financiero', {
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!res.ok) throw new Error(`BCV Directo HTTP ${res.status}`);
        const html = await res.text();

        // El BCV publica el tipo de cambio de forma reconocible en su HTML
        // Buscar patrón: número con formato venezolano (ej: 91,3456 o 91.3456)
        const matches = html.match(/(?:USD|US\$|D[ó|o]lar)[^0-9]*([0-9]{1,3}[.,][0-9]{2,6})/i);
        if (!matches) throw new Error('No se pudo extraer la tasa del HTML del BCV');

        const tasaStr = matches[1].replace(',', '.');
        const tasa = parseFloat(tasaStr);

        if (isNaN(tasa) || tasa < 1) throw new Error('Tasa extraída inválida');

        return {
            tasa,
            fuente: 'BCV Directo (scraping)'
        };
    }

    /**
     * Intenta obtener la tasa de cualquier fuente disponible.
     * Si todas fallan, retorna null (modo offline).
     */
    async fetchRate() {
        for (const source of this.sources) {
            try {
                const result = await source.fetch();
                console.log(`✅ Tasa BCV obtenida de ${source.name}: ${result.tasa}`);
                return result;
            } catch (err) {
                console.warn(`⚠️  ${source.name} falló: ${err.message}`);
            }
        }
        return null; // Todas las fuentes fallaron
    }

    /**
     * Sincroniza la tasa con la base de datos.
     * Guarda el resultado y actualiza el estado interno.
     */
    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.lastAttempt = new Date();

        try {
            const result = await this.fetchRate();

            if (!result) {
                this.lastStatus = 'offline';
                console.log('📡 Sin conexión — usando última tasa guardada en DB');
                return;
            }

            // Guardar en BD
            const db = await dbManager.getDb();
            const today = new Date().toISOString().split('T')[0];

            // Upsert: actualizar si ya existe para hoy, insertar si no
            const existing = await db.get(
                'SELECT id FROM tasas_bcv WHERE fecha = ?', [today]
            );

            if (existing) {
                await db.run(
                    'UPDATE tasas_bcv SET tasa = ?, fuente = ? WHERE fecha = ?',
                    [result.tasa, result.fuente, today]
                );
            } else {
                await db.run(
                    'INSERT INTO tasas_bcv (fecha, tasa, fuente) VALUES (?, ?, ?)',
                    [today, result.tasa, result.fuente]
                );
            }

            this.lastStatus = 'success';
            this.lastSuccess = new Date();

            console.log(`💱 Tasa BCV actualizada: ${result.tasa} Bs/USD (${result.fuente})`);

        } catch (error) {
            this.lastStatus = 'error';
            console.error('❌ Error en sincronización BCV:', error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Inicia la sincronización automática:
     * - Intenta sincronizar al arrancar (después de 5 segundos para no bloquear el inicio)
     * - Luego cada 6 horas (el BCV publica la tasa una vez al día hábil)
     */
    start() {
        console.log('🔄 Iniciando sincronización automática de tasa BCV...');

        // Primera sincronización: 5 segundos después de arrancar
        setTimeout(() => this.sync(), 5000);

        // Sincronización each 6 horas (en ms)
        const SIX_HOURS = 6 * 60 * 60 * 1000;
        this.syncInterval = setInterval(() => this.sync(), SIX_HOURS);
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Estado actual del servicio (para mostrar en el frontend)
     */
    getStatus() {
        return {
            lastStatus: this.lastStatus,
            lastAttempt: this.lastAttempt,
            lastSuccess: this.lastSuccess,
            isSyncing: this.isSyncing
        };
    }
}

// Singleton
const bcvSyncService = new BcvSyncService();
module.exports = bcvSyncService;
