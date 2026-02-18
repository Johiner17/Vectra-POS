# Ejemplo de Flujo de Venta Completo - Vectra POS

Este documento muestra un ejemplo paso a paso de una venta completa en el sistema Vectra POS.

## Escenario

**Comercio**: Mi Bodega
**Cajero**: Juan Pérez (usuario: cajero1)
**Cliente**: María González (V-12345678)
**Fecha**: 12 de febrero de 2026
**Tasa BCV**: 36.50 Bs/USD

### Productos a Vender

1. Arroz Diana 1kg - $10.50 USD × 2 unidades
2. Aceite Primor 1L - $8.75 USD × 1 unidad
3. Azúcar 1kg - $5.20 USD × 3 unidades

**Pago**: Mixto
- $20.00 USD en efectivo
- Bs. 600.00 en transferencia

## Paso 1: Autenticación

### Request

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "cajero1",
  "password": "cajero123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "username": "cajero1",
      "nombre_completo": "Juan Pérez",
      "rol": "cajero"
    }
  }
}
```

**Token a usar**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Paso 2: Verificar Apertura de Caja

```http
GET http://localhost:3000/api/cash-register/current
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 15,
    "caja_id": 1,
    "usuario_id": 2,
    "estado": "abierta",
    "fecha_apertura": "2026-02-12T08:00:00",
    "monto_apertura_usd": 100.00,
    "monto_apertura_bs": 3650.00
  }
}
```

## Paso 3: Buscar Productos

### Producto 1: Arroz Diana 1kg

```http
GET http://localhost:3000/api/products/search?barcode=7501234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "success": true,
  "data": [{
    "id": 1,
    "codigo_barras": "7501234567890",
    "nombre": "Arroz Diana 1kg",
    "precio_venta_usd": 10.50,
    "precio_costo_usd": 8.00,
    "stock_actual": 150,
    "stock_minimo": 20,
    "aplica_iva": 1,
    "tasa_iva": 16.0,
    "categoria_nombre": "Granos"
  }]
}
```

### Producto 2: Aceite Primor 1L

```http
GET http://localhost:3000/api/products/search?barcode=7501234567891
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "success": true,
  "data": [{
    "id": 2,
    "codigo_barras": "7501234567891",
    "nombre": "Aceite Primor 1L",
    "precio_venta_usd": 8.75,
    "stock_actual": 80,
    "aplica_iva": 1,
    "tasa_iva": 16.0
  }]
}
```

### Producto 3: Azúcar 1kg

```http
GET http://localhost:3000/api/products/search?q=azucar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "success": true,
  "data": [{
    "id": 3,
    "codigo_barras": "7501234567892",
    "nombre": "Azúcar 1kg",
    "precio_venta_usd": 5.20,
    "stock_actual": 200,
    "aplica_iva": 1,
    "tasa_iva": 16.0
  }]
}
```

## Paso 4: Verificar Tasa BCV Actual

```http
GET http://localhost:3000/api/currency/rate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 45,
    "fecha": "2026-02-12",
    "tasa": 36.50,
    "fuente": "manual",
    "created_at": "2026-02-12T08:00:00"
  }
}
```

## Paso 5: Calcular Totales (Frontend)

### Cálculo Detallado

```javascript
// Tasa BCV
const tasaBcv = 36.50;

// Items del carrito
const items = [
  { id: 1, nombre: "Arroz Diana 1kg", precio_usd: 10.50, cantidad: 2, iva: 16 },
  { id: 2, nombre: "Aceite Primor 1L", precio_usd: 8.75, cantidad: 1, iva: 16 },
  { id: 3, nombre: "Azúcar 1kg", precio_usd: 5.20, cantidad: 3, iva: 16 }
];

// Cálculo por item
// Item 1: Arroz × 2
const arroz_subtotal = 10.50 * 2;           // $21.00
const arroz_iva = arroz_subtotal * 0.16;    // $3.36
const arroz_total = arroz_subtotal + arroz_iva; // $24.36

// Item 2: Aceite × 1
const aceite_subtotal = 8.75 * 1;          // $8.75
const aceite_iva = aceite_subtotal * 0.16; // $1.40
const aceite_total = aceite_subtotal + aceite_iva; // $10.15

// Item 3: Azúcar × 3
const azucar_subtotal = 5.20 * 3;          // $15.60
const azucar_iva = azucar_subtotal * 0.16; // $2.50 (redondeado)
const azucar_total = azucar_subtotal + azucar_iva; // $18.10

// Totales USD
const subtotal_usd = 21.00 + 8.75 + 15.60;  // $45.35
const iva_usd = 3.36 + 1.40 + 2.50;         // $7.26
const total_usd = subtotal_usd + iva_usd;   // $52.61

