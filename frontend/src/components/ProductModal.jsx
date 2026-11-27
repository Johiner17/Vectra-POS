import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Save, Trash2, Image as ImageIcon, QrCode, Infinity as InfinityIcon } from 'lucide-react';
import { productRepository } from '../services/productRepository';
import { useIsMobile } from '../hooks/useIsMobile';

const ProductModal = ({ isOpen, onClose, product, onSave }) => {
    const isMobile = useIsMobile();
    const [formData, setFormData] = useState({
        codigo_barras: '',
        nombre: '',
        categoria_id: 1,
        precio_venta_usd: '',
        precio_costo_usd: '',
        stock_actual: 0,
        stock_minimo: 5,
        sin_control_stock: false,
        unidad_medida: 'UNIDAD',
        aplica_iva: 1,
        tasa_iva: 16.00,
        imagen: ''
    });

    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                precio_venta_usd:
                    product.precio_venta_usd_centavos !== undefined && product.precio_venta_usd_centavos !== null
                        ? product.precio_venta_usd_centavos / 100
                        : '',
                precio_costo_usd:
                    product.precio_costo_usd_centavos !== undefined && product.precio_costo_usd_centavos !== null
                        ? product.precio_costo_usd_centavos / 100
                        : '',
                sin_control_stock: Boolean(product.sin_control_stock),
                imagen: product.imagen || ''
            });
        } else {
            setFormData({
                codigo_barras: '',
                nombre: '',
                categoria_id: 1,
                precio_venta_usd: '',
                precio_costo_usd: '',
                stock_actual: 0,
                stock_minimo: 5,
                sin_control_stock: false,
                unidad_medida: 'UNIDAD',
                aplica_iva: 1,
                tasa_iva: 16.00,
                imagen: ''
            });
        }
    }, [product, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Compresión y redimensionamiento inteligente mediante Canvas
    const processFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecciona un archivo de imagen válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 320;
                const MAX_HEIGHT = 320;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
                setFormData(prev => ({ ...prev, imagen: compressedBase64 }));
                toast.success('Imagen cargada con éxito');
            };
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const removeImage = (e) => {
        e.stopPropagation();
        setFormData(prev => ({ ...prev, imagen: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('Imagen eliminada');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const {
                precio_venta_usd_centavos: _ignoredVentaCentavos,
                precio_costo_usd_centavos: _ignoredCostoCentavos,
                ...cleanFormData
            } = formData;

            const payload = {
                ...cleanFormData,
                sin_control_stock: Boolean(formData.sin_control_stock),
                stock_actual: formData.sin_control_stock ? 0 : (Number(formData.stock_actual) || 0),
                stock_minimo: formData.sin_control_stock ? 0 : (Number(formData.stock_minimo) || 0),
                precio_venta_usd: parseFloat(formData.precio_venta_usd) || 0,
                precio_costo_usd: parseFloat(formData.precio_costo_usd) || 0,
            };

            if (product) {
                await productRepository.update(product.id, payload);
                toast.success('Producto actualizado');
            } else {
                await productRepository.create(payload);
                toast.success('Producto creado');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            const rawMsg = error.response?.data?.error || error.message || '';
            let msg = 'Error guardando producto';

            if (rawMsg.includes('UNIQUE constraint failed: productos.codigo_barras')) {
                msg = `El código "${formData.codigo_barras}" ya está registrado.`;
            } else if (rawMsg) {
                msg = rawMsg;
            }

            toast.error(msg, { duration: 4000 });
        }
    };

    if (!isOpen) return null;

    const labelStyle = {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: '#334155',
        marginBottom: '0.4rem',
        lineHeight: 1.2
    };

    const inputStyle = {
        width: '100%',
        padding: '0.7rem 0.85rem',
        border: '1.5px solid #e2e8f0',
        borderRadius: '0.75rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        color: '#0f172a',
        backgroundColor: 'white',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxSizing: 'border-box'
    };

    const sectionTitleStyle = {
        fontSize: '0.72rem',
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: '#94a3b8',
        textTransform: 'uppercase',
        margin: 0
    };

    const handleFocusStyle = (e) => {
        e.currentTarget.style.borderColor = '#2563eb';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
    };

    const handleBlurStyle = (e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'fadeInModal 0.2s ease-out'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.5rem',
                    width: isMobile ? '100%' : 'min(540px, calc(100vw - 2rem))',
                    maxHeight: isMobile ? '93dvh' : '90dvh',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Drag handle en móvil */}
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.65rem', paddingBottom: '0.15rem', flexShrink: 0 }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '999px', backgroundColor: '#e2e8f0' }} />
                    </div>
                )}

                {/* Header fijo */}
                <div style={{
                    padding: isMobile ? '0.85rem 1.25rem 1rem' : '1.25rem 1.5rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    flexShrink: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#2563eb',
                                flexShrink: 0
                            }} />
                            <h3 style={{
                                fontFamily: "'Plus Jakarta Sans', var(--font-sans)",
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                letterSpacing: '-0.025em',
                                color: '#0f172a',
                                margin: 0
                            }}>
                                {product ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                        </div>
                        <p style={{
                            fontSize: '0.8rem',
                            color: '#64748b',
                            margin: '0.25rem 0 0',
                            lineHeight: 1.35
                        }}>
                            {product
                                ? 'Actualiza los detalles del producto en tu catálogo'
                                : 'Ingresa los detalles para registrar en el catálogo de inventario'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Formulario scrollable */}
                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0
                    }}
                >
                    <div style={{
                        padding: isMobile ? '1.1rem 1.25rem' : '1.25rem 1.5rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                        flex: 1
                    }}>

                        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <h4 style={sectionTitleStyle}>Información Básica</h4>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    backgroundColor: '#eff6ff',
                                    padding: '0.22rem 0.65rem',
                                    borderRadius: '999px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Catálogo
                                </span>
                            </div>

                            {/* Foto del producto centrada */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ ...labelStyle, textAlign: 'center', marginBottom: '0.5rem', color: '#475569' }}>
                                    Foto del producto
                                </span>
                                <div
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current.click()}
                                    style={{
                                        width: '124px',
                                        height: '124px',
                                        borderRadius: '1rem',
                                        border: formData.imagen ? '2px solid #e2e8f0' : (dragActive ? '2px dashed #2563eb' : '2px dashed #cbd5e1'),
                                        backgroundColor: dragActive ? '#eff6ff' : '#f8fafc',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = '#2563eb';
                                        if (!formData.imagen) e.currentTarget.style.backgroundColor = '#eff6ff';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = formData.imagen ? '#e2e8f0' : '#cbd5e1';
                                        if (!formData.imagen) e.currentTarget.style.backgroundColor = '#f8fafc';
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />

                                    {formData.imagen ? (
                                        <>
                                            <img
                                                src={formData.imagen}
                                                alt="Vista previa"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    backgroundColor: 'rgba(15, 23, 42, 0.45)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                            >
                                                Cambiar foto
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeImage}
                                                aria-label="Eliminar foto"
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.35rem',
                                                    right: '0.35rem',
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#fee2e2',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                                    color: '#ef4444'
                                                }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                backgroundColor: '#eff6ff',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: '0.45rem'
                                            }}>
                                                <ImageIcon size={18} />
                                            </div>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                                                Subir Foto
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginTop: '0.1rem' }}>
                                                JPG o PNG
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nombre del producto */}
                            <div>
                                <label style={labelStyle}>
                                    Nombre del Producto <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    required
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Ej: Refresco Coca-Cola 1.5L"
                                    style={inputStyle}
                                    onFocus={handleFocusStyle}
                                    onBlur={handleBlurStyle}
                                />
                            </div>

                            {/* Código de barras */}
                            <div>
                                <label style={labelStyle}>
                                    Código de Barras <span style={{ fontWeight: 500, color: '#94a3b8' }}>(Opcional)</span>
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        name="codigo_barras"
                                        value={formData.codigo_barras || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 759100123456"
                                        style={{ ...inputStyle, paddingRight: '3rem' }}
                                        onFocus={handleFocusStyle}
                                        onBlur={handleBlurStyle}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#f1f5f9',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none'
                                    }}>
                                        <QrCode size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

                        {/* SECCIÓN 2: PRECIOS Y FISCALIDAD */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <h4 style={sectionTitleStyle}>Precios y Fiscalidad</h4>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#059669',
                                    backgroundColor: '#ecfdf5',
                                    padding: '0.22rem 0.65rem',
                                    borderRadius: '999px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Moneda: USD
                                </span>
                            </div>

                            {/* Fila alineada: Precio Venta y Costo Unitario */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                alignItems: 'end'
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <label style={{ ...labelStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        Precio Venta <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            position: 'absolute',
                                            left: '0.85rem',
                                            color: '#94a3b8',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            pointerEvents: 'none'
                                        }}>$</span>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="precio_venta_usd"
                                            value={formData.precio_venta_usd}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            style={{ ...inputStyle, paddingLeft: '1.85rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                            onFocus={handleFocusStyle}
                                            onBlur={handleBlurStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <label style={{ ...labelStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        Costo <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: '0.74rem' }}>(Opcional)</span>
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            position: 'absolute',
                                            left: '0.85rem',
                                            color: '#94a3b8',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            pointerEvents: 'none'
                                        }}>$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="precio_costo_usd"
                                            value={formData.precio_costo_usd}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            style={{ ...inputStyle, paddingLeft: '1.85rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                            onFocus={handleFocusStyle}
                                            onBlur={handleBlurStyle}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta agrupada para IVA */}
                            <div style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #f1f5f9',
                                borderRadius: '1rem',
                                padding: '0.85rem',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                alignItems: 'end'
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
                                        Aplica IVA
                                    </label>
                                    <select
                                        name="aplica_iva"
                                        value={formData.aplica_iva}
                                        onChange={handleChange}
                                        style={{ ...inputStyle, cursor: 'pointer' }}
                                        onFocus={handleFocusStyle}
                                        onBlur={handleBlurStyle}
                                    >
                                        <option value={1}>Sí (Aplica)</option>
                                        <option value={0}>No (Exento)</option>
                                    </select>
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
                                        Tasa IVA (%)
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="tasa_iva"
                                            value={formData.tasa_iva}
                                            onChange={handleChange}
                                            disabled={formData.aplica_iva == 0}
                                            style={{
                                                ...inputStyle,
                                                paddingRight: '2rem',
                                                textAlign: 'center',
                                                fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums',
                                                backgroundColor: formData.aplica_iva == 0 ? '#e2e8f0' : 'white',
                                                color: formData.aplica_iva == 0 ? '#94a3b8' : '#0f172a',
                                                cursor: formData.aplica_iva == 0 ? 'not-allowed' : 'text'
                                            }}
                                            onFocus={e => formData.aplica_iva != 0 && handleFocusStyle(e)}
                                            onBlur={e => formData.aplica_iva != 0 && handleBlurStyle(e)}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            right: '0.85rem',
                                            color: '#94a3b8',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            pointerEvents: 'none'
                                        }}>%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

                        {/* SECCIÓN 3: INVENTARIO Y STOCK */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <h4 style={sectionTitleStyle}>Inventario y Stock</h4>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: formData.sin_control_stock ? '#2563eb' : '#475569',
                                    backgroundColor: formData.sin_control_stock ? '#eff6ff' : '#f1f5f9',
                                    padding: '0.22rem 0.65rem',
                                    borderRadius: '999px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formData.sin_control_stock ? 'Stock ilimitado' : 'Con inventario'}
                                </span>
                            </div>

                            {/* Switch: Producto siempre disponible (sin control de stock) */}
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.85rem',
                                padding: '0.85rem 1rem',
                                borderRadius: '1rem',
                                backgroundColor: formData.sin_control_stock ? '#eff6ff' : '#f8fafc',
                                border: `1.5px solid ${formData.sin_control_stock ? '#93c5fd' : '#e2e8f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flex: 1 }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '0.6rem',
                                        backgroundColor: formData.sin_control_stock ? '#dbeafe' : '#e2e8f0',
                                        color: formData.sin_control_stock ? '#2563eb' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '0.1rem'
                                    }}>
                                        <InfinityIcon size={17} />
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                            Producto siempre disponible
                                        </span>
                                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.18rem', lineHeight: 1.35 }}>
                                            Sin control de stock. Ideal para comidas preparadas; nunca se agotará en el POS.
                                        </span>
                                    </div>
                                </div>

                                {/* Toggle visual accesible */}
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.sin_control_stock)}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sin_control_stock: e.target.checked }))}
                                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                />
                                <div style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '999px',
                                    backgroundColor: formData.sin_control_stock ? '#2563eb' : '#cbd5e1',
                                    position: 'relative',
                                    flexShrink: 0,
                                    transition: 'background-color 0.2s'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: formData.sin_control_stock ? '23px' : '3px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        transition: 'left 0.2s'
                                    }} />
                                </div>
                            </label>

                            {/* Stock Inicial / Actual y Stock Mínimo */}
                            {!formData.sin_control_stock && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.75rem',
                                    alignItems: 'end'
                                }}>
                                    <div style={{ minWidth: 0 }}>
                                        <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
                                            {product ? 'Stock Actual' : 'Stock Inicial'} <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="any"
                                            name="stock_actual"
                                            value={formData.stock_actual}
                                            onChange={handleChange}
                                            style={{ ...inputStyle, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                            onFocus={handleFocusStyle}
                                            onBlur={handleBlurStyle}
                                        />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
                                            Stock Mínimo <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            name="stock_minimo"
                                            value={formData.stock_minimo}
                                            onChange={handleChange}
                                            style={{ ...inputStyle, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                            onFocus={handleFocusStyle}
                                            onBlur={handleBlurStyle}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer fijo con botones alineados */}
                    <div style={{
                        padding: isMobile ? '0.9rem 1.25rem calc(0.9rem + env(safe-area-inset-bottom, 0px))' : '1rem 1.5rem',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: 'white',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.35fr',
                        gap: '0.75rem',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.8rem 1rem',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '0.875rem',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.8rem 1rem',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.875rem',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 6px 16px -4px rgba(37, 99, 235, 0.4)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(37, 99, 235, 0.5)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(37, 99, 235, 0.4)'}
                        >
                            <Save size={17} />
                            Guardar Producto
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeInModal {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUpModal {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ProductModal;
