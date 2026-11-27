import React, { useState, useEffect, useRef } from 'react';
import {
    ShoppingCart, Package, Tag, Coffee, Box, Star,
    Save, Palette, Upload, Image as ImageIcon, X, Check, Trash2,
    Eye, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../hooks/useIsMobile';

const icons = [
    { name: 'ShoppingCart', label: 'Carrito', component: ShoppingCart },
    { name: 'Package', label: 'Paquete', component: Package },
    { name: 'Tag', label: 'Etiqueta', component: Tag },
    { name: 'Coffee', label: 'Bebida', component: Coffee },
    { name: 'Box', label: 'Caja', component: Box },
    { name: 'Star', label: 'Destacado', component: Star },
];

const colors = [
    { bg: '#eff6ff', icon: '#3b82f6', name: 'Azul' },
    { bg: '#f0fdf4', icon: '#22c55e', name: 'Verde' },
    { bg: '#fef2f2', icon: '#ef4444', name: 'Rojo' },
    { bg: '#fdf4ff', icon: '#d946ef', name: 'Fucsia' },
    { bg: '#fff7ed', icon: '#f97316', name: 'Naranja' },
    { bg: '#f3f4f6', icon: '#4b5563', name: 'Gris' },
    { bg: '#1e293b', icon: '#38bdf8', name: 'Oscuro' }
];

const Customization = () => {
    const isMobile = useIsMobile();

    const [selectedIcon, setSelectedIcon] = useState('ShoppingCart');
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [useImage, setUseImage] = useState(false);
    const [productImage, setProductImage] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [tempImage, setTempImage] = useState('');

    const loadSavedSettings = () => {
        const savedIcon = localStorage.getItem('pos_product_icon') || 'ShoppingCart';
        const savedBgColor = localStorage.getItem('pos_product_bg') || '#eff6ff';
        const savedUseImage = localStorage.getItem('pos_product_use_image') === 'true';
        const savedImage = localStorage.getItem('pos_product_image') || '';

        setSelectedIcon(savedIcon);
        setUseImage(savedUseImage);
        setProductImage(savedImage);

        const matchedColor = colors.find(c => c.bg === savedBgColor) || colors[0];
        setSelectedColor(matchedColor);
    };

    useEffect(() => {
        loadSavedSettings();
    }, []);

    const handleSave = () => {
        localStorage.setItem('pos_product_icon', selectedIcon);
        localStorage.setItem('pos_product_bg', selectedColor.bg);
        localStorage.setItem('pos_product_icon_color', selectedColor.icon);
        localStorage.setItem('pos_product_use_image', useImage ? 'true' : 'false');
        localStorage.setItem('pos_product_image', productImage);
        toast.success('Personalización guardada con éxito');
    };

    const handleCancel = () => {
        loadSavedSettings();
        toast('Cambios descartados');
    };

    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecciona un archivo de imagen válido.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen no debe superar los 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setTempImage(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        handleFile(file);
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleConfirmImage = () => {
        setProductImage(tempImage);
        setTempImage('');
        setIsUploadModalOpen(false);
        toast.success('Imagen cargada. Recuerda guardar los cambios.');
    };

    const SelectedIconComponent = icons.find(i => i.name === selectedIcon)?.component || ShoppingCart;
    const showingCustomImage = useImage && Boolean(productImage);

    return (
        <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            paddingBottom: isMobile ? '1rem' : '2rem'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Palette size={26} color="#2563eb" />
                <div>
                    <h1 className="page-title" style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', margin: 0 }}>
                        Personalización POS
                    </h1>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                        Estilo visual por defecto para productos sin foto propia
                    </p>
                </div>
            </div>

            {/* Modo de visualización */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: '#94a3b8',
                        textTransform: 'uppercase'
                    }}>
                        Modo de Visualización
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                        Configuración global
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.35rem',
                    backgroundColor: '#f1f5f9',
                    padding: '0.35rem',
                    borderRadius: '0.9rem',
                    border: '1px solid #e2e8f0'
                }}>
                    <button
                        type="button"
                        onClick={() => setUseImage(false)}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '0.65rem',
                            border: 'none',
                            backgroundColor: !useImage ? 'white' : 'transparent',
                            color: !useImage ? '#2563eb' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: !useImage ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <ShoppingCart size={16} />
                        Icono y Color
                    </button>
                    <button
                        type="button"
                        onClick={() => setUseImage(true)}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '0.65rem',
                            border: 'none',
                            backgroundColor: useImage ? 'white' : 'transparent',
                            color: useImage ? '#2563eb' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: useImage ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <ImageIcon size={16} />
                        Imagen Propia
                    </button>
                </div>
            </div>

            {/* Contenido condicional: Icono y Color O Imagen Personalizada */}
            {!useImage ? (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.25rem',
                    padding: isMobile ? '1.15rem' : '1.4rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.35rem',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {/* 1. Selección de Icono */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                1. Elige un Icono
                            </h3>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px'
                            }}>
                                6 opciones
                            </span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                            gap: '0.65rem'
                        }}>
                            {icons.map((iconData) => {
                                const IconComp = iconData.component;
                                const isSelected = selectedIcon === iconData.name;
                                return (
                                    <button
                                        key={iconData.name}
                                        type="button"
                                        onClick={() => setSelectedIcon(iconData.name)}
                                        style={{
                                            padding: '0.85rem 0.5rem',
                                            borderRadius: '0.9rem',
                                            cursor: 'pointer',
                                            border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <IconComp size={24} color={isSelected ? '#2563eb' : '#64748b'} />
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: isSelected ? 700 : 600,
                                            color: isSelected ? '#1d4ed8' : '#64748b'
                                        }}>
                                            {iconData.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

                    {/* 2. Selección de Color */}
                    <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' }}>
                            2. Elige un Color
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                            gap: '0.65rem'
                        }}>
                            {colors.map((colorSet, idx) => {
                                const isSelected = selectedColor.bg === colorSet.bg;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedColor(colorSet)}
                                        style={{
                                            padding: '0.75rem 0.5rem',
                                            borderRadius: '0.9rem',
                                            cursor: 'pointer',
                                            border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '0.65rem',
                                            backgroundColor: colorSet.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(15,23,42,0.06)'
                                        }}>
                                            <SelectedIconComponent size={20} color={colorSet.icon} />
                                        </div>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: isSelected ? 700 : 600,
                                            color: isSelected ? '#1d4ed8' : '#475569'
                                        }}>
                                            {colorSet.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.25rem',
                    padding: isMobile ? '1.15rem' : '1.4rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {/* Header de tarjeta */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        paddingBottom: '0.9rem',
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: '1rem'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                Imagen de Producto Principal
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                                Se asignará a productos sin foto específica
                            </p>
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                            backgroundColor: productImage ? '#ecfdf5' : '#f1f5f9',
                            color: productImage ? '#059669' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}>
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: productImage ? '#10b981' : '#94a3b8'
                            }} />
                            {productImage ? 'Activa' : 'Sin imagen'}
                        </span>
                    </div>

                    {/* Dropzone / Preview */}
                    <div style={{
                        border: '1.5px dashed #bfdbfe',
                        borderRadius: '1rem',
                        backgroundColor: '#f8fafc',
                        padding: '1.5rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '0.85rem'
                    }}>
                        <div style={{
                            width: '112px',
                            height: '112px',
                            borderRadius: '1rem',
                            backgroundColor: productImage ? 'white' : '#eff6ff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.14)',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {productImage ? (
                                <>
                                    <img
                                        src={productImage}
                                        alt="Imagen por defecto"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        top: '0.4rem',
                                        right: '0.4rem',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        padding: '0.12rem 0.38rem',
                                        borderRadius: '0.35rem'
                                    }}>
                                        1:1
                                    </span>
                                </>
                            ) : (
                                <ImageIcon size={36} color="#94a3b8" />
                            )}
                        </div>

                        <div>
                            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                {productImage ? '¡Imagen cargada correctamente!' : 'No se ha seleccionado ninguna imagen'}
                            </p>
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                                Formatos válidos: <strong>PNG, JPG, WebP</strong> (máx. 2MB).<br />
                                Relación cuadrada 1:1 recomendada.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.65rem', width: '100%', maxWidth: '340px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setTempImage('');
                                    setIsUploadModalOpen(true);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.7rem 1rem',
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.35)'
                                }}
                            >
                                <Upload size={16} />
                                {productImage ? 'Cambiar Imagen' : 'Subir Imagen'}
                            </button>

                            {productImage && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProductImage('');
                                        toast.success('Imagen eliminada de la vista previa. Recuerda guardar.');
                                    }}
                                    style={{
                                        padding: '0.7rem 0.95rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        fontWeight: 700,
                                        fontSize: '0.84rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Trash2 size={15} />
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vista Previa en Terminal POS */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1.25rem',
                padding: isMobile ? '1.15rem' : '1.4rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Eye size={17} color="#2563eb" />
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Vista Previa en Terminal POS
                        </h3>
                    </div>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap'
                    }}>
                        Tarjeta POS
                    </span>
                </div>

                <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '1rem',
                    padding: '1rem',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.95rem'
                }}>
                    <div style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '0.85rem',
                        backgroundColor: showingCustomImage ? 'white' : selectedColor.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(15,23,42,0.06)'
                    }}>
                        {showingCustomImage ? (
                            <img src={productImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <SelectedIconComponent size={28} color={selectedColor.icon} />
                        )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                            display: 'inline-block',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.35rem',
                            marginBottom: '0.25rem'
                        }}>
                            Catálogo
                        </span>
                        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                            Producto Prueba
                        </p>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            Stock: 50
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                            $10.00
                        </span>
                        <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '0.55rem',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Plus size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Botones inferiores */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.6fr',
                gap: '0.75rem',
                marginTop: '0.25rem'
            }}>
                <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '0.875rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    style={{
                        padding: '0.85rem 1rem',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.875rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 6px 16px -4px rgba(37, 99, 235, 0.4)'
                    }}
                >
                    <Save size={18} />
                    Guardar Cambios
                </button>
            </div>

            {/* Modal para subir imagen */}
            {isUploadModalOpen && (
                <div style={overlayStyle} onClick={() => { setIsUploadModalOpen(false); setTempImage(''); }}>
                    <div style={modalWrapperStyle} onClick={e => e.stopPropagation()}>
                        <div style={modalStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                    Subir Imagen de Producto
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setTempImage('');
                                    }}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f1f5f9',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={18} color="#64748b" />
                                </button>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={triggerFileInput}
                                style={{
                                    border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
                                    borderRadius: '1rem',
                                    padding: '2rem 1.25rem',
                                    textAlign: 'center',
                                    backgroundColor: dragOver ? '#eff6ff' : '#f8fafc',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.65rem'
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb'
                                }}>
                                    <Upload size={22} />
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.2rem 0', fontWeight: 700, color: '#334155', fontSize: '0.92rem' }}>
                                        Arrastra tu archivo aquí
                                    </p>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                                        o haz clic para explorar en tu equipo
                                    </p>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    PNG, JPG, JPEG o WEBP (Máx. 2MB)
                                </span>
                            </div>

                            {tempImage && (
                                <div style={{
                                    marginTop: '1.25rem',
                                    padding: '1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '0.85rem',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', margin: '0 0 0.75rem' }}>
                                        Vista Previa Seleccionada:
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                        <div style={{
                                            width: '112px',
                                            height: '112px',
                                            borderRadius: '0.85rem',
                                            overflow: 'hidden',
                                            border: '3px solid white',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                        }}>
                                            <img src={tempImage} alt="Selection preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                                        <button
                                            type="button"
                                            onClick={handleConfirmImage}
                                            style={{
                                                flex: 1,
                                                padding: '0.65rem',
                                                backgroundColor: '#16a34a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.65rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            <Check size={16} />
                                            Confirmar Imagen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTempImage('')}
                                            style={{
                                                padding: '0.65rem 1rem',
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b',
                                                border: 'none',
                                                borderRadius: '0.65rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Descartar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.15s ease-out'
};

const modalWrapperStyle = {
    backgroundColor: 'white',
    borderRadius: '1.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '420px',
    margin: '0 1rem',
    animation: 'fadeIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const modalStyle = {
    padding: '1.5rem',
    width: '100%',
    maxHeight: '90dvh',
    overflowY: 'auto'
};

export default Customization;
