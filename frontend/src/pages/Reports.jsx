import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
    DollarSign, TrendingUp, BarChart3, ArrowUpRight, 
    ArrowDownRight, RefreshCw, ShoppingBag, CreditCard, 
    Inbox
} from 'lucide-react';
import { saleRepository } from '../services/saleRepository';
import { useIsMobile } from '../hooks/useIsMobile';
import StatCard from '../components/StatCard';

const CustomTooltip = ({ active, payload, label, period }) => {
    if (active && payload && payload.length) {
        let labelFormatted = label;
        if (period === 'semana' || period === 'mes') {
            try {
                const dateObj = new Date(label + 'T00:00:00');
                labelFormatted = dateObj.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
            } catch (e) {}
        } else if (period === 'anio') {
            try {
                const [year, month] = label.split('-');
                const dateObj = new Date(year, parseInt(month) - 1, 1);
                labelFormatted = dateObj.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
            } catch (e) {}
        }

        return (
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.8rem', color: '#1e293b' }}>{labelFormatted}</p>
                <p style={{ color: '#2563eb', fontSize: '0.9rem', fontWeight: 700 }}>${payload[0].value.toFixed(2)} USD</p>
                {payload[0].payload.count > 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem' }}>{payload[0].payload.count} ventas</p>
                )}
            </div>
        );
    }
    return null;
};

const PAYMENT_LABELS = {
    efectivo_usd: 'Efectivo USD',
    efectivo_bs: 'Efectivo Bs.',
    transferencia_usd: 'Binance USDT',
    transferencia_bs: 'Pago Móvil',
    punto_venta: 'Punto de Venta',
    credito: 'Crédito'
};

const PAYMENT_COLORS = {
    efectivo_usd: '#10b981',
    efectivo_bs: '#059669',
    transferencia_usd: '#0ea5e9',
    transferencia_bs: '#2563eb',
    punto_venta: '#8b5cf6',
    credito: '#f59e0b'
};