// Conversión a BS
const subtotal_bs = subtotal_usd * tasaBcv; // $45.35 × 36.50 = Bs 1655.28
const iva_bs = iva_usd * tasaBcv;           // $7.26 × 36.50 = Bs 265.00
const total_bs = total_usd * tasaBcv;       // $52.61 × 36.50 = Bs 1920.27
```

### Resumen de Totales

```
Subtotal USD: $45.35
IVA USD:       $7.26
TOTAL USD:    $52.61

Subtotal BS:  Bs 1655.28
IVA BS:       Bs 265.00
TOTAL BS:     Bs 1920.27

Tasa BCV: 36.50 Bs/USD
```

## Paso 6: Procesar Venta

### Request

```http
POST http://localhost:3000/api/sales
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "apertura_caja_id": 15,
  "cliente_id": 5,
  "moneda_venta": "USD",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 2
    },
    {
      "producto_id": 2,
      "cantidad": 1
    },
    {
      "producto_id": 3,
      "cantidad": 3
    }
  ],
  "pagos": [
    {
      "tipo_pago": "efectivo_usd",
      "moneda": "USD",
      "monto_centavos": 2000,
      "referencia": null
    },
    {
      "tipo_pago": "transferencia_bs",
      "moneda": "BS",
      "monto_centavos": 60000,
      "referencia": "REF-123456789"
    }
  ],
  "print_ticket": true,
  "observaciones": null
}
```

### Explicación de Pagos

```javascript
// Pago 1: $20.00 USD en efectivo
{
  "tipo_pago": "efectivo_usd",
  "moneda": "USD",
  "monto_centavos": 2000  // $20.00 × 100 = 2000 centavos
}

// Pago 2: Bs 600.00 en transferencia
{
  "tipo_pago": "transferencia_bs",
  "moneda": "BS",
  "monto_centavos": 60000  // Bs 600.00 × 100 = 60000 centavos
}

// Validación de pago
// Total a pagar: $52.61 USD
// Pago 1: $20.00 USD
// Pago 2: Bs 600.00 = $16.44 USD (600 / 36.50)
// Total pagado: $20.00 + $16.44 = $36.44 USD
// ❌ Falta: $52.61 - $36.44 = $16.17 USD
```

### Response (Error - Pago Insuficiente)

```json
{
  "success": false,
  "error": "El monto pagado no cubre el total de la venta"
}
```

## Paso 7: Corregir Pago y Reintentar

### Request Corregido

```http
POST http://localhost:3000/api/sales
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "apertura_caja_id": 15,
  "cliente_id": 5,
  "moneda_venta": "USD",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 2
    },
    {
      "producto_id": 2,
      "cantidad": 1
    },
    {
      "producto_id": 3,
      "cantidad": 3
    }
  ],
  "pagos": [
    {
      "tipo_pago": "efectivo_usd",
      "moneda": "USD",
      "monto_centavos": 3000,
      "referencia": null
    },
    {
      "tipo_pago": "transferencia_bs",
      "moneda": "BS",
      "monto_centavos": 85000,
      "referencia": "REF-123456789"
    }
  ],
  "print_ticket": true
}
```

### Validación de Pago Corregido

```javascript
// Total a pagar: $52.61 USD
// Pago 1: $30.00 USD
// Pago 2: Bs 850.00 = $23.29 USD (850 / 36.50)
// Total pagado: $30.00 + $23.29 = $53.29 USD
// ✅ Vuelto: $53.29 - $52.61 = $0.68 USD
```

### Response (Éxito)

```json
{
  "success": true,
  "data": {
    "id": 127,
    "numero_factura": "00000127",
    "apertura_caja_id": 15,
    "usuario_id": 2,
    "usuario_nombre": "Juan Pérez",
    "cliente_id": 5,
    "cliente_nombre": "María González",
    "tipo_documento": "V",
    "numero_documento": "12345678",
    "moneda_venta": "USD",
    "tasa_bcv_usada": 36.50,
    "subtotal_usd": 45.35,
    "iva_usd": 7.26,
    "total_usd": 52.61,
    "subtotal_bs": 1655.28,
    "iva_bs": 265.00,
    "total_bs": 1920.27,
    "estado": "completada",
    "fecha_venta": "2026-02-12T14:35:22",
    "detalles": [
      {
        "id": 301,
        "producto_id": 1,
        "nombre_producto": "Arroz Diana 1kg",
        "cantidad": 2,
        "precio_unitario_usd": 10.50,
        "subtotal_usd": 21.00,
        "iva_usd": 3.36,
        "total_usd": 24.36,
        "precio_unitario_bs": 383.25,
        "subtotal_bs": 766.50,
        "iva_bs": 122.64,
        "total_bs": 889.14
      },
      {
        "id": 302,
        "producto_id": 2,
        "nombre_producto": "Aceite Primor 1L",
        "cantidad": 1,
        "precio_unitario_usd": 8.75,
        "subtotal_usd": 8.75,
        "iva_usd": 1.40,
        "total_usd": 10.15,
        "precio_unitario_bs": 319.38,
        "subtotal_bs": 319.38,
        "iva_bs": 51.10,
        "total_bs": 370.48
      },
      {
        "id": 303,
        "producto_id": 3,
        "nombre_producto": "Azúcar 1kg",
        "cantidad": 3,
        "precio_unitario_usd": 5.20,
        "subtotal_usd": 15.60,
        "iva_usd": 2.50,
        "total_usd": 18.10,
        "precio_unitario_bs": 189.80,
        "subtotal_bs": 569.40,
        "iva_bs": 91.10,
        "total_bs": 660.50
      }
    ],
    "pagos": [
      {
        "id": 201,
        "tipo_pago": "efectivo_usd",
        "moneda": "USD",
        "monto": 30.00,
        "referencia": null
      },
      {
        "id": 202,
        "tipo_pago": "transferencia_bs",
        "moneda": "BS",
        "monto": 850.00,
        "referencia": "REF-123456789"
      }
    ],
    "warnings": []
  },
  "message": "Venta procesada correctamente"
}
```

## Paso 8: Ticket Impreso

```
================================
        MI BODEGA
     RIF: J-123456789
   Av. Principal, Local 5
    Tel: 0412-1234567
