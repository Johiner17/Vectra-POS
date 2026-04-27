import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, ArrowRightLeft, History, Search } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import KardexModal from '../components/KardexModal';

const Inventory = () => {
    const [products, setProducts] = useState([]);
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
        fetchTasa();
    }, []);

    const fetchTasa = async () => {
        try {
            const res = await axios.get('/api/currency/rate');
            setTasaBcv(res.data.data.tasa || 0);
        } catch {
            console.error('No se pudo obtener la tasa BCV');
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

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(searchTerm);
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
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Gestión de Inventario</h2>
                <button onClick={openNew} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '0.5rem' }} /> Nuevo Producto
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
                        {products.map(product => (
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
                        {products.length === 0 && !loading && (
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
