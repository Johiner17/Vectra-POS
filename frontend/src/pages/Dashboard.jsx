import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, Package, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { saleRepository } from '../services/saleRepository';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatBs } from '../utils/formatters';
import StatCard from '../components/StatCard';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
                <p style={{ color: '#2563eb' }}>${payload[0].value.toFixed(2)} USD</p>
                {payload[0].payload.count > 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{payload[0].payload.count} ventas</p>
                )}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const isNarrow = useIsMobile(900);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await saleRepository.getDashboardStats();
            setStats(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Refrescar cada 2 minutos
        const interval = setInterval(fetchStats, 120000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Dashboard</h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0', backgroundColor: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer', color: '#64748b',
                        fontSize: '0.8rem'
                    }}
                >
                    <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    {lastUpdate ? `Actualizado: ${formatTime(lastUpdate)}` : 'Actualizar'}
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <StatCard
                    title="Ventas Hoy"
                    value={stats ? `$${stats.today.total_usd.toFixed(2)}` : '$0.00'}
                    subtitle={stats ? `${stats.today.count} transacciones` : ''}
                    icon={DollarSign}
                    color="#2563eb"
                    loading={loading}
                />
                <StatCard
                    title="Tasa BCV"
                    value={stats ? `Bs. ${formatBs(stats.rate)}` : 'Bs. 0,00'}
                    subtitle="Tasa actual"
                    icon={TrendingUp}
                    color="#16a34a"
                    loading={loading}
                />
                <StatCard
                    title="Productos Activos"
                    value={stats ? stats.products.total : '—'}
                    subtitle={stats ? `${stats.products.low_stock} con stock bajo` : ''}
                    icon={Package}
                    color="#7c3aed"
                    loading={loading}
                />
                <StatCard
                    title="Stock Bajo"
                    value={stats ? stats.products.low_stock : '—'}
                    subtitle="Productos bajo mínimo"
                    icon={AlertTriangle}
                    color={stats?.products.low_stock > 0 ? '#dc2626' : '#16a34a'}
                    loading={loading}
                />
            </div>

            {/* Gráfico + Top Productos */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '2fr 1fr', gap: '1.5rem' }}>

                {/* Gráfico de ventas semanales */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
                        Ventas — Últimos 7 días (USD)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={stats?.week || []}>
                            <defs>
                                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone" dataKey="ventas"
                                stroke="#2563eb" strokeWidth={2}
                                fill="url(#salesGrad)"
                                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 5 Productos */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' }}>
                        Top Productos — 7 días
                    </h3>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ height: '36px', backgroundColor: '#f1f5f9', borderRadius: '0.25rem' }} />
                            ))}
                        </div>
                    ) : stats?.top_products?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {stats.top_products.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        backgroundColor: ['#eff6ff', '#f0fdf4', '#faf5ff', '#fff7ed', '#fef2f2'][i],
                                        color: ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#dc2626'][i],
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
                                    }}>
                                        {i + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.nombre}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.total_vendido} uds. · ${p.total_usd.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', paddingTop: '2rem' }}>
                            Sin ventas esta semana
                        </p>
                    )}
                </div>
            </div>

            {/* Últimas Ventas */}
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                        <Clock size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Últimas Ventas
                    </h3>
                    <Link to="/sales" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                        Ver historial →
                    </Link>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Factura', 'Cajero', 'Total USD', 'Total Bs.', 'Fecha'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}>
                                        {[1, 2, 3, 4, 5].map(j => (
                                            <td key={j} style={{ padding: '0.75rem' }}>
                                                <div style={{ height: '16px', backgroundColor: '#f1f5f9', borderRadius: '0.25rem' }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : stats?.recent_sales?.length > 0 ? (
                                stats.recent_sales.map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                                            #{sale.numero_factura}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#374151' }}>
                                            {sale.cajero || 'admin'}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                            ${sale.total_usd.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            Bs. {formatBs(sale.total_bs)}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {new Date(sale.fecha_venta).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                        No hay ventas registradas
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
