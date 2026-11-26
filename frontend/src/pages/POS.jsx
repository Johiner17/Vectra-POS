import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Package, Tag, Coffee, Box, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import CheckoutModal from '../components/CheckoutModal';
import { productRepository } from '../services/productRepository';
import { currencyRepository } from '../services/currencyRepository';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatBs } from '../utils/formatters';

const POS = () => {
    const isMobile = useIsMobile(768);
    const isTablet = useIsMobile(1024);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [tasaBcv, setTasaBcv] = useState(0);
    const [posConfig, setPosConfig] = useState({ 
        icon: 'ShoppingCart', 
        bg: '#eff6ff', 
        iconColor: '#3b82f6',
        useImage: false,
        image: ''
    });
    const searchRef = useRef(null);

    useEffect(() => {
        fetchProducts('');
        fetchRate();
        
        const savedIcon = localStorage.getItem('pos_product_icon') || 'ShoppingCart';
        const savedBg = localStorage.getItem('pos_product_bg') || '#eff6ff';
        const savedIconColor = localStorage.getItem('pos_product_icon_color') || '#3b82f6';
        const savedUseImage = localStorage.getItem('pos_product_use_image') === 'true';
        const savedImage = localStorage.getItem('pos_product_image') || '';
        setPosConfig({ 
            icon: savedIcon, 
            bg: savedBg, 
            iconColor: savedIconColor,
            useImage: savedUseImage,
            image: savedImage
        });
        
        // Focus en la búsqueda solo en pantallas grandes (no abrir teclado automático en móvil)
        if (window.innerWidth >= 768 && searchRef.current) searchRef.current.focus();
    }, []);

    const fetchRate = async () => {
        try {
            let latest = await currencyRepository.getLatestRate();
            if ((!latest?.tasa || latest.tasa <= 0) && navigator.onLine) {
                const syncResult = await currencyRepository.syncFromOnline();
                if (syncResult.synced && syncResult.rate) {
                    latest = syncResult.rate;
                }
            }
            setTasaBcv(latest?.tasa || 0);
        } catch {
            console.error('No se pudo obtener la tasa BCV local');
        }
    };

    const fetchProducts = async (query) => {
        setLoading(true);
        try {
            const items = await productRepository.search(query);
            setProducts(items);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando productos locales');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(searchTerm);
    };

    // Búsqueda en tiempo real (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(searchTerm);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const addToCart = (product) => {
        if (product.stock_actual <= 0) {
            toast.error('Sin stock disponible');
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock_actual) {
                    toast.error(`Stock máximo: ${product.stock_actual}`);
                    return prev;
                }
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id !== id) return item;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock_actual) { toast.error(`Stock máximo: ${item.stock_actual}`); return item; }
            return { ...item, quantity: newQty };
        }).filter(Boolean));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const clearCart = () => {
        if (cart.length > 0) setIsClearConfirmOpen(true);
    };

    const confirmClearCart = () => {
        setCart([]);
        setIsClearConfirmOpen(false);
    };

    const calculateSubtotal = () => cart.reduce((acc, item) => {
        const precio = (item.precio_venta_usd_centavos || 0) / 100;
        return acc + precio * item.quantity;
    }, 0);

    const calculateIva = () => cart.reduce((acc, item) => {
        if (!item.aplica_iva) return acc;
        const precio = (item.precio_venta_usd_centavos || 0) / 100;
        const subtotal = precio * item.quantity;
        return acc + subtotal * ((item.tasa_iva || 16) / 100);
    }, 0);

    const subtotal = calculateSubtotal();
    const iva = calculateIva();
    const total = subtotal + iva;

    const handleCheckoutSuccess = () => {
        setCart([]);
        setIsMobileCartOpen(false);
        fetchProducts(searchTerm);
    };

    const iconsMap = { ShoppingCart, Package, Tag, Coffee, Box, Star };
    const ProductIcon = iconsMap[posConfig.icon] || ShoppingCart;
    const totalItemsCount = cart.reduce((a, i) => a + i.quantity, 0);

    const renderCartPanel = () => (
        <div style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '1.25rem 1.25rem 0 0' : '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            height: isMobile ? '85dvh' : '100%',
            width: '100%'
        }}>
            {/* Header del carrito */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={20} color="#2563eb" />
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Carrito</span>
                    {cart.length > 0 && (
                        <span style={{ backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                            {totalItemsCount}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {cart.length > 0 && (
                        <button onClick={clearCart} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                            Limpiar
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={() => setIsMobileCartOpen(false)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                            aria-label="Cerrar carrito"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Items del carrito */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>
                        <ShoppingCart size={40} style={{ marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.875rem' }}>El carrito está vacío</p>
                        <p style={{ fontSize: '0.75rem' }}>Toca un producto para agregar</p>
                    </div>
                ) : cart.map(item => {
                    const precio = (item.precio_venta_usd_centavos || 0) / 100;
                    const subtotalItem = precio * item.quantity;
                    return (
                        <div key={item.id} style={{
                            display: 'flex', gap: '0.625rem', alignItems: 'center',
                            padding: '0.625rem', marginBottom: '0.5rem',
                            backgroundColor: '#f8fafc', borderRadius: '0.5rem'
                        }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '0.5rem',
                                overflow: 'hidden', flexShrink: 0,
                                backgroundColor: item.imagen || (posConfig.useImage && posConfig.image) ? 'transparent' : posConfig.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid #e2e8f0'
                            }}>
                                {item.imagen ? (
                                    <img
                                        src={item.imagen}
                                        alt={item.nombre}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : posConfig.useImage && posConfig.image ? (
                                    <img
                                        src={posConfig.image}
                                        alt={item.nombre}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <ProductIcon size={18} color={posConfig.iconColor} />
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: isMobile ? '0.9rem' : '0.8rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.nombre}
                                </p>
                                <p style={{ fontSize: isMobile ? '0.95rem' : '0.75rem', color: '#475569', marginTop: '0.1rem' }}>
                                    ${precio.toFixed(2)} × {item.quantity} = <strong style={{ color: '#1e293b' }}>${subtotalItem.toFixed(2)}</strong>
                                </p>
                                {tasaBcv > 0 && (
                                    <p style={{ fontSize: isMobile ? '1rem' : '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '0.1rem' }}>
                                        Bs. {formatBs(subtotalItem * tasaBcv)}
                                    </p>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Minus size={12} />
                                </button>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Plus size={12} />
                                </button>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.25rem' }}
                                >
                                    <X size={12} color="#ef4444" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Totales y botón de cobro */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9', paddingBottom: isMobile ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.925rem' : '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.925rem' : '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        <span>IVA (16%):</span>
                        <span>${iva.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 700, fontSize: isMobile ? '1.5rem' : '1.25rem', color: '#1e293b', paddingTop: '0.5rem', borderTop: '2px solid #f1f5f9' }}>
                        <span style={{ fontSize: isMobile ? '1.125rem' : '1.25rem' }}>Total USD:</span>
                        <span style={{ color: '#2563eb' }}>${total.toFixed(2)}</span>
                    </div>
                    {tasaBcv > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                            <span style={{ fontSize: isMobile ? '0.9rem' : '0.8rem', color: '#64748b', fontWeight: 600 }}>
                                Total Bs. (×{formatBs(tasaBcv)}):
                            </span>
                            <span style={{ fontSize: isMobile ? '1.45rem' : '0.85rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.15 }}>
                                Bs. {formatBs(total * tasaBcv)}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsMobileCartOpen(false);
                        setIsCheckoutOpen(true);
                    }}
                    disabled={cart.length === 0}
                    style={{
                        width: '100%', padding: '1rem',
                        backgroundColor: cart.length === 0 ? '#e2e8f0' : '#2563eb',
                        color: cart.length === 0 ? '#94a3b8' : 'white',
                        border: 'none', borderRadius: '0.75rem',
                        fontSize: '1rem', fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.15s'
                    }}
                >
                    Cobrar ${total.toFixed(2)}
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : (isTablet ? '1fr 310px' : '1fr 380px'),
            gap: isMobile ? '1rem' : '1.5rem',
            height: isMobile ? 'auto' : 'calc(100vh - 130px)',
            paddingBottom: isMobile && cart.length > 0 ? '5rem' : 0,
        }}>

            {/* ─────────── PANEL IZQUIERDO: Productos ─────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: isMobile ? 'visible' : 'hidden' }}>
                {/* Barra de búsqueda */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre o código de barras..."
                            style={{
                                width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                border: '2px solid #e2e8f0', borderRadius: '0.5rem',
                                fontSize: '0.9rem', outline: 'none'
                            }}
                        />
                    </div>
                </form>

                {/* Grid de Productos */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(125px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem', overflowY: isMobile ? 'visible' : 'auto', paddingBottom: '0.5rem'
                }}>
                    {products.map(product => (
                        <div
                            key={product.id}
                            onClick={() => addToCart(product)}
                            style={{
                                backgroundColor: 'white', borderRadius: '0.75rem',
                                padding: '0.875rem', cursor: product.stock_actual > 0 ? 'pointer' : 'not-allowed',
                                border: '2px solid #f1f5f9', transition: 'all 0.15s',
                                opacity: product.stock_actual <= 0 ? 0.5 : 1,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
                            }}
                            onMouseEnter={e => { if (product.stock_actual > 0) e.currentTarget.style.borderColor = '#2563eb'; }}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}
                        >
                            {/* Ícono / color placeholder u Opcion de Imagen */}
                            <div style={{
                                height: '80px', borderRadius: '0.5rem', marginBottom: '0.625rem',
                                backgroundColor: product.stock_actual <= 0 ? '#f1f5f9' : (product.imagen || (posConfig.useImage && posConfig.image) ? 'transparent' : posConfig.bg),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                border: '1px solid #f1f5f9'
                            }}>
                                {product.imagen ? (
                                    <img 
                                        src={product.imagen} 
                                        alt={product.nombre} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : product.stock_actual <= 0 ? (
                                    <ProductIcon size={24} color="#cbd5e1" />
                                ) : posConfig.useImage && posConfig.image ? (
                                    <img 
                                        src={posConfig.image} 
                                        alt={product.nombre} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <ProductIcon size={24} color={posConfig.iconColor} />
                                )}
                            </div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                                {product.nombre}
                            </p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.125rem' }}>
                                ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                            </p>
                            {tasaBcv > 0 && (
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', marginBottom: '0.125rem' }}>
                                    Bs. {((product.precio_venta_usd_centavos / 100) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            )}
                            <p style={{ fontSize: '0.7rem', color: product.stock_actual <= product.stock_minimo ? '#ef4444' : '#94a3b8' }}>
                                Stock: {product.stock_actual}
                            </p>
                        </div>
                    ))}
                    {products.length === 0 && !loading && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <Search size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                            <p>No se encontraron productos</p>
                        </div>
                    )}
                    {loading && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            Buscando...
                        </div>
                    )}
                </div>
            </div>

            {/* ─────────── PANEL DERECHO: Carrito ─────────── */}
            {!isMobile && renderCartPanel()}

            {/* ─────────── MÓVIL: Botón flotante para abrir Carrito ─────────── */}
            {isMobile && cart.length > 0 && !isMobileCartOpen && (
                <button
                    onClick={() => setIsMobileCartOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)',
                        left: '1rem',
                        right: '1rem',
                        zIndex: 990,
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '1rem',
                        padding: '0.875rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <ShoppingCart size={20} />
                        <span>Ver Carrito ({totalItemsCount})</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span>${total.toFixed(2)}</span>
                        {tasaBcv > 0 && (
                            <span style={{ fontSize: '0.75rem', opacity: 0.9, marginLeft: '0.5rem', fontWeight: 500 }}>
                                · Bs. {formatBs(total * tasaBcv)}
                            </span>
                        )}
                    </div>
                </button>
            )}

            {/* ─────────── MÓVIL: Drawer / Bottom Sheet del Carrito ─────────── */}
            {isMobile && isMobileCartOpen && (
                <div
                    onClick={() => setIsMobileCartOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1100,
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'flex-end',
                    }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%' }}>
                        {renderCartPanel()}
                    </div>
                </div>
            )}

            {/* Modal de Cobro */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart}
                totalUsd={total}
                tasaBcv={tasaBcv}
                onSuccess={handleCheckoutSuccess}
            />

            {/* ── Modal Confirmar Limpiar Carrito ── */}
            {isClearConfirmOpen && (
                <div
                    onClick={() => setIsClearConfirmOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999,
                        animation: 'fadeIn 0.18s ease'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '1.25rem',
                            padding: '2rem',
                            width: '360px',
                            maxWidth: '90vw',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                            animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)'
                        }}
                    >
                        {/* Ícono */}
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            backgroundColor: '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem'
                        }}>
                            <Trash2 size={26} color="#ef4444" />
                        </div>

                        {/* Título */}
                        <h3 style={{
                            textAlign: 'center', fontWeight: 700,
                            fontSize: '1.125rem', color: '#1e293b',
                            marginBottom: '0.5rem'
                        }}>
                            ¿Limpiar carrito?
                        </h3>

                        {/* Descripción */}
                        <p style={{
                            textAlign: 'center', fontSize: '0.875rem',
                            color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5
                        }}>
                            Se eliminarán{' '}
                            <strong style={{ color: '#1e293b' }}>
                                {cart.reduce((a, i) => a + i.quantity, 0)} producto{cart.reduce((a, i) => a + i.quantity, 0) !== 1 ? 's' : ''}
                            </strong>
                            {' '}del carrito. Esta acción no se puede deshacer.
                        </p>

                        {/* Resumen rápido */}
                        <div style={{
                            backgroundColor: '#f8fafc', borderRadius: '0.75rem',
                            padding: '0.75rem 1rem', marginBottom: '1.5rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total a descartar</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
                                ${total.toFixed(2)}
                            </span>
                        </div>

                        {/* Botones */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setIsClearConfirmOpen(false)}
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
                                onClick={confirmClearCart}
                                style={{
                                    flex: 1, padding: '0.75rem',
                                    backgroundColor: '#ef4444', color: 'white',
                                    border: 'none', borderRadius: '0.75rem',
                                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                                Sí, limpiar
                            </button>
                        </div>
                    </div>

                    {/* Keyframes inline */}
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default POS;
