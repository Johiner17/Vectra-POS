import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { productRepository } from '../services/productRepository';

const ProductModal = ({ isOpen, onClose, product, onSave }) => {
    const [formData, setFormData] = useState({
        codigo_barras: '',
        nombre: '',
        categoria_id: 1,
        precio_venta_usd: '',
        precio_costo_usd: '',
        stock_actual: 0,
        stock_minimo: 5,
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

                // Exportar como JPEG con calidad 75% para máximo ahorro de espacio en SQLite
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
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
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
                stock_actual: Number(formData.stock_actual) || 0,
                stock_minimo: Number(formData.stock_minimo) || 0,
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

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeInModal 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1.25rem',
                width: 'min(560px, calc(100vw - 1.5rem))',
                maxHeight: '92dvh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {product ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.25rem', borderRadius: '50%', transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Sección Superior: Foto e Información Esencial */}
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                        {/* Selector de Imagen Moderno */}
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                width: '130px',
                                height: '130px',
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
                                flexShrink: 0,
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
                                    {/* Overlay de hover */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.2s',
                                        color: 'white', fontSize: '0.75rem', fontWeight: 600
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >
                                        Cambiar foto
                                    </div>
                                    {/* Botón de Borrar */}
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        style={{
                                            position: 'absolute', top: '0.35rem', right: '0.35rem',
                                            width: '26px', height: '26px', borderRadius: '50%',
                                            backgroundColor: '#fee2e2', border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            color: '#ef4444', transition: 'transform 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '0.5rem', color: '#64748b' }}>
                                    <Upload size={22} style={{ marginBottom: '0.35rem', color: '#94a3b8' }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>Subir Foto</span>
                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', marginTop: '0.1rem' }}>Arrastra aquí</span>
                                </div>
                            )}
                        </div>

                        {/* Campos esenciales */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '1 rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                    Nombre del Producto
                                </label>
                                <input
                                    required
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Ej: Refresco Coca-Cola 1.5L"
                                    style={{
                                        width: '100%', padding: '0.55rem 0.75rem',
                                        border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                        fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '1 rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                    Código de Barras
                                </label>
                                <input
                                    name="codigo_barras"
                                    value={formData.codigo_barras || ''}
                                    onChange={handleChange}
                                    placeholder="Ej: 759100123456 (opcional)"
                                    style={{
                                        width: '100%', padding: '0.55rem 0.75rem',
                                        border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                        fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Precios */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                Precio Venta (USD)
                            </label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                name="precio_venta_usd"
                                value={formData.precio_venta_usd}
                                onChange={handleChange}
                                placeholder="0.00"
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                Costo Unitario (USD)
                            </label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                name="precio_costo_usd"
                                value={formData.precio_costo_usd}
                                onChange={handleChange}
                                placeholder="0.00"
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </div>

                    {/* Stock */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                {product ? 'Stock Actual' : 'Stock Inicial'}
                            </label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="any"
                                name="stock_actual"
                                value={formData.stock_actual}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s',
                                    backgroundColor: 'white'
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '1 rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                Stock Mínimo
                            </label>
                            <input
                                required
                                type="number"
                                name="stock_minimo"
                                value={formData.stock_minimo}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </div>

                    {/* Impuestos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                Aplica IVA
                            </label>
                            <select
                                name="aplica_iva"
                                value={formData.aplica_iva}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', backgroundColor: 'white'
                                }}
                            >
                                <option value={1}>Sí (Aplica)</option>
                                <option value={0}>No (Exento)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                                Tasa IVA (%)
                            </label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                name="tasa_iva"
                                value={formData.tasa_iva}
                                onChange={handleChange}
                                disabled={formData.aplica_iva == 0}
                                style={{
                                    width: '100%', padding: '0.55rem 0.75rem',
                                    border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s',
                                    backgroundColor: formData.aplica_iva == 0 ? '#f1f5f9' : 'white',
                                    color: formData.aplica_iva == 0 ? '#94a3b8' : 'inherit',
                                    cursor: formData.aplica_iva == 0 ? 'not-allowed' : 'text'
                                }}
                                onFocus={e => formData.aplica_iva != 0 && (e.currentTarget.style.borderColor = '#2563eb')}
                                onBlur={e => formData.aplica_iva != 0 && (e.currentTarget.style.borderColor = '#e2e8f0')}
                            />
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.75rem',
                                backgroundColor: '#f1f5f9', color: '#475569',
                                border: 'none', borderRadius: '0.75rem',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
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
                                flex: 1, padding: '0.75rem',
                                backgroundColor: '#2563eb', color: 'white',
                                border: 'none', borderRadius: '0.75rem',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                        >
                            <Save size={18} />
                            Guardar Producto
                        </button>
                    </div>
                </form>
            </div>

            {/* Animaciones CSS inline */}
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
