import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, Tag, Coffee, Box, Star, Save, Palette, Upload, Image, X, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const icons = [
    { name: 'ShoppingCart', component: ShoppingCart },
    { name: 'Package', component: Package },
    { name: 'Tag', component: Tag },
    { name: 'Coffee', component: Coffee },
    { name: 'Box', component: Box },
    { name: 'Star', component: Star },
];

const colors = [
    { bg: '#eff6ff', icon: '#3b82f6', name: 'Azul (Por defecto)' },
    { bg: '#f0fdf4', icon: '#22c55e', name: 'Verde' },
    { bg: '#fef2f2', icon: '#ef4444', name: 'Rojo' },
    { bg: '#fdf4ff', icon: '#d946ef', name: 'Fucsia' },
    { bg: '#fff7ed', icon: '#f97316', name: 'Naranja' },
    { bg: '#f3f4f6', icon: '#4b5563', name: 'Gris' },
    { bg: '#1e293b', icon: '#38bdf8', name: 'Oscuro/Neón' }
];

const Customization = () => {
    const [selectedIcon, setSelectedIcon] = useState('ShoppingCart');
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [useImage, setUseImage] = useState(false);
    const [productImage, setProductImage] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Modal states
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [tempImage, setTempImage] = useState('');

    useEffect(() => {
        const savedIcon = localStorage.getItem('pos_product_icon') || 'ShoppingCart';
        const savedBgColor = localStorage.getItem('pos_product_bg') || '#eff6ff';
        const savedIconColor = localStorage.getItem('pos_product_icon_color') || '#3b82f6';
        const savedUseImage = localStorage.getItem('pos_product_use_image') === 'true';
        const savedImage = localStorage.getItem('pos_product_image') || '';
        
        setSelectedIcon(savedIcon);
        setUseImage(savedUseImage);
        setProductImage(savedImage);
        
        const matchedColor = colors.find(c => c.bg === savedBgColor) || colors[0];
        setSelectedColor(matchedColor);
    }, []);

    const handleSave = () => {
        localStorage.setItem('pos_product_icon', selectedIcon);
        localStorage.setItem('pos_product_bg', selectedColor.bg);
        localStorage.setItem('pos_product_icon_color', selectedColor.icon);
        localStorage.setItem('pos_product_use_image', useImage ? 'true' : 'false');
        localStorage.setItem('pos_product_image', productImage);
        toast.success('Personalización guardada con éxito');
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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Palette size={28} color="#2563eb" />
                <h1 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>
                    Personalización POS
                </h1>
            </div>

            {/* Segmented Control Selector */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>
                    Estilo Visual de los Productos
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem', marginTop: 0 }}>
                    Elige cómo deseas que se muestren los productos en la interfaz principal del POS.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.375rem', borderRadius: '0.75rem', width: 'fit-content' }}>
                    <button
                        onClick={() => setUseImage(false)}
                        style={{
                            padding: '0.625rem 1.5rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: !useImage ? 'white' : 'transparent',
                            color: !useImage ? '#2563eb' : '#475569',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: !useImage ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <ShoppingCart size={16} />
                        Icono y Color Dinámico
                    </button>
                    <button
                        onClick={() => setUseImage(true)}
                        style={{
                            padding: '0.625rem 1.5rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: useImage ? 'white' : 'transparent',
                            color: useImage ? '#2563eb' : '#475569',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: useImage ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Image size={16} />
                        Imagen Personalizada
                    </button>
                </div>
            </div>

            {/* Render conditional sections */}
            {!useImage ? (
                <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                    {/* Section 1: Icon Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
                            1. Elige un Icono para los Productos
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {icons.map((iconData) => {
                                const IconComp = iconData.component;
                                const isSelected = selectedIcon === iconData.name;
                                return (
                                    <div 
                                        key={iconData.name}
                                        onClick={() => setSelectedIcon(iconData.name)}
                                        style={{ 
                                            padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer',
                                            border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    >
                                        <IconComp size={32} color={isSelected ? '#2563eb' : '#64748b'} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Color selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
                            2. Elige un Estilo de Color
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                            {colors.map((colorSet, idx) => {
                                const isSelected = selectedColor.bg === colorSet.bg;
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedColor(colorSet)}
                                        style={{ 
                                            padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer',
                                            border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            backgroundColor: 'white',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    >
                                        <div style={{ 
                                            width: '48px', height: '48px', borderRadius: '0.5rem',
                                            backgroundColor: colorSet.bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <SelectedIconComponent size={24} color={colorSet.icon} />
                                        </div>
                                        <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                                            {colorSet.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
                        Imagen de Producto Personalizada
                    </h3>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1.5rem', 
                        padding: '1.5rem', 
                        border: '2px dashed #cbd5e1', 
                        borderRadius: '0.75rem', 
                        backgroundColor: '#f8fafc',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {productImage ? (
                                <img src={productImage} alt="Uploaded product placeholder" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Image size={40} color="#94a3b8" />
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>
                                {productImage ? '¡Imagen cargada correctamente!' : 'No se ha seleccionado ninguna imagen'}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                                Se utilizará esta imagen para representar visualmente todos los productos sin una imagen específica configurada.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                <button
                                    onClick={() => {
                                        setTempImage('');
                                        setIsUploadModalOpen(true);
                                    }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                                >
                                    <Upload size={16} />
                                    {productImage ? 'Cambiar Imagen' : 'Subir Imagen'}
                                </button>
                                {productImage && (
                                    <button
                                        onClick={() => {
                                            setProductImage('');
                                            toast.success('Imagen eliminada de la vista previa. Recuerda guardar.');
                                        }}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#fee2e2',
                                            color: '#ef4444',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                    >
                                        <Trash2 size={16} />
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vista Previa Container */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', border: '1px solid #f1f5f9' }}>
                <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: 700 }}>Vista Previa del Producto</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Así se verán los productos en la interfaz de POS.</p>
                </div>
                <div style={{
                    backgroundColor: 'white', borderRadius: '0.75rem', padding: '0.875rem', 
                    border: '2px solid #f1f5f9', width: '140px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                }}>
                    <div style={{
                        height: '64px', borderRadius: '0.5rem', marginBottom: '0.625rem',
                        backgroundColor: useImage && productImage ? 'transparent' : selectedColor.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {useImage && productImage ? (
                            <img src={productImage} alt="Preview product placeholder" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <SelectedIconComponent size={24} color={selectedColor.icon} />
                        )}
                    </div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Producto Prueba</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.125rem' }}>$10.00</p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stock: 50</p>
                </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button 
                    onClick={handleSave}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.75rem', backgroundColor: '#2563eb', color: 'white',
                        border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer',
                        fontSize: '1rem', transition: 'all 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                    <Save size={20} />
                    Guardar Cambios
                </button>
            </div>

            {/* ════════ MODERN IMAGE UPLOADER MODAL ════════ */}
            {isUploadModalOpen && (
                <div style={overlayStyle}>
                    <div style={modalWrapperStyle}>
                        <div style={modalStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                    Subir Imagen de Producto
                                </h3>
                                <button 
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setTempImage('');
                                    }} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} color="#64748b" />
                                </button>
                            </div>
                            
                            {/* Drag & Drop Area */}
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={triggerFileInput}
                                style={{
                                    border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
                                    borderRadius: '0.75rem',
                                    padding: '2.5rem 1.5rem',
                                    textAlign: 'center',
                                    backgroundColor: dragOver ? '#eff6ff' : '#f8fafc',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    boxShadow: dragOver ? '0 0 12px rgba(37,99,235,0.1)' : 'none'
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
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    backgroundColor: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb',
                                    marginBottom: '0.25rem'
                                }}>
                                    <Upload size={24} />
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                                        Arrastra tu archivo aquí
                                    </p>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                                        o haz clic para explorar en tu equipo
                                    </p>
                                </div>
                                <span style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                    PNG, JPG, JPEG o WEBP (Máx. 2MB)
                                </span>
                            </div>

                            {/* Temporary Preview inside Modal */}
                            {tempImage && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease-out' }}>
                                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', marginTop: 0 }}>
                                        Vista Previa Seleccionada:
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                        <div style={{ 
                                            width: '120px', 
                                            height: '120px', 
                                            borderRadius: '0.75rem', 
                                            overflow: 'hidden', 
                                            border: '3px solid white', 
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
                                        }}>
                                            <img src={tempImage} alt="Selection preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={handleConfirmImage}
                                            style={{
                                                flex: 1,
                                                padding: '0.625rem',
                                                backgroundColor: '#16a34a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.375rem',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                        >
                                            <Check size={16} />
                                            Confirmar Imagen
                                        </button>
                                        <button
                                            onClick={() => setTempImage('')}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
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

            {/* Fade In Animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

// Styling Constants (Matching Premium Checkout Modals)
const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    padding: '2rem',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
};

export default Customization;

