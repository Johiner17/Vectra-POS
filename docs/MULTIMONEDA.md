# Sistema Multimoneda USD/BS - Vectra POS

## Problema a Resolver

En Venezuela, los comercios deben manejar simultáneamente:
- Precios en USD (dólares estadounidenses)
- Conversión a BS (bolívares) usando tasa BCV
- Pagos mixtos (parte en USD, parte en BS)
- Cálculos exactos sin errores de redondeo

Los errores de punto flotante en JavaScript pueden causar:
```javascript
0.1 + 0.2 = 0.30000000000000004 // ❌ Inaceptable en finanzas
```

## Solución: Almacenamiento en Centavos (Enteros)

### Principio Fundamental

**TODOS los montos se almacenan como enteros en centavos**

```
10.50 USD → 1050 centavos
36.50 BS → 3650 centavos
```

### Ventajas

✅ Sin errores de punto flotante
✅ Operaciones aritméticas exactas
✅ Comparaciones precisas
✅ Cumplimiento fiscal

## Implementación

### 1. Conversión de Entrada

```javascript
// CurrencyUtils.toCentavos()
function toCentavos(amount) {
  const decimal = new Decimal(amount);
  const centavos = decimal.times(100).toNumber();
  return Math.round(centavos);
}

// Ejemplo
toCentavos(10.50) // → 1050
toCentavos(0.01)  // → 1
toCentavos(99.99) // → 9999
```

### 2. Conversión de Salida

```javascript
// CurrencyUtils.fromCentavos()
function fromCentavos(centavos) {
  const decimal = new Decimal(centavos);
  return decimal.dividedBy(100).toNumber();
}

// Ejemplo
fromCentavos(1050) // → 10.50
fromCentavos(1)    // → 0.01
fromCentavos(9999) // → 99.99
```

### 3. Conversión USD ↔ BS

```javascript
// USD a BS
function convertUsdToBs(usdCentavos, tasaBcv) {
  // 1. Convertir centavos a decimal
  const usdDecimal = new Decimal(usdCentavos).dividedBy(100);
  
  // 2. Multiplicar por tasa BCV
  const bsDecimal = usdDecimal.times(tasaBcv);
  
  // 3. Convertir a centavos
  const bsCentavos = bsDecimal.times(100);
  
  // 4. Redondear a entero
  return Math.round(bsCentavos.toNumber());
}

// Ejemplo
// 10.50 USD con tasa 36.50 Bs/USD
convertUsdToBs(1050, 36.50)
// → 1050 / 100 = 10.50
// → 10.50 * 36.50 = 383.25
// → 383.25 * 100 = 38325
// → 38325 centavos = 383.25 BS ✅
```

### 4. Cálculo de IVA

```javascript
function calcularIva(montoCentavos, tasaIva) {
  const montoDecimal = new Decimal(montoCentavos);
  const ivaDecimal = montoDecimal.times(tasaIva).dividedBy(100);
  return Math.round(ivaDecimal.toNumber());
}

// Ejemplo: 16% IVA sobre 1050 centavos
calcularIva(1050, 16)
// → 1050 * 16 / 100 = 168 centavos ✅
```

## Flujo Completo de Venta

### Ejemplo Real

**Producto**: Arroz 1kg
- Precio: $10.50 USD
- IVA: 16%
- Cantidad: 3 unidades
- Tasa BCV: 36.50 Bs/USD

### Paso 1: Almacenamiento en BD

```sql
INSERT INTO productos (nombre, precio_venta_usd_centavos, tasa_iva)
VALUES ('Arroz 1kg', 1050, 16.0);
```

### Paso 2: Cálculo de Venta

