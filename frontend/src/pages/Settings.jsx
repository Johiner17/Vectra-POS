import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Save, Building2, Receipt, Database, Download, Upload, Share2,
    FileSpreadsheet, Loader2, ChevronDown, ChevronRight, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { settingsRepository } from '../services/settingsRepository';
import { backupService } from '../services/backupService';

const SectionHeader = ({ icon: Icon, title, description, isOpen, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: isOpen ? '0.75rem 0.75rem 0 0' : '0.75rem',
            cursor: 'pointer',
            color: '#f1f5f9',
            transition: 'all 0.2s',
        }}
    >
        <div
            style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <Icon size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{title}</h3>
            {description && <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{description}</p>}
        </div>
        {isOpen ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
    </button>
);

const FormField = ({ label, value, onChange, type = 'text', placeholder = '', options = [], helpText = '' }) => (
    <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
            {label}
        </label>
        {type === 'select' ? (
            <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        ) : type === 'textarea' ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
            />
        ) : (
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
            />
        )}
        {helpText && <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>{helpText}</p>}
    </div>
);

const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    color: '#0f172a',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
};

const Settings = () => {
    const [config, setConfig] = useState({});
    const [originalConfig, setOriginalConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState({ backups: true, empresa: true });
    const [backupStatus, setBackupStatus] = useState(null);
    const [busyBackup, setBusyBackup] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
    const fileInputRef = useRef(null);
    const preparedShareRef = useRef(null);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            await backupService.requestPersistentStorage();
            const [loadedConfig, status, prepared] = await Promise.all([
                settingsRepository.getConfig(),
                backupService.getStatus(),
                backupService.prepareShareFile().catch(() => null),
            ]);
            setConfig(loadedConfig);
            setOriginalConfig(loadedConfig);
            setBackupStatus(status);
            preparedShareRef.current = prepared;
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar configuración local');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const updateField = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    const handleSave = async () => {
        if (!hasChanges) return;
        try {
            setSaving(true);
            const saved = await settingsRepository.saveConfig(config);
            setOriginalConfig(saved);
            setConfig(saved);
            toast.success('Configuración guardada localmente');
        } catch (error) {
            toast.error(error.message || 'Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const toggleSection = (section) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const handleExportBackup = async () => {
        setBusyBackup(true);
        try {
            const res = await backupService.exportBackup();
            const status = await backupService.getStatus();
            setBackupStatus(status);
            toast.success(`Respaldo descargado (${res.counts.products} productos, ${res.counts.sales} ventas)`);
        } catch (error) {
            toast.error(error.message || 'No se pudo generar el respaldo');
        } finally {
            setBusyBackup(false);
        }
    };

    const handleFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingRestoreFile(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmRestoreBackup = async () => {
        if (!pendingRestoreFile) return;
        setBusyBackup(true);
        try {
            const counts = await backupService.importBackup(pendingRestoreFile);
            setPendingRestoreFile(null);
            toast.success(`Respaldo restaurado: ${counts.products} productos y ${counts.sales} ventas`);
            await loadAll();
        } catch (error) {
            toast.error(error.message || 'Error al restaurar copia de seguridad');
        } finally {
            setBusyBackup(false);
        }
    };

    const handleExportCsv = async () => {
        setBusyBackup(true);
        try {
            const count = await backupService.exportSalesCsv();
            toast.success(`Historial exportado (${count} ventas en CSV)`);
        } catch (error) {
            toast.error(error.message || 'Error exportando ventas');
        } finally {
            setBusyBackup(false);
        }
    };

    const handleShareBackup = async () => {
        setBusyBackup(true);
        try {
            const res = await backupService.shareBackup(preparedShareRef.current);
            if (res?.cancelled) return;
            const [status, prepared] = await Promise.all([
                backupService.getStatus(),
                backupService.prepareShareFile().catch(() => null),
            ]);
            setBackupStatus(status);
            preparedShareRef.current = prepared;
            if (res.shared) {
                toast.success('Respaldo compartido correctamente');
            } else if (res.unsupported) {
                toast('Tu navegador de escritorio no permite compartir archivos directo. Usa "Descargar Copia" y súbelo a WhatsApp Web o Drive.', {
                    icon: 'ℹ️',
                    duration: 5000,
                });
            }
        } catch (error) {
            if (error?.name !== 'AbortError') {
                toast.error(error.message || 'No se pudo compartir el respaldo');
            }
        } finally {
            setBusyBackup(false);
        }
    };

    const handleToggleAutoBackup = async (checked) => {
        try {
            await backupService.setAutoBackupEnabled(checked);
            setBackupStatus((prev) => (prev ? { ...prev, autoBackupEnabled: checked } : prev));
            toast.success(
                checked
                    ? 'Respaldo automático diario activado'
                    : 'Respaldo automático diario desactivado'
            );
        } catch {
            toast.error('No se pudo actualizar la preferencia');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 size={32} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header con botón guardar */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                }}
            >
                <div>
                    <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem' }}>
                        Configuración y Respaldos
                    </h1>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                        Datos almacenados localmente en este dispositivo
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        background: hasChanges ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#cbd5e1',
                        color: hasChanges ? '#fff' : '#64748b',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                        opacity: saving ? 0.7 : 1,
                        boxShadow: hasChanges ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                        transition: 'all 0.2s',
                    }}
                >
                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {hasChanges && (
                <div
                    style={{
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        background: '#fefce8',
                        border: '1px solid #fde047',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        color: '#854d0e',
                    }}
                >
                    ⚠️ Tienes cambios pendientes por guardar
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* ==== SECCIÓN: COPIAS DE SEGURIDAD ==== */}
                <div>
                    <SectionHeader
                        icon={Database}
                        title="Copias de Seguridad y Datos Locales"
                        description="Exporta, restaura o traslada tu información a otro dispositivo"
                        isOpen={openSections.backups}
                        onToggle={() => toggleSection('backups')}
                    />
                    {openSections.backups && (
                        <div style={sectionBody}>
                            {/* 4 StatBoxes en grilla 2x2 (o 4 en PC) */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                                    gap: '0.75rem',
                                    marginBottom: '1rem',
                                }}
                            >
                                <StatBox
                                    label="Productos"
                                    value={backupStatus?.counts?.products ?? 0}
                                    unit="items activos"
                                    dotColor="#3b82f6"
                                />
                                <StatBox
                                    label="Ventas"
                                    value={backupStatus?.counts?.sales ?? 0}
                                    unit="registradas"
                                    dotColor="#8b5cf6"
                                />
                                <StatBox
                                    label="Tasas BCV"
                                    value={backupStatus?.counts?.exchangeRates ?? 0}
                                    unit="registros"
                                    dotColor="#f59e0b"
                                />
                                <StatBox
                                    label="Almacenamiento"
                                    value={backupStatus?.persisted ? 'Protegido' : 'Estándar'}
                                    accent={backupStatus?.persisted ? '#059669' : '#64748b'}
                                    dotColor={backupStatus?.persisted ? '#10b981' : '#94a3b8'}
                                    checked={Boolean(backupStatus?.persisted)}
                                />
                            </div>

                            {/* Banner de última copia */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.875rem',
                                    backgroundColor: backupStatus?.lastBackupAt ? '#ecfdf5' : '#fffbeb',
                                    border: `1px solid ${backupStatus?.lastBackupAt ? '#a7f3d0' : '#fde68a'}`,
                                    marginBottom: '0.875rem',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '0.625rem',
                                        backgroundColor: backupStatus?.lastBackupAt ? '#d1fae5' : '#fef3c7',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        color: backupStatus?.lastBackupAt ? '#059669' : '#d97706'
                                    }}>
                                        {backupStatus?.lastBackupAt ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: backupStatus?.lastBackupAt ? '#047857' : '#b45309' }}>
                                            Última copia realizada
                                        </p>
                                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {backupStatus?.lastBackupAt
                                                ? new Date(backupStatus.lastBackupAt).toLocaleString('es-VE')
                                                : 'Sin respaldo aún'}
                                        </p>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: 'white',
                                    border: `1px solid ${backupStatus?.lastBackupAt ? '#a7f3d0' : '#fde68a'}`,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: backupStatus?.lastBackupAt ? '#047857' : '#b45309',
                                    flexShrink: 0,
                                }}>
                                    {backupStatus?.lastBackupAt ? 'Al día' : 'Pendiente'}
                                </span>
                            </div>

                            {/* Tarjeta Switch: Respaldo automático diario */}
                            <div
                                onClick={() => handleToggleAutoBackup(!(backupStatus?.autoBackupEnabled ?? true))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '0.875rem',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '1.125rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                                            Respaldo automático diario
                                        </span>
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 600, color: '#64748b',
                                            backgroundColor: '#e2e8f0', padding: '0.1rem 0.45rem', borderRadius: '0.35rem',
                                            fontFamily: 'monospace'
                                        }}>
                                            .json
                                        </span>
                                    </div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', lineHeight: 1.35 }}>
                                        Descarga automáticamente una copia de seguridad al completar la primera venta del día.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={backupStatus?.autoBackupEnabled ?? true}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleAutoBackup(!(backupStatus?.autoBackupEnabled ?? true));
                                    }}
                                    style={{
                                        width: '44px', height: '24px', borderRadius: '999px',
                                        backgroundColor: (backupStatus?.autoBackupEnabled ?? true) ? '#4f46e5' : '#cbd5e1',
                                        position: 'relative', border: 'none', cursor: 'pointer',
                                        transition: 'background-color 0.2s', flexShrink: 0, padding: 0
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute', top: '3px',
                                        left: (backupStatus?.autoBackupEnabled ?? true) ? '23px' : '3px',
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        transition: 'left 0.2s'
                                    }} />
                                </button>
                            </div>

                            {/* Subencabezado Acciones de Datos */}
                            <div style={{ marginBottom: '0.625rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase' }}>
                                    Acciones de datos
                                </span>
                            </div>

                            {/* Grilla 2x2 de botones tipo card iguales a la referencia */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: '0.75rem',
                            }}>
                                {/* 1. Descargar Copia (Principal) */}
                                <button
                                    type="button"
                                    onClick={handleExportBackup}
                                    disabled={busyBackup}
                                    style={{
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        alignItems: 'stretch', textAlign: 'left',
                                        padding: '0.95rem', borderRadius: '1rem', border: 'none',
                                        background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                                        color: 'white', cursor: busyBackup ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.4)',
                                        minHeight: '112px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '0.625rem',
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Download size={17} color="#fff" />
                                        </div>
                                        <span style={{
                                            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em',
                                            padding: '0.18rem 0.5rem', borderRadius: '0.4rem',
                                            backgroundColor: 'rgba(255,255,255,0.22)', color: 'white'
                                        }}>
                                            PRINCIPAL
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>Descargar Copia</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.82)', marginTop: '0.2rem' }}>Archivo local .json</div>
                                    </div>
                                </button>

                                {/* 2. Enviar Copia (WhatsApp o Drive) */}
                                <button
                                    type="button"
                                    onClick={handleShareBackup}
                                    disabled={busyBackup}
                                    style={{
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        alignItems: 'stretch', textAlign: 'left',
                                        padding: '0.95rem', borderRadius: '1rem',
                                        border: '1px solid #e2e8f0', backgroundColor: 'white',
                                        color: '#0f172a', cursor: busyBackup ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                        minHeight: '112px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '0.625rem',
                                            backgroundColor: '#ecfdf5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Share2 size={16} color="#16a34a" />
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>Enviar Copia</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>WhatsApp o Drive</div>
                                    </div>
                                </button>

                                {/* 3. Exportar Ventas (.csv) */}
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    disabled={busyBackup}
                                    style={{
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        alignItems: 'stretch', textAlign: 'left',
                                        padding: '0.95rem', borderRadius: '1rem',
                                        border: '1px solid #e2e8f0', backgroundColor: 'white',
                                        color: '#0f172a', cursor: busyBackup ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                        minHeight: '112px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '0.625rem',
                                            backgroundColor: '#ecfdf5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <FileSpreadsheet size={16} color="#16a34a" />
                                        </div>
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace',
                                            padding: '0.15rem 0.45rem', borderRadius: '0.4rem',
                                            backgroundColor: '#ecfdf5', color: '#059669'
                                        }}>
                                            .csv
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>Exportar Ventas</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Reporte para Excel</div>
                                    </div>
                                </button>

                                {/* 4. Restaurar Copia (.json) */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={busyBackup}
                                    style={{
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        alignItems: 'stretch', textAlign: 'left',
                                        padding: '0.95rem', borderRadius: '1rem',
                                        border: '1.5px dashed #cbd5e1', backgroundColor: '#fafafa',
                                        color: '#0f172a', cursor: busyBackup ? 'not-allowed' : 'pointer',
                                        minHeight: '112px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '0.625rem',
                                            backgroundColor: '#fef3c7',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Upload size={16} color="#d97706" />
                                        </div>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            fontSize: '0.65rem', fontWeight: 700,
                                            padding: '0.18rem 0.45rem', borderRadius: '0.4rem',
                                            backgroundColor: '#fef3c7', color: '#b45309'
                                        }}>
                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                                            Precaución
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>Restaurar Copia</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Reemplaza datos (.json)</div>
                                    </div>
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.txt,application/json,text/plain"
                                    onChange={handleFileSelected}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: EMPRESA ==== */}
                <div>
                    <SectionHeader
                        icon={Building2}
                        title="Información del Negocio"
                        description="Nombre, RIF, dirección y datos de contacto"
                        isOpen={openSections.empresa}
                        onToggle={() => toggleSection('empresa')}
                    />
                    {openSections.empresa && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField
                                    label="Nombre del Comercio"
                                    value={config.empresa_nombre || ''}
                                    onChange={(v) => updateField('empresa_nombre', v)}
                                    placeholder="Ej: Sopas Doña María"
                                />
                                <FormField
                                    label="RIF"
                                    value={config.empresa_rif || ''}
                                    onChange={(v) => updateField('empresa_rif', v)}
                                    placeholder="J-000000000"
                                />
                            </div>
                            <FormField
                                label="Dirección"
                                value={config.empresa_direccion || ''}
                                onChange={(v) => updateField('empresa_direccion', v)}
                                placeholder="Dirección del comercio"
                            />
                            <div style={gridTwo}>
                                <FormField
                                    label="Teléfono"
                                    value={config.empresa_telefono || ''}
                                    onChange={(v) => updateField('empresa_telefono', v)}
                                    placeholder="0414-0000000"
                                />
                                <FormField
                                    label="Email"
                                    value={config.empresa_email || ''}
                                    onChange={(v) => updateField('empresa_email', v)}
                                    placeholder="comercio@email.com"
                                    type="email"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: FISCAL Y TICKETS ==== */}
                <div>
                    <SectionHeader
                        icon={Receipt}
                        title="Facturación y Preferencias"
                        description="IVA por defecto, numeración de facturas y textos"
                        isOpen={openSections.fiscal}
                        onToggle={() => toggleSection('fiscal')}
                    />
                    {openSections.fiscal && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField
                                    label="Tasa IVA (%)"
                                    value={config.tasa_iva_default || '16.0'}
                                    onChange={(v) => updateField('tasa_iva_default', v)}
                                    type="number"
                                    helpText="Porcentaje de IVA sugerido para productos nuevos"
                                />
                                <FormField
                                    label="Último # Factura"
                                    value={config.ultimo_numero_factura || '0'}
                                    onChange={(v) => updateField('ultimo_numero_factura', v)}
                                    type="number"
                                    helpText="Contador correlativo local"
                                />
                            </div>
                            <FormField
                                label="Encabezado del Comprobante"
                                value={config.empresa_encabezado_ticket || ''}
                                onChange={(v) => updateField('empresa_encabezado_ticket', v)}
                                type="textarea"
                                placeholder="Texto opcional para el comprobante"
                            />
                            <FormField
                                label="Pie del Comprobante"
                                value={config.empresa_pie_ticket || ''}
                                onChange={(v) => updateField('empresa_pie_ticket', v)}
                                placeholder="Gracias por su compra"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación para restaurar backup */}
            {pendingRestoreFile && (
                <div
                    onClick={() => !busyBackup && setPendingRestoreFile(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '420px',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                        }}
                    >
                        <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.1rem' }}>
                            ¿Restaurar copia de seguridad?
                        </h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                            Archivo: <strong>{pendingRestoreFile.name}</strong>
                            <br />
                            Esto reemplazará los productos, ventas y tasas actuales de este dispositivo por los datos del respaldo.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                disabled={busyBackup}
                                onClick={() => setPendingRestoreFile(null)}
                                style={{
                                    flex: 1,
                                    padding: '0.65rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={busyBackup}
                                onClick={confirmRestoreBackup}
                                style={{
                                    flex: 1,
                                    padding: '0.65rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {busyBackup ? 'Restaurando...' : 'Sí, restaurar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const StatBox = ({ label, value, unit = '', dotColor = '#3b82f6', accent = '#0f172a', checked = false }) => (
    <div style={{
        padding: '0.85rem 0.95rem',
        borderRadius: '0.875rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{label}</p>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ margin: 0, fontSize: checked ? '1rem' : '1.35rem', fontWeight: 800, color: accent, lineHeight: 1.1 }}>
                {value}
            </span>
            {unit && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{unit}</span>}
            {checked && <ShieldCheck size={14} color={accent} style={{ alignSelf: 'center' }} />}
        </div>
    </div>
);

const sectionBody = {
    padding: '1.25rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 0.75rem 0.75rem',
};

const gridTwo = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
};

export default Settings;
