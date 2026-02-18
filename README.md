# Vectra POS - Sistema POS Offline Profesional

Sistema punto de venta offline diseñado para pequeños comercios en Venezuela, con soporte completo para multimoneda (USD/BS), gestión fiscal, integración de hardware, y funcionamiento 100% sin internet.

## 🎯 Características Principales

### ✅ Multimoneda USD/BS
- Precios en USD con conversión automática a BS
- Registro manual de tasa BCV diaria
- Pagos mixtos (USD + BS)
- Congelamiento de deudas en USD
- **Sin errores de punto flotante** (almacenamiento en centavos)

### ✅ Inventario Profesional
- Kardex completo con historial de movimientos
- Cálculo automático de costo promedio ponderado
- Alertas de stock mínimo
- Soporte para venta por unidad, peso y bulto
- Entradas, salidas y ajustes de inventario

### ✅ Facturación Fiscal
- Numeración correlativa automática
- Cálculo de IVA configurable
- Datos fiscales completos (RIF, razón social)
- Generación de tickets térmicos
- Reportes Z de cierre de caja

### ✅ Integración de Hardware
- **Impresoras térmicas** ESC/POS (58mm y 80mm)
- **Lectores de código de barras** (modo teclado HID)
- **Balanzas seriales** RS232 (protocolos Toledo y Systel)

### ✅ Gestión de Caja
- Apertura y cierre de caja con arqueo
- Control de diferencias de efectivo
- Reportes por turno y usuario
- Backups automáticos al cerrar caja

### ✅ Seguridad
- Autenticación JWT
- Hash de contraseñas con bcrypt
- Roles de usuario (admin, cajero, supervisor)
- Auditoría completa de operaciones
- Licenciamiento por máquina

### ✅ Acceso en Red Local
- Servidor accesible desde cualquier dispositivo en la red
- Interfaz web responsive
- Soporte para tablets y móviles
- Sin necesidad de internet

## 📋 Requisitos del Sistema

### Hardware Mínimo
- **Procesador**: Intel Core i3 o equivalente
- **RAM**: 4 GB
- **Disco**: 10 GB disponibles
- **Sistema Operativo**: Windows 10/11 (64-bit)
- **Red**: Tarjeta de red para acceso local

### Hardware Recomendado
- **Procesador**: Intel Core i5 o superior
- **RAM**: 8 GB
- **Disco**: SSD con 20 GB disponibles
- **Impresora térmica**: USB, compatible ESC/POS
- **Lector de código de barras**: USB, modo teclado (HID)
- **Balanza**: Serial RS232 (opcional)

## 🚀 Instalación

### 1. Instalar Node.js

