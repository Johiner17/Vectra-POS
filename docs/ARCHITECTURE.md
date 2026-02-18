# Arquitectura del Sistema - Vectra POS

## Visión General

Vectra POS es un sistema punto de venta offline diseñado específicamente para pequeños comercios en Venezuela, con soporte completo para multimoneda (USD/BS), gestión fiscal, y funcionamiento 100% offline.

## Arquitectura por Capas

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - Interfaz POS táctil                                  │
│  - Dashboard y reportes                                 │
│  - Gestión de inventario                                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│              API LAYER (Express.js)                      │
│  - Controladores                                        │
│  - Middleware de autenticación (JWT)                    │
│  - Validación de datos                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            BUSINESS LOGIC (Services)                     │
│  - CurrencyService: Multimoneda USD/BS                  │
│  - InventoryService: Kardex y stock                     │
│  - SaleService: Procesamiento de ventas                 │
│  - CashRegisterService: Gestión de caja                 │
│  - AuthService: Autenticación y seguridad               │
│  - FiscalService: Facturación fiscal                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│          DATA ACCESS LAYER (Repositories)                │
│  - ProductRepository                                     │
│  - SaleRepository                                        │
│  - InventoryRepository                                   │
│  - ExchangeRateRepository                                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              DATABASE (SQLite)                           │
│  - 15 tablas normalizadas                               │
│  - Modo WAL para concurrencia                           │
│  - Backups automáticos                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│          HARDWARE INTEGRATION LAYER                       │
│  - ThermalPrinter: Impresoras ESC/POS                   │
│  - BarcodeScanner: Lectores HID                         │
│  - Scale: Balanzas seriales (Toledo/Systel)            │
└──────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### Flujo de Venta Completa

```
1. Usuario escanea producto → BarcodeScanner valida código
2. Frontend busca producto → API /products/search?barcode=XXX
3. ProductRepository consulta BD → Retorna producto con precios
4. Usuario agrega al carrito → Frontend acumula items
5. Usuario procesa pago → POST /sales con items y pagos
6. SaleService:
   ├─ Valida stock disponible (InventoryService)
   ├─ Obtiene tasa BCV actual (CurrencyService)
   ├─ Calcula totales en USD y BS
   ├─ Valida que pagos cubran total
   ├─ Genera número de factura correlativo
   └─ Inicia transacción atómica:
      ├─ Crea venta en BD (SaleRepository)
      ├─ Actualiza inventario (InventoryService)
      └─ Registra movimientos Kardex
7. ThermalPrinter imprime ticket fiscal
8. Retorna venta completada al frontend
```

## Funcionamiento Offline

### Características Offline

- **Base de datos local**: SQLite embebida, no requiere servidor
- **Sin dependencias externas**: Todo funciona sin internet
- **Tasa BCV manual**: Se registra manualmente cada día
- **Sincronización opcional**: Backups manuales a USB/red

### Gestión de Tasas BCV

```javascript
// Registro manual diario
POST /api/currency/rate
{
  "fecha": "2026-02-12",
  "tasa": 36.50,
  "fuente": "manual"
}

// El sistema usa la tasa más reciente para todas las conversiones
// Las ventas guardan la tasa usada para auditoría
```

## Acceso en Red Local

### Configuración de Red

El servidor Express se inicia en `0.0.0.0:3000`, permitiendo acceso desde cualquier dispositivo en la red local:

```
PC Windows (servidor):
- http://localhost:3000

Móviles/Tablets en la misma red:
- http://192.168.1.X:3000
  (donde X es la IP del PC)
```

### Seguridad en Red Local

- **Autenticación JWT**: Todos los endpoints protegidos requieren token
- **Roles de usuario**: admin, cajero, supervisor
- **HTTPS opcional**: Se puede configurar certificado SSL
- **Firewall Windows**: Debe permitir puerto 3000

## Seguridad Local

### Autenticación

