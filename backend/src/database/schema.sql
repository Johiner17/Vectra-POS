-- ============================================
-- SCHEMA DE BASE DE DATOS - VECTRA POS
-- Sistema POS Offline Profesional
-- ============================================

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'cajero', 'supervisor')),
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Tabla de categorías de productos
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_categorias_activo ON categorias(activo);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER,
    
    -- Precios en centavos (USD) - almacenados como enteros
    precio_venta_usd_centavos INTEGER NOT NULL,
    precio_costo_usd_centavos INTEGER NOT NULL DEFAULT 0,
    
    -- Control de inventario
    stock_actual REAL NOT NULL DEFAULT 0,
    stock_minimo REAL NOT NULL DEFAULT 0,
    unidad_medida TEXT NOT NULL DEFAULT 'unidad' CHECK(unidad_medida IN ('unidad', 'peso', 'bulto')),
    unidades_por_bulto INTEGER DEFAULT 1,
    
    -- Impuestos
    aplica_iva INTEGER NOT NULL DEFAULT 1,
    tasa_iva REAL NOT NULL DEFAULT 16.0,
    
    -- Control
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento TEXT NOT NULL DEFAULT 'V' CHECK(tipo_documento IN ('V', 'E', 'J', 'G', 'P')),
    numero_documento TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    UNIQUE(tipo_documento, numero_documento)
);

CREATE INDEX idx_clientes_documento ON clientes(tipo_documento, numero_documento);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);

-- Tabla de tasas de cambio BCV
CREATE TABLE IF NOT EXISTS tasas_bcv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL UNIQUE,
    tasa REAL NOT NULL,
    fuente TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_tasas_bcv_fecha ON tasas_bcv(fecha DESC);

-- Tabla de cajas (puntos de venta)
CREATE TABLE IF NOT EXISTS cajas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de aperturas y cierres de caja
CREATE TABLE IF NOT EXISTS aperturas_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    
    -- Montos de apertura en centavos
    monto_apertura_usd_centavos INTEGER NOT NULL DEFAULT 0,
    monto_apertura_bs_centavos INTEGER NOT NULL DEFAULT 0,
    
    -- Montos de cierre en centavos (NULL si aún está abierta)
    monto_cierre_usd_centavos INTEGER,
    monto_cierre_bs_centavos INTEGER,
    
    -- Montos esperados vs reales
    monto_esperado_usd_centavos INTEGER,
    monto_esperado_bs_centavos INTEGER,
    diferencia_usd_centavos INTEGER,
    diferencia_bs_centavos INTEGER,
    
    -- Control de estado
    estado TEXT NOT NULL DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada')),
    fecha_apertura TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    fecha_cierre TEXT,
    observaciones TEXT,
    
    FOREIGN KEY (caja_id) REFERENCES cajas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_aperturas_caja_estado ON aperturas_caja(estado);
CREATE INDEX idx_aperturas_caja_fecha ON aperturas_caja(fecha_apertura DESC);

-- Tabla de ventas (encabezado)
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_factura TEXT NOT NULL UNIQUE,
    apertura_caja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    
    -- Moneda principal de la venta
    moneda_venta TEXT NOT NULL DEFAULT 'USD' CHECK(moneda_venta IN ('USD', 'BS')),
    tasa_bcv_usada REAL NOT NULL,
    
    -- Subtotales en centavos (USD)
    subtotal_usd_centavos INTEGER NOT NULL,
    iva_usd_centavos INTEGER NOT NULL,
    total_usd_centavos INTEGER NOT NULL,
    
    -- Totales en centavos (BS) - calculados con tasa BCV
    subtotal_bs_centavos INTEGER NOT NULL,
    iva_bs_centavos INTEGER NOT NULL,
    total_bs_centavos INTEGER NOT NULL,
    
    -- Control
    estado TEXT NOT NULL DEFAULT 'completada' CHECK(estado IN ('completada', 'anulada')),
    fecha_venta TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    observaciones TEXT,
    
    FOREIGN KEY (apertura_caja_id) REFERENCES aperturas_caja(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE INDEX idx_ventas_numero_factura ON ventas(numero_factura);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta DESC);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_apertura ON ventas(apertura_caja_id);