Descargar e instalar Node.js 18 o superior desde [nodejs.org](https://nodejs.org)

### 2. Clonar o Descargar el Proyecto

```bash
cd c:\proyectos
# El proyecto ya está en "Vectra POS"
```

### Backend (Servidor)

1.  Navegar a la carpeta `backend`:
    ```bash
    cd "c:\proyectos\Vectra POS\backend"
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Iniciar servidor:
    ```bash
    npm start
    ```
    El servidor correrá en `http://localhost:3000`.

### Frontend (Interfaz de Usuario)

1.  Navegar a la carpeta `frontend`:
    ```bash
    cd "c:\proyectos\Vectra POS\frontend"
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Iniciar en modo desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173`.

### 4. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env con los datos de tu negocio
notepad .env
```

**Configuraciones importantes en `.env`:**
```env
# Datos del negocio
BUSINESS_NAME=Mi Comercio
BUSINESS_RIF=J-123456789
BUSINESS_ADDRESS=Dirección del comercio
BUSINESS_PHONE=0412-1234567

# Seguridad (CAMBIAR en producción)
JWT_SECRET=tu_secreto_super_seguro_aqui

# Impuestos
IVA_RATE=16
```

### 5. Inicializar la Base de Datos

```bash
npm run init-db
```

Esto creará:
- Base de datos SQLite con todas las tablas
- Usuario administrador por defecto
  - **Usuario**: `admin`
  - **Contraseña**: `admin123` ⚠️ **CAMBIAR EN PRODUCCIÓN**
- Tasa BCV inicial (debe actualizarse)
- Configuraciones por defecto

### 6. Iniciar el Servidor

```bash
npm start
```

El servidor estará disponible en:
- **Local**: http://localhost:3000
- **Red local**: http://[IP-DE-TU-PC]:3000

## 📱 Acceso desde Dispositivos Móviles

### 1. Obtener la IP del PC

```bash
ipconfig
```

Buscar "Dirección IPv4" (ejemplo: 192.168.1.100)

### 2. Configurar Firewall de Windows

```bash
# Permitir puerto 3000 en el firewall
netsh advfirewall firewall add rule name="Vectra POS" dir=in action=allow protocol=TCP localport=3000
```

### 3. Acceder desde Móvil/Tablet

En el navegador del dispositivo móvil (conectado a la misma red):
```
http://192.168.1.100:3000
```

## 🔧 Configuración Inicial

### 1. Cambiar Contraseña del Administrador

```javascript
// TODO: Implementar endpoint de cambio de contraseña
POST /api/auth/change-password
{
  "old_password": "admin123",
  "new_password": "nueva_contraseña_segura"
}
```

### 2. Registrar Tasa BCV del Día

```javascript
POST /api/currency/rate
Authorization: Bearer [token]
{
  "fecha": "2026-02-12",
  "tasa": 36.50,
  "fuente": "manual"
}
```

### 3. Crear Productos

```javascript
POST /api/products
Authorization: Bearer [token]
{
  "codigo_barras": "7501234567890",
  "nombre": "Arroz 1kg",
  "categoria_id": 1,
  "precio_venta_usd": 10.50,
  "precio_costo_usd": 8.00,
  "stock_actual": 100,
  "stock_minimo": 10,
  "unidad_medida": "unidad",
  "aplica_iva": 1,
  "tasa_iva": 16.0
}
```

### 4. Abrir Caja

```javascript
// TODO: Implementar endpoint de apertura de caja
POST /api/cash-register/open
Authorization: Bearer [token]
{
  "caja_id": 1,
  "monto_apertura_usd": 100.00,
  "monto_apertura_bs": 3650.00
}
```

## 💰 Flujo de Venta Completo

### 1. Buscar Producto

```javascript
GET /api/products/search?barcode=7501234567890
Authorization: Bearer [token]

// Respuesta
{
  "success": true,
  "data": [{
    "id": 1,
    "codigo_barras": "7501234567890",
    "nombre": "Arroz 1kg",
    "precio_venta_usd": 10.50,
    "stock_actual": 100,
    "aplica_iva": 1,
    "tasa_iva": 16.0
  }]
}
```

### 2. Procesar Venta

```javascript
POST /api/sales
Authorization: Bearer [token]
{
  "apertura_caja_id": 1,
  "cliente_id": null,
  "moneda_venta": "USD",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 3
    }
  ],
  "pagos": [
    {
      "tipo_pago": "efectivo_usd",
      "moneda": "USD",
      "monto_centavos": 4000
    }
  ],
  "print_ticket": true,
  "observaciones": null
}

// Respuesta
{
  "success": true,
  "data": {
    "id": 1,
    "numero_factura": "00000001",
    "total_usd": 36.54,
    "total_bs": 1333.71,
    "tasa_bcv_usada": 36.50,
    "fecha_venta": "2026-02-12T12:30:00",
    "warnings": []
  },
  "message": "Venta procesada correctamente"
}
```

### 3. Ticket Impreso

```
================================
        MI COMERCIO
     RIF: J-123456789
  Dirección del comercio
    Tel: 0412-1234567