```javascript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// Respuesta
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "rol": "admin"
  }
}

// Uso del token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Hash de Contraseñas

- **bcrypt** con 10 rounds
- Contraseñas nunca se almacenan en texto plano
- Salt único por contraseña

### Auditoría

Todas las operaciones críticas se registran en la tabla `auditoria`:
- Ventas y anulaciones
- Cambios de precios
- Ajustes de inventario
- Cambios de configuración

## Licenciamiento por Máquina

### Generación de Licencia

```javascript
const { machineIdSync } = require('node-machine-id');

// ID único de la máquina
const machineId = machineIdSync();

// Licencia vinculada al hardware
const license = {
  machine_id: machineId,
  license_key: generateLicenseKey(machineId),
  business_name: "Mi Comercio",
  max_users: 3,
  expiration_date: "2027-12-31"
};
```

### Validación

Al iniciar, el sistema verifica:
1. Existe licencia en BD
2. `machine_id` coincide con el hardware actual
3. Licencia no ha expirado
4. Número de usuarios no excede el límite

## Estrategia de Backups

### Backups Automáticos

```javascript
// Al cerrar caja
CashRegisterService.closeCashRegister() {
  // ... cierre de caja ...
  
  if (config.backup.autoBackupOnCashClose) {
    dbManager.createBackup('cierre_caja');
  }
}
```

### Ubicación de Backups

```
/backups/
  ├─ vectra_pos_backup_2026-02-12T08-30-00.db
  ├─ vectra_pos_backup_2026-02-12T16-45-00_cierre_caja.db
  └─ vectra_pos_backup_2026-02-13T09-00-00.db
```

### Retención

- Máximo 30 backups (configurable)
- Se eliminan automáticamente los más antiguos
- Recomendado: copiar backups a USB diariamente

## Prevención de Errores de Punto Flotante

### Estrategia de Almacenamiento

**TODOS los montos se almacenan como enteros en centavos:**

```javascript
// ❌ INCORRECTO (errores de punto flotante)
const precio = 10.50;
const total = precio * 3; // 31.499999999999996

// ✅ CORRECTO (enteros en centavos)
const precioCentavos = 1050; // 10.50 USD = 1050 centavos
const totalCentavos = precioCentavos * 3; // 3150 centavos = 31.50 USD
```

### Uso de Decimal.js

Para cálculos intermedios que requieren decimales:

```javascript
const Decimal = require('decimal.js');

// Conversión USD a BS
const usdDecimal = new Decimal(usdCentavos).dividedBy(100);
const bsDecimal = usdDecimal.times(tasaBcv);
const bsCentavos = bsDecimal.times(100).toNumber();
```

### Validación de Precisión

```javascript
// Siempre redondear antes de almacenar
const centavos = Math.round(decimal.toNumber());
```

## Tecnologías Utilizadas

### Backend
- **Node.js 18+**: Runtime
- **Express.js 4**: Framework web
- **better-sqlite3**: Base de datos SQLite síncrona
- **bcrypt**: Hash de contraseñas
- **jsonwebtoken**: Autenticación JWT
- **decimal.js**: Cálculos decimales precisos
- **escpos**: Impresoras térmicas
- **serialport**: Balanzas seriales

### Frontend (a implementar)
- **React 18**: UI framework
- **Vite**: Build tool
- **React Router**: Navegación
- **Axios**: HTTP client
- **Chart.js**: Gráficos

### Empaquetado
- **Electron**: Aplicación de escritorio
- **electron-builder**: Generador de instaladores

## Escalabilidad

### Límites del Sistema

- **Productos**: ~100,000 productos sin degradación
- **Ventas**: ~500,000 ventas/año
- **Usuarios concurrentes**: 3-5 (limitado por SQLite)
- **Tamaño de BD**: ~500MB típico, ~2GB máximo recomendado

### Optimizaciones

- Índices en todas las columnas de búsqueda frecuente
- Modo WAL para mejor concurrencia
- Transacciones atómicas para operaciones complejas
- Paginación en listados grandes
