import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CheckoutModal from '../components/CheckoutModal';

const POS = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [tasaBcv, setTasaBcv] = useState(0);
    const searchRef = useRef(null);

    useEffect(() => {
        fetchProducts('');
        fetchRate();
        // Focus en la búsqueda al cargar
        if (searchRef.current) searchRef.current.focus();
    }, []);

    const fetchRate = async () => {
        try {
            const res = await axios.get('/api/currency/rate');
            setTasaBcv(res.data.data.tasa || 0);
        } catch (e) {
            console.error('No se pudo obtener la tasa BCV');
        }
    };

    const fetchProducts = async (query) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/products/search?q=${query}`);
            setProducts(res.data.data || []);
        } catch (error) {
            if (error.response?.status !== 400) {
                toast.error('Error cargando productos');
            }
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
        if (cart.length > 0 && window.confirm('¿Limpiar carrito?')) setCart([]);
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

    const handleCheckoutSuccess = (saleData) => {
        setCart([]);
        fetchProducts('');
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', height: 'calc(100vh - 130px)' }}>

            {/* ─────────── PANEL IZQUIERDO: Productos ─────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem', overflowY: 'auto', paddingBottom: '0.5rem'
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
                            {/* Ícono / color placeholder */}
                            <div style={{
                                height: '64px', borderRadius: '0.5rem', marginBottom: '0.625rem',
                                backgroundColor: product.stock_actual <= 0 ? '#f1f5f9' : '#eff6ff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <ShoppingCart size={24} color={product.stock_actual <= 0 ? '#cbd5e1' : '#3b82f6'} />
                            </div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                                {product.nombre}
                            </p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.125rem' }}>
                                ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                            </p>
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
            <div style={{
                backgroundColor: 'white', borderRadius: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header del carrito */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingCart size={20} color="#2563eb" />
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>Carrito</span>
                        {cart.length > 0 && (
                            <span style={{ backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                {cart.reduce((a, i) => a + i.quantity, 0)}
                            </span>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Items del carrito */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>
                            <ShoppingCart size={40} style={{ marginBottom: '0.75rem' }} />
                            <p style={{ fontSize: '0.875rem' }}>El carrito está vacío</p>
                            <p style={{ fontSize: '0.75rem' }}>Haz clic en un producto para agregar</p>
                        </div>
                    ) : cart.map(item => {
                        const precio = (item.precio_venta_usd_centavos || 0) / 100;
                        const subtotalItem = precio * item.quantity;
                        return (
                            <div key={item.id} style={{
                                display: 'flex', gap: '0.5rem', alignItems: 'center',
                                padding: '0.625rem', marginBottom: '0.5rem',
                                backgroundColor: '#f8fafc', borderRadius: '0.5rem'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.nombre}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        ${precio.toFixed(2)} × {item.quantity} = <strong>${subtotalItem.toFixed(2)}</strong>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.25rem' }}
                                    >
                                        <X size={12} color="#ef4444" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Totales y botón de cobro */}
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            <span>IVA (16%):</span>
                            <span>${iva.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', color: '#1e293b', paddingTop: '0.5rem', borderTop: '2px solid #f1f5f9' }}>
                            <span>Total USD:</span>
                            <span style={{ color: '#2563eb' }}>${total.toFixed(2)}</span>
                        </div>
                        {tasaBcv > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                <span>Total Bs. (×{tasaBcv.toFixed(2)}):</span>
                                <span>Bs. {(total * tasaBcv).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsCheckoutOpen(true)}
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

            {/* Modal de Cobro */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cart={cart}
                totalUsd={total}
                tasaBcv={tasaBcv}
                onSuccess={handleCheckoutSuccess}
            />
        </div>
    );
};

export default POS;