```javascript
const precioUnitarioCentavos = 1050; // $10.50
const cantidad = 3;
const tasaIva = 16;
const tasaBcv = 36.50;

// Subtotal USD
const subtotalUsdCentavos = precioUnitarioCentavos * cantidad;
// 1050 * 3 = 3150 centavos = $31.50

// IVA USD
const ivaUsdCentavos = calcularIva(subtotalUsdCentavos, tasaIva);
// 3150 * 16 / 100 = 504 centavos = $5.04

// Total USD
const totalUsdCentavos = subtotalUsdCentavos + ivaUsdCentavos;
// 3150 + 504 = 3654 centavos = $36.54

// Conversión a BS
const subtotalBsCentavos = convertUsdToBs(subtotalUsdCentavos, tasaBcv);
// 3150 → $31.50 * 36.50 = 1149.75 BS = 114975 centavos

const ivaBsCentavos = convertUsdToBs(ivaUsdCentavos, tasaBcv);
// 504 → $5.04 * 36.50 = 183.96 BS = 18396 centavos

const totalBsCentavos = convertUsdToBs(totalUsdCentavos, tasaBcv);
// 3654 → $36.54 * 36.50 = 1333.71 BS = 133371 centavos
```

### Paso 3: Almacenamiento de Venta

```sql
INSERT INTO ventas (
  subtotal_usd_centavos, iva_usd_centavos, total_usd_centavos,
  subtotal_bs_centavos, iva_bs_centavos, total_bs_centavos,
  tasa_bcv_usada
) VALUES (
  3150, 504, 3654,
  114975, 18396, 133371,
  36.50
);
```

### Paso 4: Mostrar al Usuario

```javascript
// Frontend recibe centavos y convierte para mostrar
{
  subtotal_usd: fromCentavos(3150),  // $31.50
  iva_usd: fromCentavos(504),        // $5.04
  total_usd: fromCentavos(3654),     // $36.54
  subtotal_bs: fromCentavos(114975), // Bs. 1149.75
  iva_bs: fromCentavos(18396),       // Bs. 183.96
  total_bs: fromCentavos(133371)     // Bs. 1333.71
}
```

## Pagos Mixtos

### Escenario

Total a pagar: $36.54 USD (3654 centavos)

Cliente paga:
- $20.00 USD en efectivo
- Bs. 600.00 en transferencia

### Cálculo

```javascript
const totalCentavos = 3654; // $36.54
const tasaBcv = 36.50;

const pagos = [
  { tipo: 'efectivo_usd', moneda: 'USD', monto_centavos: 2000 }, // $20.00
  { tipo: 'transferencia_bs', moneda: 'BS', monto_centavos: 60000 } // Bs. 600.00
];

// Convertir todo a USD para calcular
let totalPagadoUsdCentavos = 0;

pagos.forEach(pago => {
  if (pago.moneda === 'USD') {
    totalPagadoUsdCentavos += pago.monto_centavos;
  } else {
    // Convertir BS a USD
    const usdCentavos = convertBsToUsd(pago.monto_centavos, tasaBcv);
    totalPagadoUsdCentavos += usdCentavos;
  }
});

// Pago 1: $20.00 = 2000 centavos
// Pago 2: Bs. 600.00 = 60000 centavos
//         60000 / 100 = 600 BS
//         600 / 36.50 = 16.44 USD
//         16.44 * 100 = 1644 centavos

// Total pagado: 2000 + 1644 = 3644 centavos = $36.44

// Vuelto
const vueltoCentavos = totalPagadoUsdCentavos - totalCentavos;
// 3644 - 3654 = -10 centavos

// ❌ Pago insuficiente por $0.10
```

## Congelamiento de Deuda en USD

### Concepto

Cuando un cliente compra a crédito, la deuda se "congela" en USD para proteger al comercio de la devaluación.

### Implementación