================================
Factura: 00000001
Fecha: 12/02/2026 12:30
Cajero: Administrador
================================
CANT  DESCRIPCION    PRECIO  TOTAL
3     Arroz 1kg      $10.50  $31.50
      (Bs)           Bs36.50 Bs1149.75
================================
              Subtotal USD: $31.50
                   IVA USD:  $5.04
              TOTAL USD:    $36.54

              Subtotal Bs:  Bs1149.75
                   IVA Bs:  Bs183.96
              TOTAL Bs:     Bs1333.71
================================
      Tasa BCV: 36.50 Bs/USD
================================
FORMA DE PAGO:
Efectivo USD: $40.00
================================
      GRACIAS POR SU COMPRA
      Sistema: Vectra POS
```

## 📊 Estructura del Proyecto

```
Vectra POS/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuraciones
│   │   ├── database/        # Esquema y migraciones
│   │   ├── repositories/    # Acceso a datos
│   │   ├── services/        # Lógica de negocio
│   │   ├── controllers/     # Controladores API
│   │   ├── routes/          # Rutas HTTP
│   │   ├── middleware/      # Autenticación, errores
│   │   ├── hardware/        # Impresoras, balanzas
│   │   ├── utils/           # Utilidades
│   │   └── server.js        # Servidor Express
│   ├── tests/               # Tests
│   ├── package.json
│   └── .env
├── frontend/                # (A implementar)
├── electron/                # (A implementar)
├── docs/                    # Documentación
│   ├── ARCHITECTURE.md
│   ├── MULTIMONEDA.md
│   ├── DATABASE.md
│   └── HARDWARE.md
└── README.md
```

## 📚 Documentación

- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Sistema Multimoneda](docs/MULTIMONEDA.md)
- [Base de Datos](docs/DATABASE.md)
- [Integración de Hardware](docs/HARDWARE.md)
- [Guía de Despliegue](docs/DEPLOYMENT.md)

## 🔒 Seguridad

### Autenticación

Todas las rutas (excepto `/health`) requieren autenticación JWT:

```javascript
// 1. Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// 2. Usar token en requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Roles

- **admin**: Acceso completo
- **supervisor**: Puede anular ventas
- **cajero**: Solo ventas y consultas

## 🛠️ Mantenimiento

### Backups

Los backups se crean automáticamente:
- Al cerrar caja (si está configurado)
- Ubicación: `backend/backups/`
- Retención: 30 backups (configurable)

**Recomendación**: Copiar backups a USB diariamente

### Actualizar Tasa BCV

Debe hacerse manualmente cada día:

```javascript
POST /api/currency/rate
{
  "fecha": "2026-02-13",
  "tasa": 37.20,
  "fuente": "manual"
}
```

### Ver Productos con Stock Bajo

```javascript
GET /api/products/low-stock
```

## ⚠️ Solución de Problemas

### La impresora no imprime

1. Verificar que esté conectada por USB
2. Verificar drivers instalados
3. Revisar configuración en `.env`:
   ```env
   PRINTER_TYPE=usb
   PRINTER_WIDTH=58
   ```

### No puedo acceder desde móvil

1. Verificar que estén en la misma red WiFi
2. Verificar firewall de Windows:
   ```bash
   netsh advfirewall firewall show rule name="Vectra POS"
   ```
3. Verificar IP del PC con `ipconfig`

### Error "Token expirado"

Volver a hacer login para obtener un nuevo token.

### Error "Stock insuficiente"

Verificar stock del producto:
```javascript
GET /api/products/1
```

Ajustar inventario si es necesario.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@vectrapos.com (ejemplo)
- Documentación: Ver carpeta `docs/`

## 📄 Licencia

Propietario. Todos los derechos reservados.

## 🙏 Créditos

Desarrollado con:
- Node.js + Express
- SQLite (better-sqlite3)
- React (frontend)
- Electron (empaquetado)
- decimal.js (precisión numérica)
- escpos (impresoras térmicas)

---

**Vectra POS** - Sistema POS Profesional para Venezuela 🇻🇪
