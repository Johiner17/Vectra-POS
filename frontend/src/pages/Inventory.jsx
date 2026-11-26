import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, ArrowRightLeft, History, Search, AlertTriangle, CheckCircle2, ChevronRight, SlidersHorizontal } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import KardexModal from '../components/KardexModal';
import { productRepository } from '../services/productRepository';
import { currencyRepository } from '../services/currencyRepository';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatBs } from '../utils/formatters';

const Inventory = () => {
    const isMobile = useIsMobile(768);
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
    const filteredProducts = getFilteredProducts();

    return (
        <div style={{ paddingBottom: isMobile ? '5.25rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Gestión de Inventario</h2>
                {!isMobile && (
                    <button onClick={openNew} className="btn btn-primary" style={{ borderRadius: '0.75rem', padding: '0.625rem 1.125rem', fontWeight: 600 }}>
                        <Plus size={18} style={{ marginRight: '0.4rem' }} /> Nuevo Producto
                    </button>
                )}
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

            {/* Buscador limpio + botón filtro rápido */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        style={{
                            width: '100%',
                            padding: '0.75rem 0.875rem 0.75rem 2.6rem',
                            borderRadius: '0.875rem',
                            border: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            fontSize: '0.9rem',
                            color: '#1e293b',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    title={showLowStockOnly ? 'Mostrar todos' : 'Filtrar bajo stock'}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '0.875rem',
                        border: `1px solid ${showLowStockOnly ? '#e11d48' : '#e2e8f0'}`,
                        backgroundColor: showLowStockOnly ? '#fff1f2' : 'white',
                        color: showLowStockOnly ? '#e11d48' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                >
                    <SlidersHorizontal size={18} />
                </button>
            </form>

            {/* Encabezado de lista */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                padding: '0 0.25rem',
            }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>
                    Productos ({filteredProducts.length})
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                    Precio (USD)
                </span>
            </div>

            {/* Cards de Productos */}
            {filteredProducts.length === 0 && !loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#94a3b8', borderRadius: '1rem' }}>
                    No se encontraron productos
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '0.875rem',
                }}>
                    {filteredProducts.map(product => {
                        const isLow = !product.sin_control_stock && product.stock_actual <= product.stock_minimo;
                        return (
                            <div
                                key={product.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '1rem 1.125rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.875rem',
                                }}
                            >
                                {/* Fila superior: Nombre + Código | Precio USD + Bs */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            lineHeight: 1.3,
                                            wordBreak: 'break-word',
                                        }}>
                                            {product.nombre}
                                        </h3>
                                        <p style={{
                                            margin: '0.2rem 0 0',
                                            fontSize: '0.78rem',
                                            color: '#94a3b8',
                                        }}>
                                            {product.codigo_barras ? `SKU: ${product.codigo_barras}` : 'Sin código de barras'}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.2 }}>
                                            ${(product.precio_venta_usd_centavos / 100).toFixed(2)}
                                        </div>
                                        {tasaBcv > 0 && (
                                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a', marginTop: '0.15rem' }}>
                                                Bs. {formatBs((product.precio_venta_usd_centavos / 100) * tasaBcv)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fila inferior: Stock + Acciones */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Stock:</span>
                                        {product.sin_control_stock ? (
                                            <span style={{
                                                padding: '0.22rem 0.7rem',
                                                borderRadius: '999px',
                                                backgroundColor: '#eff6ff',
                                                color: '#1d4ed8',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                            }}>
                                                Ilimitado
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '0.22rem 0.7rem',
                                                borderRadius: '999px',
                                                backgroundColor: isLow ? '#fee2e2' : '#dcfce7',
                                                color: isLow ? '#991b1b' : '#166534',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                            }}>
                                                {product.stock_actual}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {!product.sin_control_stock && (
                                            <button
                                                onClick={() => openStock(product)}
                                                title="Ajuste Stock"
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '0.625rem',
                                                    backgroundColor: '#eff6ff', color: '#2563eb',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <ArrowRightLeft size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openKardex(product)}
                                            title="Ver Kardex"
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '0.625rem',
                                                backgroundColor: '#f0fdf4', color: '#16a34a',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            <History size={16} />
                                        </button>
                                        <button
                                            onClick={() => openEdit(product)}
                                            title="Editar"
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '0.625rem',
                                                backgroundColor: '#f1f5f9', color: '#475569',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botón flotante + Nuevo en móvil */}
            {isMobile && (
                <button
                    onClick={openNew}
                    style={{
                        position: 'fixed',
                        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)',
                        right: '1rem',
                        zIndex: 990,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.85rem 1.35rem',
                        borderRadius: '999px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                    }}
                >
                    <Plus size={19} strokeWidth={2.5} />
                    Nuevo
                </button>
            )}

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
