const dbManager = require('../database/database');

/**
 * Servicio de configuración del sistema
 * Maneja las configuraciones almacenadas en la tabla 'configuraciones'
 * y las configuraciones de negocio (empresa, fiscal, impresora, etc.)
 */
class ConfigService {
    /**
     * Obtener todas las configuraciones
     * @returns {Object} configuraciones como objeto clave-valor
     */
    async getAll() {
        const db = await dbManager.getDb();
        const rows = await db.all('SELECT clave, valor, descripcion FROM configuraciones ORDER BY clave');

        // Convertir array a objeto para fácil acceso
        const configMap = {};
        rows.forEach(row => {
            configMap[row.clave] = {
                valor: row.valor,
                descripcion: row.descripcion
            };
        });

        return configMap;
    }

    /**
     * Obtener todas las configuraciones como lista plana
     * @returns {Array} lista de configuraciones
     */
    async getAllFlat() {
        const db = await dbManager.getDb();
        return db.all('SELECT clave, valor, descripcion, updated_at FROM configuraciones ORDER BY clave');
    }

    /**
     * Obtener una configuración por clave
     * @param {string} clave 
     * @returns {string|null} valor de la configuración
     */
    async get(clave) {
        const db = await dbManager.getDb();
        const row = await db.get('SELECT valor FROM configuraciones WHERE clave = ?', [clave]);
        return row ? row.valor : null;
    }

    /**
     * Establecer una configuración (insertar o actualizar)
     * @param {string} clave 
     * @param {string} valor 
     * @param {string} descripcion - opcional
     */
    async set(clave, valor, descripcion = null) {
        const db = await dbManager.getDb();

        const existing = await db.get('SELECT clave FROM configuraciones WHERE clave = ?', [clave]);

        if (existing) {
            if (descripcion !== null) {
                await db.run(
                    `UPDATE configuraciones SET valor = ?, descripcion = ?, updated_at = datetime('now', 'localtime') 
                     WHERE clave = ?`,
                    [valor, descripcion, clave]
                );
            } else {
                await db.run(
                    `UPDATE configuraciones SET valor = ?, updated_at = datetime('now', 'localtime') 
                     WHERE clave = ?`,
                    [valor, clave]
                );
            }
        } else {
            await db.run(
                `INSERT INTO configuraciones (clave, valor, descripcion) VALUES (?, ?, ?)`,
                [clave, valor, descripcion || '']
            );
        }
    }

    /**
     * Actualizar múltiples configuraciones a la vez
     * @param {Object} configs - { clave: valor, ... }
     * @param {number} userId - usuario que realiza el cambio
     */
    async updateBulk(configs, userId) {
        const db = await dbManager.getDb();

        return dbManager.transaction(async (db) => {
            for (const [clave, valor] of Object.entries(configs)) {
                await this.set(clave, String(valor));
            }

            // Registrar en auditoría
            await db.run(
                `INSERT INTO auditoria (usuario_id, accion, tabla, datos_nuevos)
                 VALUES (?, ?, ?, ?)`,
                [userId, 'ACTUALIZAR_CONFIGURACION', 'configuraciones', JSON.stringify(configs)]
            );
        });
    }

    /**
     * Obtener configuración de la empresa agrupada en secciones
     * para el frontend
     * @returns {Object} configuraciones agrupadas
     */
    async getBusinessConfig() {
        const allConfig = await this.getAll();

        // Definir las claves esperadas con sus valores por defecto
        const defaults = {
            // Información de la empresa
            empresa_nombre: 'Mi Comercio',
            empresa_rif: 'J-000000000',
            empresa_direccion: '',
            empresa_telefono: '',
            empresa_email: '',
            empresa_encabezado_ticket: '',
            empresa_pie_ticket: 'Gracias por su compra',

            // Configuración fiscal
            tasa_iva_default: '16.0',
            moneda_principal: 'USD',
            permitir_venta_sin_stock: '0',
            redondeo_bs: '2',

            // Configuración de impresora
            printer_type: 'usb',
            printer_width: '58',
            printer_vendor_id: '',
            printer_product_id: '',

            // Configuración de balanza
            scale_port: 'COM3',
            scale_baudrate: '9600',
            scale_protocol: 'toledo',

            // Configuración de sistema
            sistema_inicializado: '1',
            ultimo_numero_factura: '0',
            prefijo_factura: 'VEC',
            backup_auto_cierre_caja: '1',
            max_backup_files: '30',

            // Configuración de licencia
            license_key: '',
            license_business: '',
            license_max_users: '3'
        };

        // Combinar: lo que está en BD tiene prioridad sobre los defaults
        const result = {};
        for (const [key, defaultValue] of Object.entries(defaults)) {
            result[key] = allConfig[key]?.valor ?? defaultValue;
        }

        return result;
    }

    /**
     * Inicializar configuraciones faltantes con valores por defecto
     * Se ejecuta al iniciar el sistema
     */
    async initializeDefaults() {
        const defaults = {
            empresa_nombre: { valor: 'Mi Comercio', desc: 'Nombre del comercio' },
            empresa_rif: { valor: 'J-000000000', desc: 'RIF del comercio' },
            empresa_direccion: { valor: '', desc: 'Dirección del comercio' },
            empresa_telefono: { valor: '', desc: 'Teléfono del comercio' },
            empresa_email: { valor: '', desc: 'Email del comercio' },
            empresa_encabezado_ticket: { valor: '', desc: 'Encabezado personalizado del ticket' },
            empresa_pie_ticket: { valor: 'Gracias por su compra', desc: 'Pie del ticket' },
            tasa_iva_default: { valor: '16.0', desc: 'Tasa de IVA por defecto' },
            moneda_principal: { valor: 'USD', desc: 'Moneda principal del sistema' },
            permitir_venta_sin_stock: { valor: '0', desc: 'Permitir ventas sin stock' },
            redondeo_bs: { valor: '2', desc: 'Decimales para redondeo en bolívares' },
            printer_type: { valor: 'usb', desc: 'Tipo de conexión de impresora' },
            printer_width: { valor: '58', desc: 'Ancho de papel en mm' },
            scale_port: { valor: 'COM3', desc: 'Puerto COM de la balanza' },
            scale_baudrate: { valor: '9600', desc: 'Velocidad de la balanza' },
            scale_protocol: { valor: 'toledo', desc: 'Protocolo de la balanza' },
            sistema_inicializado: { valor: '1', desc: 'Indica si el sistema fue inicializado' },
            ultimo_numero_factura: { valor: '0', desc: 'Último número de factura generado' },
            prefijo_factura: { valor: 'VEC', desc: 'Prefijo para números de factura' },
            backup_auto_cierre_caja: { valor: '1', desc: 'Backup automático al cerrar caja' },
            max_backup_files: { valor: '30', desc: 'Máximo de archivos de backup a mantener' }
        };

        const db = await dbManager.getDb();
        for (const [clave, { valor, desc }] of Object.entries(defaults)) {
            const existing = await db.get('SELECT clave FROM configuraciones WHERE clave = ?', [clave]);
            if (!existing) {
                await db.run(
                    'INSERT INTO configuraciones (clave, valor, descripcion) VALUES (?, ?, ?)',
                    [clave, valor, desc]
                );
            }
        }
    }
}

module.exports = new ConfigService();
