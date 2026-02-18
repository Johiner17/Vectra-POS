import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Minus, Trash2, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const POS = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Fetch products
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async (query = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Si hay query, busca. Si no, quizas traer populares o vacío por ahora
            // El backend tiene /products/search?q=... o barcode=...
            // Para demo traemos todo si no hay query (o implementamos un endpoint 'recientes')
            // Aquí simulamos búsqueda vacía como 'traer todos' si el backend lo soporta,
            // o forzamos una búsqueda genérica 'a' para demo si el backend requiere query.
            // Asumiremos que el backend devuelve array vacío si no hay query, así que mejor buscamos ' ' o algo.

            const url = query
                ? `/api/products/search?q=${query}`
                : `/api/products/search?q=`; // Hack para traer algo si el backend lo permite

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando productos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(searchTerm);
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => {
            // Precio viene en centavos o decimal?
            // El backend devuelve precio_venta_usd_centavos y precio_costo...
            // ProductController devuelve lo que hay en DB. La DB tiene centavos.
            // Pero ProductController create insertaba * 100.
            // CurrencyUtils en el backend maneja centavos.
            // Asumamos que el backend devuelve el objeto completo tal cual esta en DB (centavos).
            // PERO, CurrencyUtils en frontend no existe.
            // Deberíamos formatear en frontend.
            // Si el backend devuelve centavos, dividimos por 100.

            const precio = item.precio_venta_usd_centavos ? item.precio_venta_usd_centavos / 100 : 0;
            return total + (precio * item.quantity);
        }, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            // Estructura esperada por SaleService:
            // { items: [{ producto_id, cantidad }], ... }

            const payload = {
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.quantity
                })),
                cliente_id: null, // Cliente genérico
                moneda_venta: 'USD', // Default
                // tasa_bcv será obtenida por backend si no se envía
            };

            const res = await axios.post('/api/sales', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success(`Venta completada! Ref: ${res.data.data.numero_factura}`);
                setCart([]);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Error procesando venta');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', height: 'calc(100vh - 150px)' }}>
            {/* Left: Product List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar productos (nombre o código)..."
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0'
                        }}
                    />
                    <button type="submit" className="btn btn-primary">
                        <Search size={20} />
                    </button>
                </form>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                }}>
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="card"
                            onClick={() => addToCart(product)}
                            style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                        >
                            <div style={{ height: '100px', backgroundColor: '#e2e8f0', borderRadius: '0.25rem', marginBottom: '0.5rem' }}>
                                {/* Placeholder image */}
                            </div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                {product.nombre}
                            </h4>
                            <p style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Stock: {product.stock_actual}
                            </p>
                        </div>
                    ))}
                    {products.length === 0 && !loading && (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                            No se encontraron productos
                        </p>
                    )}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    Carrito de Compra
                </h3>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.25rem' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.nombre}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    ${(item.precio_venta_usd_centavos / 100).toFixed(2)} x {item.quantity}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '0.25rem', borderRadius: '0.25rem', backgroundColor: '#e2e8f0' }}><Minus size={14} /></button>
                                <span style={{ fontSize: '0.875rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '0.25rem', borderRadius: '0.25rem', backgroundColor: '#e2e8f0' }}><Plus size={14} /></button>
                                <button onClick={() => removeFromCart(item.id)} style={{ color: '#ef4444', padding: '0.25rem' }}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>Carrito vacío</p>
                    )}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Subtotal:</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
                        <span>Total:</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                        disabled={cart.length === 0 || processing}
                        onClick={handleCheckout}
                    >
                        <CreditCard style={{ marginRight: '0.5rem' }} />
                        {processing ? 'Procesando...' : 'Cobrar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POS;
