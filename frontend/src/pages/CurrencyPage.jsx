import React, { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, CheckCircle, AlertCircle, Clock, Edit3, Save, X, TrendingUp, History, Calendar, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { currencyRepository } from '../services/currencyRepository';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatBs } from '../utils/formatters';

const STATUS_CONFIG = {
    success: { color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle, label: 'Actualizado automáticamente' },
    offline: { color: '#f59e0b', bg: '#fffbeb', icon: WifiOff, label: 'Sin conexión — usando última tasa guardada' },
    error: { color: '#dc2626', bg: '#fef2f2', icon: AlertCircle, label: 'Error al sincronizar' },
    null: { color: '#64748b', bg: '#f8fafc', icon: Clock, label: 'Sin sincronizar aún' }
};

const CurrencyPage = () => {
    const isNarrow = useIsMobile(900);
    const [rateData, setRateData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [manualRate, setManualRate] = useState('');
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== 'undefined' ? navigator.onLine !== false : true
    );

    const fetchRateData = async () => {
        try {
            const [latest, hist] = await Promise.all([
                currencyRepository.getLatestRate(),
                currencyRepository.getHistory()
            ]);
            setRateData(latest);
            setHistory(hist || []);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando datos de tasa local');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchRateData();
            if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
                const res = await currencyRepository.ensureUpToDateRate().catch(() => null);
                if (res && !res.syncFailed) {
                    await fetchRateData();
                }
            }
        };
        init();

        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('vectra:rate-updated', fetchRateData);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('vectra:rate-updated', fetchRateData);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const handleSyncNow = async () => {
        setSyncing(true);
        try {
            const result = await currencyRepository.syncFromOnline();
            await fetchRateData();
            if (result.synced) {
                toast.success(`Tasa BCV actualizada: Bs. ${result.rate.tasa.toFixed(2)}`);
            } else if (result.offline) {
                toast.error('Sin conexión a Internet. Se mantiene la última tasa guardada.');
            } else {
                toast.error('No se pudo consultar la tasa online. Puedes ingresarla manualmente.');
            }
        } catch (error) {
            toast.error('Error al sincronizar la tasa');
        } finally {
            setSyncing(false);
        }
    };

    const handleManualSave = async () => {
        const tasa = parseFloat(manualRate);
        if (isNaN(tasa) || tasa <= 0) {
            toast.error('Ingresa una tasa válida');
            return;
        }
        try {
            await currencyRepository.saveRate({ tasa, fuente: 'Manual' });
            toast.success(`Tasa actualizada: Bs. ${tasa.toFixed(2)}`);
            setEditMode(false);
            setManualRate('');
            fetchRateData();
        } catch (error) {
            toast.error(error.message || 'Error guardando la tasa');
        }
    };

    const status = rateData?.sync?.lastStatus || null;
    const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.null;
    const StatusIcon = statusConf.icon;

    // Preparar datos históricos para el gráfico (últimos 14 días)
    const chartData = [...history]
        .reverse()
        .slice(-14)
        .map(r => ({
            fecha: new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
            tasa: parseFloat(r.tasa),
            fuente: r.fuente
        }));

    const minTasa = chartData.length > 0 ? Math.min(...chartData.map(d => d.tasa)) * 0.998 : 0;
    const maxTasa = chartData.length > 0 ? Math.max(...chartData.map(d => d.tasa)) * 1.002 : 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>

            {/* Header */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>Tasa de Cambio</h1>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>
                            Banco Central de Venezuela
                        </p>
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.75rem', borderRadius: '999px',
                        backgroundColor: isOnline ? '#ecfdf5' : '#fffbeb',
                        border: `1px solid ${isOnline ? '#a7f3d0' : '#fde68a'}`,
                        color: isOnline ? '#059669' : '#d97706',
                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                    }}>
                        <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            backgroundColor: isOnline ? '#10b981' : '#f59e0b'
                        }} />
                        {isOnline ? 'En línea' : 'Sin conexión'}
                    </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.825rem', marginTop: '0.75rem', marginBottom: 0, lineHeight: 1.45 }}>
                    Gestión oficial y automática de la divisa. El sistema almacena la última cotización y permite continuar facturando sin interrupciones.
                </p>
            </div>

            {/* Tasa actual + controles */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>

                {/* Card tasa actual */}
                <div style={{
                    backgroundColor: 'white', borderRadius: '1.125rem',
                    padding: 'clamp(1.25rem, 3vw, 1.75rem)',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                    border: '1px solid #f1f5f9',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                                    Tasa Oficial BCV
                                </p>
                                {loading ? (
                                    <div style={{ height: '44px', width: '180px', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', marginTop: '0.5rem' }} />
                                ) : editMode ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem' }}>
                                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#64748b' }}>Bs.</span>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            autoFocus
                                            value={manualRate}
                                            onChange={e => setManualRate(e.target.value)}
                                            placeholder={rateData?.tasa?.toFixed(4) || '0.0000'}
                                            style={{
                                                fontSize: '1.75rem', fontWeight: 800, width: '100%', maxWidth: '180px',
                                                border: '2px solid #2563eb', borderRadius: '0.625rem',
                                                padding: '0.3rem 0.6rem', outline: 'none', color: '#0f172a'
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter') handleManualSave(); if (e.key === 'Escape') setEditMode(false); }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 'clamp(2rem, 6vw, 2.65rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                                                Bs. {rateData?.tasa ? formatBs(rateData.tasa) : '—'}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>VES</span>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', marginBottom: 0 }}>
                                            1 USD = Bs. {rateData?.tasa?.toFixed(4) || '—'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                backgroundColor: '#eff6ff', border: '1px solid #dbeafe',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <TrendingUp size={20} color="#2563eb" />
                            </div>
                        </div>

                        {/* Fecha y fuente */}
                        {rateData && !loading && (
                            <div style={{
                                marginBottom: '1.25rem', padding: '0.75rem 0.875rem',
                                backgroundColor: '#f8fafc', borderRadius: '0.75rem',
                                border: '1px solid #f1f5f9',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                    <Calendar size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                    <span>Fecha: <strong style={{ color: '#0f172a' }}>{rateData.fecha ? new Date(rateData.fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha'}</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                                    <Link2 size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                    <span>Fuente:</span>
                                    <span style={{
                                        padding: '0.15rem 0.55rem', borderRadius: '999px',
                                        backgroundColor: rateData.fuente === 'Manual' ? '#fef3c7' : '#eff6ff',
                                        color: rateData.fuente === 'Manual' ? '#92400e' : '#1d4ed8',
                                        fontWeight: 600, fontSize: '0.72rem'
                                    }}>
                                        {rateData.fuente || 'Desconocida'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botones de acción apilados y cómodos para móvil */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {editMode ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                                <button
                                    onClick={handleManualSave}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                                        padding: '0.85rem 1rem', borderRadius: '0.875rem',
                                        border: 'none', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                        color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                                    }}
                                >
                                    <Save size={17} />
                                    Guardar
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); setManualRate(''); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                                        padding: '0.85rem 1rem', borderRadius: '0.875rem',
                                        border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc',
                                        color: '#475569', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700
                                    }}
                                >
                                    <X size={17} />
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleSyncNow}
                                    disabled={syncing}
                                    style={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        padding: '0.875rem 1.25rem', borderRadius: '0.875rem',
                                        border: 'none',
                                        background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: 'white', cursor: syncing ? 'not-allowed' : 'pointer',
                                        fontSize: '0.925rem', fontWeight: 700,
                                        boxShadow: syncing ? 'none' : '0 6px 18px rgba(37, 99, 235, 0.3)',
                                    }}
                                >
                                    <RefreshCw size={17} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                                    {syncing ? 'Sincronizando...' : 'Sincronizar con BCV'}
                                </button>
                                <button
                                    onClick={() => { setEditMode(true); setManualRate(rateData?.tasa?.toFixed(2) || ''); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        padding: '0.8rem 1.25rem', borderRadius: '0.875rem',
                                        border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc',
                                        color: '#334155', cursor: 'pointer',
                                        fontSize: '0.9rem', fontWeight: 700,
                                    }}
                                >
                                    <Edit3 size={16} color="#475569" />
                                    Ingresar manualmente
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Card estado de sincronización */}
                <div style={{
                    backgroundColor: 'white', borderRadius: '1.125rem',
                    padding: 'clamp(1.25rem, 3vw, 1.75rem)',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                    border: '1px solid #f1f5f9'
                }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
                        Estado de Sincronización
                    </p>

                    {/* Indicador offline-first */}
                    <div style={{
                        backgroundColor: statusConf.bg, borderRadius: '0.875rem',
                        border: `1px solid ${statusConf.color}28`,
                        padding: '0.875rem 1rem', marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            backgroundColor: `${statusConf.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <StatusIcon size={18} color={statusConf.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: statusConf.color, fontSize: '0.85rem', margin: 0 }}>
                                {statusConf.label}
                            </p>
                            {rateData?.sync?.lastAttempt && (
                                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                                    Último intento: {new Date(rateData.sync.lastAttempt).toLocaleTimeString('es-VE')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Explicación del modo offline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <InfoRow
                            dotBg="#fee2e2"
                            dotColor="#ef4444"
                            title="Modo Offline"
                            desc="El sistema siempre funciona con la última tasa guardada"
                        />
                        <InfoRow
                            dotBg="#fef3c7"
                            dotColor="#f59e0b"
                            title="Consulta directa BCV"
                            desc="Si hay internet, puedes sincronizar la tasa oficial al instante"
                        />
                        <InfoRow
                            dotBg="#dcfce7"
                            dotColor="#10b981"
                            title="Tasa congelada por venta"
                            desc="Cada venta guarda la tasa usada para no alterar el historial"
                        />
                        <InfoRow
                            icon={<Edit3 size={13} color="#2563eb" />}
                            dotBg="#eff6ff"
                            title="Actualización manual"
                            desc="Puedes ingresar la tasa a mano en cualquier momento"
                        />
                    </div>
                </div>
            </div>

            {/* Gráfico histórico */}
            {chartData.length > 1 && (
                <div style={{
                    backgroundColor: 'white', borderRadius: '1.125rem',
                    padding: 'clamp(1.125rem, 3vw, 1.5rem)',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                    border: '1px solid #f1f5f9',
                    minWidth: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} color="#475569" />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Histórico — Últimos 14 días</h3>
                        </div>
                        <span style={{
                            fontSize: '0.72rem', fontWeight: 600, color: '#64748b',
                            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                            padding: '0.2rem 0.5rem', borderRadius: '0.4rem'
                        }}>
                            Bs/USD
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="bcvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis
                                domain={[minTasa, maxTasa]} axisLine={false} tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={v => `${v.toFixed(0)}`}
                            />
                            <Tooltip
                                formatter={(value) => [`Bs. ${value.toFixed(4)}`, 'Tasa']}
                                contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                            />
                            <Area
                                type="monotone" dataKey="tasa"
                                stroke="#2563eb" strokeWidth={2.5}
                                fill="url(#bcvAreaGrad)"
                                dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabla histórica */}
            <div style={{
                backgroundColor: 'white', borderRadius: '1.125rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                border: '1px solid #f1f5f9',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Historial de Tasas</h3>
                </div>
                <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            {['Fecha', 'Tasa (Bs/USD)', 'Fuente'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1.125rem', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: '0.75rem 1.125rem', fontSize: '0.825rem', color: '#374151' }}>
                                    {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td style={{ padding: '0.75rem 1.125rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                    Bs. {parseFloat(r.tasa).toFixed(4)}
                                </td>
                                <td style={{ padding: '0.75rem 1.125rem' }}>
                                    <span style={{
                                        fontSize: '0.72rem', padding: '0.2rem 0.625rem',
                                        borderRadius: '999px', fontWeight: 600,
                                        backgroundColor: r.fuente === 'Manual' ? '#fef3c7' : '#eff6ff',
                                        color: r.fuente === 'Manual' ? '#92400e' : '#1d4ed8',
                                        display: 'inline-block'
                                    }}>
                                        {r.fuente || 'Desconocida'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    No hay registros de tasa aún
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const InfoRow = ({ icon, dotBg, dotColor, title, desc }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '0.75rem', backgroundColor: '#f8fafc' }}>
        <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            backgroundColor: dotBg || '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: '1px'
        }}>
            {icon || <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: dotColor }} />}
        </div>
        <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</p>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0.15rem 0 0', lineHeight: 1.35 }}>{desc}</p>
        </div>
    </div>
);

export default CurrencyPage;
