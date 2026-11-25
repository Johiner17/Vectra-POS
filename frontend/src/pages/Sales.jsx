import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleRepository } from '../services/saleRepository';
import { formatBs } from '../utils/formatters';

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
                                            <span style={{ fontSize: '0.875rem', color: '#374151', textTransform: 'capitalize' }}>
                                                {p.tipo_pago?.replace(/_/g, ' ')}
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

// ─── Página principal ─────────────────────────────────────────────────────────
const Sales = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Historial de Ventas</h1>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Consulta y gestiona todas las transacciones</p>
            </div>

            {/* Filtros */}
            <div style={{
                backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar por # factura..."
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Desde:</label>
                    <input
                        type="date"
                        value={filters.fechaInicio}
                        onChange={e => setFilters(f => ({ ...f, fechaInicio: e.target.value }))}
                        style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Hasta:</label>
                    <input
                        type="date"
                        value={filters.fechaFin}
                        onChange={e => setFilters(f => ({ ...f, fechaFin: e.target.value }))}
                        style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    />
                </div>
                {(filters.fechaInicio || filters.fechaFin || filters.search) && (
                    <button
                        onClick={() => setFilters({ fechaInicio: '', fechaFin: '', search: '' })}
                        style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Resumen rápido */}
            {filteredSales.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        <strong style={{ color: '#1e293b' }}>{filteredSales.length}</strong> ventas encontradas ·
                        Total: <strong style={{ color: '#2563eb' }}>${totalUsd.toFixed(2)} USD</strong>
                    </span>
                </div>
            )}

            {/* Tabla */}
            <div className="table-responsive" style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
                                { label: '', hideMobile: false },
                            ].map((h, idx) => (
                                <th key={idx} className={h.hideMobile ? 'hide-mobile' : ''} style={{
                                    textAlign: 'left', padding: '0.875rem 1rem',
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
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <td key={j} style={{ padding: '0.875rem 1rem' }}>
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
                        ) : filteredSales.map(sale => (
                            <tr
                                key={sale.id}
                                style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.1s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: '0.875rem 1rem' }}>
                                    <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.875rem' }}>
                                        #{sale.numero_factura}
                                    </span>
                                </td>
                                <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#374151', whiteSpace: 'nowrap' }}>
                                    {new Date(sale.fecha_venta).toLocaleString('es-VE', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#374151' }}>
                                    {sale.cajero || sale.username || 'Local'}
                                </td>
                                <td className="hide-mobile" style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                                    {sale.items_count || '—'}
                                </td>
                                <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
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
                                <td style={{ padding: '0.875rem 1rem' }}>
                                    <button
                                        onClick={() => openDetail(sale.id)}
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
