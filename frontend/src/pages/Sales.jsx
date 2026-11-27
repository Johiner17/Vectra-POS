import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, X, ChevronLeft, ChevronRight, DollarSign, ShoppingBag, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleRepository } from '../services/saleRepository';
import { formatBs, formatPaymentLabel } from '../utils/formatters';
import { useIsMobile } from '../hooks/useIsMobile';
import StatCard from '../components/StatCard';

// ─── Modal de detalle de venta ───────────────────────────────────────────────
const SaleDetailModal = ({ sale, onClose }) => {
    if (!sale) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                width: 'calc(100vw - 1.5rem)', maxWidth: '580px', maxHeight: '90dvh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                        <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Venta #{sale.numero_factura}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {new Date(sale.fecha_venta).toLocaleString('es-VE')} · {sale.cajero || 'admin'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} color="#94a3b8" />
                    </button>
                </div>

                {/* Contenido scrollable */}
                <div style={{ overflow: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>

                    {/* Items */}
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                        Productos
                    </h4>
                    <div style={{ marginBottom: '1.5rem' }}>
                        {(sale.items || []).map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.625rem 0', borderBottom: '1px solid #f8fafc'
                            }}>
                                <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{item.nombre_producto}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        ${(item.precio_unitario_usd_centavos / 100).toFixed(2)} × {item.cantidad}
                                    </p>
                                </div>
                                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                                    ${(item.total_usd_centavos / 100).toFixed(2)}
                                </strong>
                            </div>
                        ))}
                    </div>

                    {/* Pagos */}
                    {sale.payments?.length > 0 && (
                        <>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                Pagos
                            </h4>
                            <div style={{ marginBottom: '1.5rem' }}>
                                {sale.payments.map((p, i) => (
                                    <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                                                {formatPaymentLabel(p.tipo_pago)}
                                            </span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                {p.moneda === 'BS' ? `Bs. ${formatBs(p.monto_centavos / 100)}` : `$ ${(p.monto_centavos / 100).toFixed(2)}`}
                                            </span>
                                        </div>
                                        {p.referencia && (
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                Ref: {p.referencia}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Totales */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
                            <span style={{ color: '#64748b' }}>Subtotal:</span>
                            <span>${(sale.subtotal_usd_centavos / 100).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            <span style={{ color: '#64748b' }}>IVA:</span>
                            <span>${(sale.iva_usd_centavos / 100).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
                            <strong style={{ fontSize: '1rem' }}>Total USD:</strong>
                            <strong style={{ fontSize: '1rem', color: '#2563eb' }}>${(sale.total_usd_centavos / 100).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            <span>Total Bs. (×{formatBs(sale.tasa_bcv_usada)}):</span>
                            <span>Bs. {formatBs(sale.total_bs_centavos / 100)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PAGE_SIZE = 20;

// ─── Página principal ─────────────────────────────────────────────────────────
const Sales = () => {
    const isMobile = useIsMobile(768);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        fechaInicio: '',
        fechaFin: '',
        search: ''
    });

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const data = await saleRepository.getSales({
                fechaInicio: filters.fechaInicio,
                fechaFin: filters.fechaFin,
            });
            setSales(data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando historial de ventas');
        } finally {
            setLoading(false);
        }
    }, [filters.fechaInicio, filters.fechaFin]);

    useEffect(() => { fetchSales(); }, [fetchSales]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.search, filters.fechaInicio, filters.fechaFin]);

    const openDetail = async (saleId) => {
        setDetailLoading(true);
        try {
            const detail = await saleRepository.getSaleById(saleId);
            if (!detail) {
                toast.error('Venta no encontrada');
                return;
            }
            setSelectedSale(detail);
        } catch {
            toast.error('Error cargando detalle de venta');
        } finally {
            setDetailLoading(false);
        }
    };

    // Filtro por búsqueda local (número de factura o cajero)
    const filteredSales = filters.search
        ? sales.filter(s =>
            s.numero_factura?.toLowerCase().includes(filters.search.toLowerCase()) ||
            (s.cajero || s.username || '').toLowerCase().includes(filters.search.toLowerCase())
        )
        : sales;

    const totalUsd = filteredSales.reduce((a, s) => a + (s.total_usd_centavos / 100), 0);
    const totalBs = filteredSales.reduce((a, s) => a + (s.total_bs_centavos / 100), 0);
    const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginatedSales = filteredSales.slice(startIndex, startIndex + PAGE_SIZE);
    const hasActiveFilters = Boolean(filters.fechaInicio || filters.fechaFin || filters.search);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Header */}
            <div>
                <h1 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>Historial de Ventas</h1>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                    Consulta y gestiona todas las transacciones
                </p>
            </div>

            {/* KPIs estilo Full-Bleed Moderno */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <StatCard
                    title="Total Facturado"
                    value={`$${totalUsd.toFixed(2)}`}
                    subtitle={`Equivalente: Bs. ${formatBs(totalBs)}`}
                    icon={DollarSign}
                    color="#2563eb"
                    loading={loading && sales.length === 0}
                />
                <StatCard
                    title="Ventas Registradas"
                    value={filteredSales.length}
                    subtitle={hasActiveFilters ? 'Coinciden con el filtro actual' : 'Total en el historial'}
                    icon={ShoppingBag}
                    color="#16a34a"
                    loading={loading && sales.length === 0}
                />
            </div>

            {/* Filtros */}
            <div style={{
                backgroundColor: 'white', borderRadius: '1rem', padding: isMobile ? '1rem' : '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: isMobile ? 'stretch' : 'flex-end'
            }}>
                <div style={{ position: 'relative', flex: isMobile ? 'none' : 1, minWidth: isMobile ? '100%' : '200px' }}>
                    {!isMobile && (
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                            Buscar
                        </label>
                    )}
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Buscar por # factura..."
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                                border: '1.5px solid #e2e8f0', borderRadius: '0.625rem',
                                fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Desde y Hasta en la misma línea con etiqueta arriba */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.625rem',
                    width: isMobile ? '100%' : 'auto',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                            Desde
                        </label>
                        <input
                            type="date"
                            value={filters.fechaInicio}
                            onChange={e => setFilters(f => ({ ...f, fechaInicio: e.target.value }))}
                            style={{
                                width: '100%', padding: '0.55rem 0.5rem',
                                border: '1.5px solid #e2e8f0', borderRadius: '0.625rem',
                                fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box',
                                backgroundColor: 'white', color: '#1e293b'
                            }}
                        />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={filters.fechaFin}
                            onChange={e => setFilters(f => ({ ...f, fechaFin: e.target.value }))}
                            style={{
                                width: '100%', padding: '0.55rem 0.5rem',
                                border: '1.5px solid #e2e8f0', borderRadius: '0.625rem',
                                fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box',
                                backgroundColor: 'white', color: '#1e293b'
                            }}
                        />
                    </div>
                </div>

                {hasActiveFilters && (
                    <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                        <button
                            onClick={() => setFilters({ fechaInicio: '', fechaFin: '', search: '' })}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.55rem 1rem',
                                border: '1.5px solid #e2e8f0', borderRadius: '0.625rem',
                                backgroundColor: '#f8fafc', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 600, color: '#475569',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <RotateCcw size={14} />
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Tabla + Paginación (paginación fuera del scroll horizontal para evitar fondo blanco al deslizar) */}
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            {[
                                { label: '# Factura', hideMobile: false },
                                { label: 'Fecha', hideMobile: false },
                                { label: 'Cajero', hideMobile: true },
                                { label: 'Items', hideMobile: true },
                                { label: 'Total USD', hideMobile: false },
                                { label: 'Total Bs.', hideMobile: true },
                                { label: 'Método', hideMobile: true },
                                { label: '', hideMobile: true },
                            ].map((h, idx) => (
                                <th key={idx} className={h.hideMobile ? 'hide-mobile' : ''} style={{
                                    textAlign: isMobile && h.label === 'Total USD' ? 'right' : 'left',
                                    padding: isMobile ? '0.75rem 0.65rem' : '0.875rem 1rem',
                                    fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
                                    borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap'
                                }}>
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}>
                                    {[false, false, true, true, false, true, true, true].map((hideMob, j) => (
                                        <td key={j} className={hideMob ? 'hide-mobile' : ''} style={{ padding: isMobile ? '0.75rem 0.65rem' : '0.875rem 1rem' }}>
                                            <div style={{ height: '14px', backgroundColor: '#f1f5f9', borderRadius: '0.25rem' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    No se encontraron ventas
                                </td>
                            </tr>
                        ) : paginatedSales.map(sale => (
                            <tr
                                key={sale.id}
                                onClick={() => !detailLoading && openDetail(sale.id)}
                                style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.1s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: isMobile ? '0.8rem 0.65rem' : '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.85rem' }}>
                                        #{sale.numero_factura}
                                    </span>
                                </td>
                                <td style={{ padding: isMobile ? '0.8rem 0.5rem' : '0.875rem 1rem', fontSize: isMobile ? '0.76rem' : '0.8rem', color: '#374151', whiteSpace: 'nowrap' }}>
                                    {new Date(sale.fecha_venta).toLocaleString('es-VE', {
                                        day: '2-digit', month: '2-digit', year: isMobile ? '2-digit' : 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#374151' }}>
                                    {sale.cajero || sale.username || 'Local'}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                                    {sale.items_count || '—'}
                                </td>
                                <td style={{
                                    padding: isMobile ? '0.8rem 0.65rem' : '0.875rem 1rem',
                                    fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', whiteSpace: 'nowrap',
                                    textAlign: isMobile ? 'right' : 'left'
                                }}>
                                    ${(sale.total_usd_centavos / 100).toFixed(2)}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    Bs. {formatBs(sale.total_bs_centavos / 100)}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem' }}>
                                    <span style={{
                                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                                        borderRadius: '999px', fontWeight: 500,
                                        backgroundColor: '#eff6ff', color: '#2563eb'
                                    }}>
                                        {sale.moneda_venta}
                                    </span>
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem' }}>
                                    <button
                                        onClick={e => { e.stopPropagation(); openDetail(sale.id); }}
                                        disabled={detailLoading}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                                            padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                                            border: '1px solid #e2e8f0', backgroundColor: 'white',
                                            cursor: 'pointer', fontSize: '0.75rem', color: '#374151', fontWeight: 500
                                        }}
                                    >
                                        <Eye size={14} />
                                        Ver
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Paginación */}
                {!loading && filteredSales.length > PAGE_SIZE && (
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'center' : 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        textAlign: isMobile ? 'center' : 'left'
                    }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Mostrando <strong>{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredSales.length)}</strong> de <strong>{filteredSales.length}</strong>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: safePage <= 1 ? '#f1f5f9' : 'white',
                                    color: safePage <= 1 ? '#94a3b8' : '#334155',
                                    fontSize: '0.8rem', fontWeight: 600,
                                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <ChevronLeft size={16} />
                                Anterior
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', padding: '0 0.35rem' }}>
                                {safePage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: safePage >= totalPages ? '#f1f5f9' : 'white',
                                    color: safePage >= totalPages ? '#94a3b8' : '#334155',
                                    fontSize: '0.8rem', fontWeight: 600,
                                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Siguiente
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalle */}
            {selectedSale && (
                <SaleDetailModal
                    sale={selectedSale}
                    onClose={() => setSelectedSale(null)}
                />
            )}
        </div>
    );
};

export default Sales;