================================
Factura: 00000127
Fecha: 12/02/2026 14:35
Cajero: Juan Pérez
Cliente: María González
Doc: V-12345678
================================
CANT  DESCRIPCION    PRECIO  TOTAL
2     Arroz Diana    $10.50  $21.00
      1kg
      (Bs)           Bs383.25Bs766.50

1     Aceite Primor   $8.75   $8.75
      1L
      (Bs)           Bs319.38Bs319.38

3     Azúcar 1kg      $5.20  $15.60
      (Bs)           Bs189.80Bs569.40
================================
              Subtotal USD: $45.35
                   IVA USD:  $7.26
              TOTAL USD:    $52.61

              Subtotal Bs:  Bs1655.28
                   IVA Bs:  Bs265.00
              TOTAL Bs:     Bs1920.27
================================
      Tasa BCV: 36.50 Bs/USD
================================
FORMA DE PAGO:
Efectivo USD: $30.00
Transferencia Bs: Bs850.00
  Ref: REF-123456789

VUELTO USD: $0.68
================================
      GRACIAS POR SU COMPRA
      Sistema: Vectra POS
```

## Paso 9: Actualización de Inventario

El sistema automáticamente:

1. **Registra movimientos en Kardex**:
   - Arroz Diana 1kg: -2 unidades (stock: 150 → 148)
   - Aceite Primor 1L: -1 unidad (stock: 80 → 79)
   - Azúcar 1kg: -3 unidades (stock: 200 → 197)

2. **Actualiza stock en productos**

3. **Registra en auditoría**:
   - Usuario: Juan Pérez
   - Acción: VENTA
   - Tabla: ventas
   - Registro ID: 127

## Paso 10: Consultar Venta

```http
GET http://localhost:3000/api/sales/127
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Retorna los mismos datos de la venta procesada.

## Resumen del Flujo

1. ✅ Autenticación del cajero
2. ✅ Verificación de caja abierta
3. ✅ Búsqueda de productos (por código de barras o nombre)
4. ✅ Verificación de tasa BCV actual
5. ✅ Cálculo de totales (frontend)
6. ✅ Procesamiento de venta con validación de stock
7. ✅ Validación de pagos mixtos
8. ✅ Generación de número de factura correlativo
9. ✅ Actualización automática de inventario
10. ✅ Impresión de ticket fiscal
11. ✅ Registro en auditoría

## Características Demostradas

- ✅ Multimoneda (USD/BS con conversión automática)
- ✅ Pagos mixtos (efectivo USD + transferencia BS)
- ✅ Cálculo de IVA por producto
- ✅ Validación de stock disponible
- ✅ Actualización automática de inventario
- ✅ Kardex completo
- ✅ Numeración correlativa de facturas
- ✅ Impresión de ticket fiscal
- ✅ Datos de cliente en factura
- ✅ Referencia de pago en transferencias
- ✅ Cálculo de vuelto
- ✅ Auditoría completa
- ✅ Sin errores de punto flotante (todo en centavos)