```javascript
// Venta a crédito
const venta = {
  total_usd_centavos: 3654,  // $36.54
  total_bs_centavos: 133371,  // Bs. 1333.71 (tasa 36.50)
  moneda_deuda: 'USD',        // ← Deuda congelada en USD
  tasa_bcv_venta: 36.50
};

// 7 días después, tasa BCV = 40.00
// Cliente paga en BS

const tasaBcvActual = 40.00;
const deudaUsdCentavos = 3654; // Sigue siendo $36.54

// Calcular cuántos BS debe pagar HOY
const bsAPagarCentavos = convertUsdToBs(deudaUsdCentavos, tasaBcvActual);
// 3654 → $36.54 * 40.00 = 1461.60 BS = 146160 centavos

// El cliente paga Bs. 1461.60 (no Bs. 1333.71)
// El comercio está protegido de la devaluación ✅
```

## Redondeo Fiscal

### Normativa Venezolana

Los montos en bolívares deben redondearse a 2 decimales.

### Implementación

```javascript
function redondearFiscal(centavos) {
  // Ya está en centavos (2 decimales implícitos)
  // Solo asegurar que sea entero
  return Math.round(centavos);
}

// Ejemplo
const bs = 1333.706; // Resultado de conversión
const bsCentavos = Math.round(bs * 100); // 133371 centavos
const bsRedondeado = bsCentavos / 100;   // 1333.71 BS ✅
```

## Validaciones Críticas

### 1. Validar Precisión

```javascript
// Antes de almacenar
if (!Number.isInteger(centavos)) {
  throw new Error('Los centavos deben ser un entero');
}

if (centavos < 0) {
  throw new Error('Los montos no pueden ser negativos');
}
```

### 2. Validar Conversiones

```javascript
// Después de convertir
const maxSafeInteger = Number.MAX_SAFE_INTEGER; // 9007199254740991

if (centavos > maxSafeInteger) {
  throw new Error('Monto excede el límite seguro de JavaScript');
}
```

### 3. Validar Pagos

```javascript
function validatePayment(totalCentavos, pagosCentavos) {
  const totalPagado = pagosCentavos.reduce((sum, p) => sum + p, 0);
  
  if (totalPagado < totalCentavos) {
    const faltante = fromCentavos(totalCentavos - totalPagado);
    throw new Error(`Pago insuficiente. Falta: $${faltante}`);
  }
  
  return true;
}
```

## Casos de Prueba

### Test 1: Conversión Básica

```javascript
assert(toCentavos(10.50) === 1050);
assert(fromCentavos(1050) === 10.50);
```

### Test 2: Conversión USD a BS

```javascript
const result = convertUsdToBs(1050, 36.50);
assert(result === 38325); // 10.50 * 36.50 = 383.25 BS
```

### Test 3: Cálculo de IVA

```javascript
const iva = calcularIva(1050, 16);
assert(iva === 168); // 10.50 * 0.16 = 1.68
```

### Test 4: Venta Completa

```javascript
const venta = calculateSaleTotals([
  { producto_id: 1, cantidad: 3, precio_unitario_usd: 10.50 }
], 36.50);

assert(venta.totales.total_usd_centavos === 3654);
assert(venta.totales.total_bs_centavos === 133371);
```

## Mejores Prácticas

### ✅ Hacer

- Almacenar SIEMPRE en centavos
- Usar Decimal.js para cálculos intermedios
- Redondear antes de almacenar
- Validar rangos de valores
- Guardar tasa BCV usada en cada venta

### ❌ No Hacer

- Almacenar decimales directamente
- Usar operadores aritméticos con decimales
- Confiar en redondeo automático de JavaScript
- Omitir validaciones de precisión
- Asumir que 0.1 + 0.2 = 0.3

## Resumen

El sistema multimoneda de Vectra POS garantiza:

✅ **Precisión absoluta**: Sin errores de punto flotante
✅ **Cumplimiento fiscal**: Cálculos exactos de IVA
✅ **Protección cambiaria**: Deudas congeladas en USD
✅ **Pagos mixtos**: Soporte completo USD + BS
✅ **Auditoría**: Tasa BCV registrada en cada venta
✅ **Escalabilidad**: Soporta millones de transacciones sin degradación
