import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Edit2, ArrowRightLeft, History, Search, AlertTriangle } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import KardexModal from '../components/KardexModal';

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tasaBcv, setTasaBcv] = useState(0);

    // Modals state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Initial load
    useEffect(() => {
        fetchProducts();
        fetchLowStock();
        fetchTasa();
    }, []);

    // Dynamic search with debounce
    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchProducts(searchTerm);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchTerm]);

    const fetchTasa = async () => {
        try {
            const res = await axios.get('/api/currency/rate');
            setTasaBcv(res.data.data.tasa || 0);
        } catch {
            console.error('No se pudo obtener la tasa BCV');
        }
    };

    const fetchLowStock = async () => {
        try {
            const res = await axios.get('/api/products/low-stock');
            setLowStockProducts(res.data.data || []);
        } catch (error) {
            console.error('No se pudo obtener productos con stock bajo:', error);
        }
    };

    const fetchProducts = async (query = '') => {
        setLoading(true);
        try {
            // El token se agrega automáticamente por el interceptor de axiosConfig
            const url = `/api/products/search?q=${query}`;
            const res = await axios.get(url);
            setProducts(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredProducts = () => {
        if (showLowStockOnly) {
            return lowStockProducts.filter(p => 
                p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return products;
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // El debounce ya dispara la búsqueda; aquí sólo prevenimos el submit
    };

    const openEdit = (prod) => {
        setSelectedProduct(prod);
        setIsProductModalOpen(true);
    };

    const openNew = () => {
        setSelectedProduct(null);
        setIsProductModalOpen(true);
    };

    const openStock = (prod) => {
        setSelectedProduct(prod);
        setIsStockModalOpen(true);
    };

    const openKardex = (prod) => {
        setSelectedProduct(prod);
        setIsKardexModalOpen(true);
    };

    const handleSave = () => {
        fetchProducts(searchTerm); // Reload
        fetchLowStock();
    };

    const lowStockCount = lowStockProducts.length;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Gestión de Inventario</h2>
                <button onClick={openNew} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '0.5rem' }} /> Nuevo Producto
                </button>
            </div>

            {/* Alerta de productos bajos de stock */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderLeft: `4px solid ${lowStockCount > 0 ? '#dc2626' : '#16a34a'}`,
                marginBottom: '1.5rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        backgroundColor: lowStockCount > 0 ? '#dc262618' : '#16a34a18',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <AlertTriangle size={22} color={lowStockCount > 0 ? '#dc2626' : '#16a34a'} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                            Estado de Stock
                        </h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            {lowStockCount > 0 ? (
                                <>
                                    Tienes <strong style={{ color: '#dc2626' }}>{lowStockCount}</strong> {lowStockCount === 1 ? 'producto' : 'productos'} con stock bajo o sin stock.
                                </>
                            ) : (
                                <span style={{ color: '#16a34a', fontWeight: 500 }}>
                                    ¡Excelente! Todos los productos están con stock suficiente.
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        backgroundColor: showLowStockOnly ? '#dc2626' : 'white',
                        color: showLowStockOnly ? 'white' : '#64748b',
                        border: `1px solid ${showLowStockOnly ? '#dc2626' : '#e2e8f0'}`,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease',
                        boxShadow: showLowStockOnly ? '0 2px 4px rgba(220, 38, 38, 0.2)' : 'none'
                    }}
                >
                    <AlertTriangle size={14} />
                    {showLowStockOnly ? 'Ver todos los productos' : 'Ver productos sin/bajo stock'}
                </button>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                    />
                    <button type="submit" className="btn btn-primary">
                        <Search size={20} />
                    </button>
                </form>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Código</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Producto</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Precio (USD)</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Precio (Bs.)</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Stock</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getFilteredProducts().map(product => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '1rem', color: '#64748b' }}>{product.codigo_barras}</td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>{product.nombre}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: '#2563eb' }}>
                                    ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: '#16a34a' }}>
                                    {tasaBcv > 0
                                        ? `Bs. ${((product.precio_venta_usd_centavos / 100) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : '—'
                                    }
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        backgroundColor: product.stock_actual <= product.stock_minimo ? '#fee2e2' : '#dcfce7',
                                        color: product.stock_actual <= product.stock_minimo ? '#991b1b' : '#166534',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}>
                                        {product.stock_actual}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                        <button onClick={() => openStock(product)} title="Ajuste Stock" style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.25rem', color: '#2563eb' }}>
                                            <ArrowRightLeft size={16} />
                                        </button>
                                        <button onClick={() => openKardex(product)} title="Ver Kardex" style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '0.25rem', color: '#16a34a' }}>
                                            <History size={16} />
                                        </button>
                                        <button onClick={() => openEdit(product)} title="Editar" style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.25rem', color: '#475569' }}>
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {getFilteredProducts().length === 0 && !loading && (
                            <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No se encontraron productos</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={selectedProduct}
                onSave={handleSave}
            />

            <StockAdjustmentModal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                product={selectedProduct}
                onSave={handleSave}
            />

            <KardexModal
                isOpen={isKardexModalOpen}
                onClose={() => setIsKardexModalOpen(false)}
                product={selectedProduct}
            />
        </div>
    );
};

export default Inventory;
