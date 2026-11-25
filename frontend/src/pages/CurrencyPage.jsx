import React, { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, CheckCircle, AlertCircle, Clock, Edit3, Save, X, TrendingUp, History } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { currencyRepository } from '../services/currencyRepository';
import { useIsMobile } from '../hooks/useIsMobile';

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
        fetchRateData();
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Header */}
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Tasa de Cambio BCV</h1>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Gestión de la tasa del Banco Central de Venezuela. El sistema funciona offline con la última tasa guardada.
                </p>
            </div>

            {/* Tasa actual + controles */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>

                {/* Card tasa actual */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: 'clamp(1.25rem, 3vw, 2rem)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Tasa Oficial BCV
                            </p>
                            {loading ? (
                                <div style={{ height: '48px', width: '180px', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', marginTop: '0.5rem' }} />
                            ) : editMode ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>Bs.</span>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        autoFocus
                                        value={manualRate}
                                        onChange={e => setManualRate(e.target.value)}
                                        placeholder={rateData?.tasa?.toFixed(4) || '0.0000'}
                                        style={{
                                            fontSize: '2rem', fontWeight: 700, width: '160px',
                                            border: '2px solid #2563eb', borderRadius: '0.5rem',
                                            padding: '0.25rem 0.5rem', outline: 'none'
                                        }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleManualSave(); if (e.key === 'Escape') setEditMode(false); }}
                                    />
                                </div>
                            ) : (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '3rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                        Bs. {rateData?.tasa?.toFixed(2) || '—'}
                                    </span>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                        1 USD = Bs. {rateData?.tasa?.toFixed(4) || '—'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <TrendingUp size={22} color="#2563eb" />
                        </div>
                    </div>

                    {/* Fecha y fuente */}
                    {rateData && !loading && (
                        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                📅 Fecha: <strong>{rateData.fecha ? new Date(rateData.fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha'}</strong>
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                🔗 Fuente: {rateData.fuente || 'Desconocida'}
                            </p>
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {editMode ? (
                            <>
                                <button
                                    onClick={handleManualSave}
                                    style={btnStyle('#16a34a')}
                                >
                                    <Save size={16} />
                                    Guardar
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); setManualRate(''); }}
                                    style={btnStyle('#64748b')}
                                >
                                    <X size={16} />
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleSyncNow}
                                    disabled={syncing}
                                    style={btnStyle('#2563eb', syncing)}
                                >
                                    <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                                    {syncing ? 'Sincronizando...' : 'Sincronizar con BCV'}
                                </button>
                                <button
                                    onClick={() => { setEditMode(true); setManualRate(rateData?.tasa?.toFixed(2) || ''); }}
                                    style={btnStyle('#64748b')}
                                >
                                    <Edit3 size={16} />
                                    Ingresar manualmente
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Card estado de sincronización */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: 'clamp(1.25rem, 3vw, 2rem)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
                        Estado de Sincronización
                    </p>

                    {/* Indicador offline-first */}
                    <div style={{
                        backgroundColor: statusConf.bg, borderRadius: '0.75rem',
                        padding: '1rem', marginBottom: '1.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem'
                    }}>
                        <StatusIcon size={22} color={statusConf.color} />
                        <div>
                            <p style={{ fontWeight: 600, color: statusConf.color, fontSize: '0.875rem' }}>
                                {statusConf.label}
                            </p>
                            {rateData?.sync?.lastAttempt && (
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                                    Último intento: {new Date(rateData.sync.lastAttempt).toLocaleTimeString('es-VE')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Explicación del modo offline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <InfoRow
                            icon="🔴"
                            active={true}
                            title="Modo Offline"
                            desc="El sistema siempre funciona con la última tasa guardada"
                        />
                        <InfoRow
                            icon="🟡"
                            active={true}
                            title="Consulta directa BCV"
                            desc="Si hay internet, puedes sincronizar la tasa oficial al instante"
                        />
                        <InfoRow
                            icon="🟢"
                            active={true}
                            title="Tasa congelada por venta"
                            desc="Cada venta guarda la tasa usada para no alterar el historial"
                        />
                        <InfoRow
                            icon="✏️"
                            active={true}
                            title="Actualización manual"
                            desc="Puedes ingresar la tasa a mano en cualquier momento"
                        />
                    </div>
                </div>
            </div>

            {/* Gráfico histórico */}
            {chartData.length > 1 && (
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <History size={18} color="#64748b" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Histórico de Tasa — Últimos 14 días</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
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
                            <Line
                                type="monotone" dataKey="tasa"
                                stroke="#2563eb" strokeWidth={2.5}
                                dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabla histórica */}
            <div className="table-responsive" style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Historial de Tasas</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            {['Fecha', 'Tasa (Bs/USD)', 'Fuente'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
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
                                <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                                    Bs. {parseFloat(r.tasa).toFixed(4)}
                                </td>
                                <td style={{ padding: '0.75rem 1.25rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '0.2rem 0.625rem',
                                        borderRadius: '999px', fontWeight: 500,
                                        backgroundColor: r.fuente === 'Manual' ? '#fef3c7' : '#eff6ff',
                                        color: r.fuente === 'Manual' ? '#92400e' : '#1d4ed8'
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

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const btnStyle = (color, disabled = false) => ({
    display: 'flex', alignItems: 'center', gap: '0.375rem',
    padding: '0.625rem 1rem', borderRadius: '0.5rem',
    border: 'none', backgroundColor: disabled ? '#e2e8f0' : color,
    color: disabled ? '#94a3b8' : 'white', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem', fontWeight: 600, transition: 'opacity 0.15s'
});

const InfoRow = ({ icon, title, desc }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
        <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{title}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{desc}</p>
        </div>
    </div>
);

export default CurrencyPage;