const Reports = () => {
    const isNarrow = useIsMobile(900);
    const [period, setPeriod] = useState('dia');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mas_vendidos'); // 'mas_vendidos' | 'menos_vendidos'

    const fetchStats = async (selectedPeriod) => {
        // Solo mostrar skeleton en la carga inicial para evitar parpadeos al cambiar de período
        if (!data) setLoading(true);
        try {
            const reportData = await saleRepository.getReportStats(selectedPeriod);
            setData(reportData);
        } catch (error) {
            console.error('Error al cargar datos de reportes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(period);
    }, [period]);

    // Formatear datos de métodos de pago para PieChart
    const getPaymentPieData = () => {
        if (!data || !data.payments) return [];
        return data.payments
            .filter(p => p.monto > 0)
            .map(p => ({
                name: PAYMENT_LABELS[p.tipo_pago] || p.tipo_pago,
                value: p.monto,
                color: PAYMENT_COLORS[p.tipo_pago] || '#64748b'
            }));
    };

    const paymentPieData = getPaymentPieData();

    // Render stock status badge
    const renderStockBadge = (stock, min) => {
        let bgColor = '#f0fdf4';
        let textColor = '#16a34a';
        let text = `${stock} uds`;

        if (stock <= 0) {
            bgColor = '#fef2f2';
            textColor = '#dc2626';
            text = 'Sin Stock';
        } else if (min > 0 && stock <= min) {
            bgColor = '#fff7ed';
            textColor = '#ea580c';
            text = `${stock} uds (Bajo)`;
        }

        return (
            <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: bgColor,
                color: textColor
            }}>
                {text}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            
            {/* Encabezado + Selector de Período */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>Reportería</h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                        Resumen financiero y rendimiento de tu negocio
                    </p>
                </div>

                <div style={{
                    width: isNarrow ? '100%' : 'auto',
                    display: 'flex',
                    justifyContent: isNarrow ? 'center' : 'flex-end',
                }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        backgroundColor: 'white',
                        padding: '0.25rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        maxWidth: '100%'
                    }}>
                        {[
                            { id: 'dia', label: 'Hoy' },
                            { id: 'semana', label: 'Semana' },
                            { id: 'mes', label: 'Mes' },
                            { id: 'anio', label: 'Año' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setPeriod(item.id)}
                                style={{
                                    padding: isNarrow ? '0.5rem 1rem' : '0.5rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: period === item.id ? '#2563eb' : 'transparent',
                                    color: period === item.id ? 'white' : '#64748b'
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <StatCard
                    title="Ingresos en Dólares"
                    value={data ? `$${data.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                    subtitle={data ? `Tasa de cambio: Bs. ${data.rate.toFixed(2)}` : ''}
                    icon={DollarSign}
                    color="#2563eb"
                    loading={loading}
                />
                <StatCard
                    title="Ingresos en Bolívares"
                    value={data ? `Bs. ${data.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Bs. 0,00'}
                    subtitle="Equivalencia en moneda nacional"
                    icon={TrendingUp}
                    color="#16a34a"
                    loading={loading}
                />
                <StatCard
                    title="Transacciones"
                    value={data ? data.total_sales_count : '0'}
                    subtitle="Facturas completadas en el periodo"
                    icon={ShoppingBag}
                    color="#7c3aed"
                    loading={loading}
                />
                <StatCard
                    title="Tasa Oficial BCV"
                    value={data ? `Bs. ${data.rate.toFixed(2)}` : 'Bs. 0.00'}
                    subtitle="Referencia para pagos en Bs."
                    icon={CreditCard}
                    color="#f59e0b"
                    loading={loading}
                />
            </div>

            {/* Gráficos de Tendencia y Distribución de Pago */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '2fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
                
                {/* Gráfico de Tendencia */}
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '1rem', 
                    padding: '1.5rem', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                            Tendencia de Ingresos (USD)
                        </h3>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#94a3b8', 
                            backgroundColor: '#f8fafc',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontWeight: 500
                        }}>
                            {period === 'dia' && 'Desglose por Hora'}
                            {period === 'semana' && 'Últimos 7 Días'}
                            {period === 'mes' && 'Vista del Mes'}
                            {period === 'anio' && 'Desglose por Mes'}
                        </span>
                    </div>

                    <div style={{ flex: 1, minHeight: '260px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <RefreshCw size={24} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : data?.trend && data.trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={data.trend}>
                                    <defs>
                                        <linearGradient id="reportsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="punto" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                        tickFormatter={val => {
                                            if (period === 'semana' || period === 'mes') {
                                                try {
                                                    const parts = val.split('-');
                                                    return `${parts[2]}/${parts[1]}`;
                                                } catch(e) { return val; }
                                            }
                                            if (period === 'anio') {
                                                try {
                                                    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                                    const parts = val.split('-');
                                                    return months[parseInt(parts[1]) - 1];
                                                } catch(e) { return val; }
                                            }
                                            return val;
                                        }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                                    <Tooltip content={<CustomTooltip period={period} />} />
                                    <Area
                                        type="monotone" dataKey="ventas"
                                        stroke="#2563eb" strokeWidth={2.5}
                                        fill="url(#reportsSalesGrad)"
                                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                                <Inbox size={32} color="#94a3b8" />
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay ventas en este período para graficar.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Métodos de Pago */}
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '1rem', 
                    padding: '1.5rem', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
                        Métodos de Pago
                    </h3>
                    
                    <div style={{ flex: 1, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {loading ? (
                            <RefreshCw size={24} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : paymentPieData.length > 0 ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie
                                            data={paymentPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {paymentPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Monto']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                
                                {/* Leyenda personalizada compacta y profesional */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '0.5rem', 
                                    width: '100%', 
                                    marginTop: '0.75rem',
                                    fontSize: '0.75rem' 
                                }}>
                                    {paymentPieData.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ 
                                                width: '8px', 
                                                height: '8px', 
                                                borderRadius: '50%', 
                                                backgroundColor: item.color, 
                                                display: 'inline-block',
                                                flexShrink: 0
                                            }} />
                                            <span style={{ 
                                                color: '#475569', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                whiteSpace: 'nowrap' 
                                            }}>
                                                {item.name}: <strong>${item.value.toFixed(1)}</strong>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <CreditCard size={32} color="#94a3b8" />
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Sin registros de pagos en el período.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Listas de Rendimiento de Productos (Más y Menos vendidos) */}
            <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '1rem', 
                padding: '1.5rem', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                minWidth: 0,
                maxWidth: '100%'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} color="#2563eb" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                            Rendimiento del Catálogo
                        </h3>
                    </div>

                    {/* Selector de Pestaña */}
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: '0.25rem',
                        backgroundColor: '#f1f5f9', 
                        padding: '0.2rem', 
                        borderRadius: '0.5rem' 
                    }}>
                        <button
                            onClick={() => setActiveTab('mas_vendidos')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: activeTab === 'mas_vendidos' ? 'white' : 'transparent',
                                color: activeTab === 'mas_vendidos' ? '#2563eb' : '#64748b',
                                boxShadow: activeTab === 'mas_vendidos' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <ArrowUpRight size={14} color={activeTab === 'mas_vendidos' ? '#2563eb' : '#64748b'} />
                            Más Vendidos (Estrellas)
                        </button>
                        <button
                            onClick={() => setActiveTab('menos_vendidos')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: activeTab === 'menos_vendidos' ? 'white' : 'transparent',
                                color: activeTab === 'menos_vendidos' ? '#dc2626' : '#64748b',
                                boxShadow: activeTab === 'menos_vendidos' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <ArrowDownRight size={14} color={activeTab === 'menos_vendidos' ? '#dc2626' : '#64748b'} />
                            Menos Vendidos (Estancados)
                        </button>
                    </div>
                </div>

                {/* Tabla de Productos */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Rank', 'Producto', 'Código de Barras', 'Cantidad Vendida', 'Total USD', 'Stock Actual'].map((h, i) => (
                                    <th key={i} style={{ 
                                        textAlign: i === 0 || i === 3 || i === 4 ? 'center' : 'left', 
                                        padding: '0.75rem 1rem', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 600, 
                                        color: '#94a3b8', 
                                        borderBottom: '1px solid #f1f5f9' 
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}>
                                        {[1, 2, 3, 4, 5, 6].map(j => (
                                            <td key={j} style={{ padding: '1rem' }}>
                                                <div style={{ height: '18px', backgroundColor: '#f1f5f9', borderRadius: '0.25rem' }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : activeTab === 'mas_vendidos' ? (
                                data?.top_products && data.top_products.length > 0 ? (
                                    data.top_products.map((prod, idx) => (
                                        <tr key={prod.producto_id} style={{ borderBottom: '1px solid #f8fafc' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#2563eb' }}>
                                                #{idx + 1}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                {prod.nombre}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                {prod.codigo_barras || 'S/N'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                {prod.total_cantidad} {prod.unidad_medida === 'peso' ? 'kg' : 'uds'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>
                                                ${prod.total_usd.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                {renderStockBadge(prod.stock_actual, 5)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                            No se registran ventas en este período.
                                        </td>
                                    </tr>
                                )
                            ) : (
                                data?.low_products && data.low_products.length > 0 ? (
                                    data.low_products.map((prod, idx) => (
                                        <tr key={prod.producto_id} style={{ borderBottom: '1px solid #f8fafc' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#dc2626' }}>
                                                #{idx + 1}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                {prod.nombre}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                {prod.codigo_barras || 'S/N'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                {prod.total_cantidad} {prod.unidad_medida === 'peso' ? 'kg' : 'uds'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                                                ${prod.total_usd.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                {renderStockBadge(prod.stock_actual, 5)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                            No hay productos registrados en el catálogo.
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
