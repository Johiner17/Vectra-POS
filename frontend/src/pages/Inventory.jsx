import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, ArrowRightLeft, History, Search, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import KardexModal from '../components/KardexModal';
import { productRepository } from '../services/productRepository';
import { currencyRepository } from '../services/currencyRepository';

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
            const latest = await currencyRepository.getLatestRate();
            setTasaBcv(latest?.tasa || 0);
        } catch {
            console.error('No se pudo obtener la tasa BCV local');
        }
    };

    const fetchLowStock = async () => {
        try {
            const items = await productRepository.getLowStock();
            setLowStockProducts(items);
        } catch (error) {
            console.error('No se pudo obtener productos con stock bajo:', error);
        }
    };

    const fetchProducts = async (query = '') => {
        setLoading(true);
        try {
            const items = await productRepository.search(query);
            setProducts(items);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2>Gestión de Inventario</h2>
                <button onClick={openNew} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '0.5rem' }} /> Nuevo Producto
                </button>
            </div>

            {/* Estado de Stock — Estilo Full-Bleed Moderno */}
            <div style={{
                background: lowStockCount > 0
                    ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
                    : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: '1.125rem',
                padding: '1.25rem 1.5rem',
                boxShadow: lowStockCount > 0
                    ? '0 10px 25px -5px rgba(225, 29, 72, 0.35)'
                    : '0 10px 25px -5px rgba(5, 150, 105, 0.35)',
                color: 'white',
                marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                        Inventario General
                    </span>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'white',
                    }}>
                        {lowStockCount > 0 ? (
                            <>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }} />
                                Requiere Acción
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                Óptimo
                            </>
                        )}
                    </span>
                </div>

                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                    Estado de Stock
                </h4>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                    {lowStockCount > 0
                        ? `¡Atención! Se detectaron ${lowStockCount} ${lowStockCount === 1 ? 'producto' : 'productos'} con stock crítico o agotado.`
                        : '¡Excelente! Todos los productos cuentan con stock suficiente para atender pedidos.'}
                </p>

                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '1rem 0' }} />

                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'white',
                        color: lowStockCount > 0 ? '#be123c' : '#047857',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'transform 0.15s ease',
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {lowStockCount > 0 ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
                        {showLowStockOnly
                            ? 'Ver todos los productos'
                            : lowStockCount > 0
                                ? `Ver ${lowStockCount} ${lowStockCount === 1 ? 'producto' : 'productos'} en alerta`
                                : 'Ver productos sin/bajo stock'}
                    </span>
                    <ChevronRight size={18} />
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

            <div className="card table-responsive" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th className="hide-mobile" style={{ padding: '1rem', textAlign: 'left' }}>Código</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Producto</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Precio (USD)</th>
                            <th className="hide-mobile" style={{ padding: '1rem', textAlign: 'right' }}>Precio (Bs.)</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Stock</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getFilteredProducts().map(product => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td className="hide-mobile" style={{ padding: '1rem', color: '#64748b' }}>{product.codigo_barras}</td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>{product.nombre}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: '#2563eb', whiteSpace: 'nowrap' }}>
                                    ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                                </td>
                                <td className="hide-mobile" style={{ padding: '1rem', textAlign: 'right', color: '#16a34a', whiteSpace: 'nowrap' }}>
                                    {tasaBcv > 0
                                        ? `Bs. ${((product.precio_venta_usd_centavos / 100) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : '—'
                                    }
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {product.sin_control_stock ? (
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            backgroundColor: '#eff6ff',
                                            color: '#1d4ed8',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            Ilimitado
                                        </span>
                                    ) : (
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
                                    )}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                        {!product.sin_control_stock && (
                                            <button onClick={() => openStock(product)} title="Ajuste Stock" style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.25rem', color: '#2563eb' }}>
                                                <ArrowRightLeft size={16} />
                                            </button>
                                        )}
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