-- Tabla de detalle de ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    
    cantidad REAL NOT NULL,
    
    -- Precios unitarios en centavos (USD)
    precio_unitario_usd_centavos INTEGER NOT NULL,
    subtotal_usd_centavos INTEGER NOT NULL,
    iva_usd_centavos INTEGER NOT NULL,
    total_usd_centavos INTEGER NOT NULL,
    
    -- Precios en BS (calculados con tasa BCV)
    precio_unitario_bs_centavos INTEGER NOT NULL,
    subtotal_bs_centavos INTEGER NOT NULL,
    iva_bs_centavos INTEGER NOT NULL,
    total_bs_centavos INTEGER NOT NULL,
    
    -- Datos del producto al momento de la venta
    nombre_producto TEXT NOT NULL,
    tasa_iva REAL NOT NULL,
    
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto ON detalle_ventas(producto_id);

-- Tabla de pagos (soporta pagos mixtos)
CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    
    tipo_pago TEXT NOT NULL CHECK(tipo_pago IN ('efectivo_usd', 'efectivo_bs', 'transferencia_usd', 'transferencia_bs', 'punto_venta', 'credito')),
    moneda TEXT NOT NULL CHECK(moneda IN ('USD', 'BS')),
    
    -- Monto en centavos
    monto_centavos INTEGER NOT NULL,
    
    referencia TEXT,
    fecha_pago TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

CREATE INDEX idx_pagos_venta ON pagos(venta_id);
CREATE INDEX idx_pagos_tipo ON pagos(tipo_pago);

-- Tabla de movimientos de inventario (Kardex)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK(tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'venta', 'devolucion')),
    
    cantidad REAL NOT NULL,
    
    -- Costo unitario en centavos (USD)
    costo_unitario_usd_centavos INTEGER NOT NULL DEFAULT 0,
    
    -- Stock antes y después del movimiento
    stock_anterior REAL NOT NULL,
    stock_nuevo REAL NOT NULL,
    
    -- Costo promedio antes y después (en centavos USD)
    costo_promedio_anterior_centavos INTEGER NOT NULL DEFAULT 0,
    costo_promedio_nuevo_centavos INTEGER NOT NULL DEFAULT 0,
    
    -- Referencias
    venta_id INTEGER,
    usuario_id INTEGER NOT NULL,
    
    observaciones TEXT,
    fecha_movimiento TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento DESC);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);

-- Tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS configuraciones (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    accion TEXT NOT NULL,
    tabla TEXT NOT NULL,
    registro_id INTEGER,
    datos_anteriores TEXT,
    datos_nuevos TEXT,
    ip_address TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_auditoria_fecha ON auditoria(fecha DESC);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);

-- Tabla de licencias
CREATE TABLE IF NOT EXISTS licencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL UNIQUE,
    license_key TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    max_users INTEGER NOT NULL DEFAULT 3,
    expiration_date TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- NOTA: El usuario admin se crea en init.js con hash bcrypt real.
-- No insertar aquí un hash falso.

-- Caja por defecto
INSERT OR IGNORE INTO cajas (id, nombre, descripcion, activo) 
VALUES (1, 'Caja Principal', 'Caja principal del comercio', 1);

-- Categoría por defecto
INSERT OR IGNORE INTO categorias (id, nombre, descripcion, activo) 
VALUES (1, 'General', 'Categoría general', 1);

-- Configuraciones iniciales
INSERT OR IGNORE INTO configuraciones (clave, valor, descripcion) VALUES
('ultimo_numero_factura', '0', 'Último número de factura generado'),
('tasa_iva_default', '16.0', 'Tasa de IVA por defecto'),
('permitir_venta_sin_stock', '0', 'Permitir ventas sin stock disponible'),
('redondeo_bs', '2', 'Decimales para redondeo en bolívares'),
('sistema_inicializado', '1', 'Indica si el sistema fue inicializado');

-- Tasa BCV inicial (debe actualizarse manualmente)
INSERT OR IGNORE INTO tasas_bcv (fecha, tasa, fuente) 
VALUES (date('now'), 36.50, 'inicial');
