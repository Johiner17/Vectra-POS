require('dotenv').config();
const path = require('path');

/**
 * Configuración centralizada del sistema POS
 */
const config = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Configuración de seguridad
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-CHANGE-IN-PRODUCTION',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
  },

  // Configuración de base de datos
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../data/vectra_pos.db'),
    backupPath: process.env.BACKUP_PATH || path.join(__dirname, '../../backups')
  },

  // Configuración fiscal
  fiscal: {
    businessName: process.env.BUSINESS_NAME || 'Mi Comercio',
    businessRif: process.env.BUSINESS_RIF || 'J-000000000',
    businessAddress: process.env.BUSINESS_ADDRESS || '',
    businessPhone: process.env.BUSINESS_PHONE || '',
    ivaRate: parseFloat(process.env.IVA_RATE) || 16.0
  },

  // Configuración de impresora térmica
  printer: {
    type: process.env.PRINTER_TYPE || 'usb',
    width: parseInt(process.env.PRINTER_WIDTH) || 58,
    vendorId: process.env.PRINTER_VENDOR_ID || null,
    productId: process.env.PRINTER_PRODUCT_ID || null
  },

  // Configuración de balanza
  scale: {
    port: process.env.SCALE_PORT || 'COM3',
    baudrate: parseInt(process.env.SCALE_BAUDRATE) || 9600,
    protocol: process.env.SCALE_PROTOCOL || 'toledo'
  },

  // Configuración de monedas
  currency: {
    baseCurrency: 'USD',
    secondaryCurrency: 'BS',
    decimalPlaces: 2,
    // Todos los montos se almacenan como enteros en centavos
    // Para convertir: monto_real * 100 = monto_centavos
    // Para mostrar: monto_centavos / 100 = monto_real
    storageMultiplier: 100
  },

  // Configuración de backup
  backup: {
    autoBackupOnCashClose: true,
    maxBackupFiles: 30,
    backupPrefix: 'vectra_pos_backup_'
  }
};

module.exports = config;
