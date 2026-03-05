import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Save, Building2, Receipt, Printer, Scale, Database,
    Shield, Users, Plus, RefreshCw, Eye, EyeOff, Loader2,
    ChevronDown, ChevronRight, UserPlus, ToggleLeft, ToggleRight,
    KeyRound, Trash2
} from 'lucide-react';

// ============================================
// Componentes auxiliares
// ============================================

const SectionHeader = ({ icon: Icon, title, description, isOpen, onToggle }) => (
    <button
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
            transition: 'all 0.2s'
        }}
    >
        <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
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
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.375rem' }}>
            {label}
        </label>
        {type === 'select' ? (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={inputStyle}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
        {helpText && <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: '#64748b' }}>{helpText}</p>}
    </div>
);

const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: '0.375rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    transition: 'border-color 0.2s',
    outline: 'none'
};

// ============================================
// Componente Principal
// ============================================

const Settings = () => {
    const [config, setConfig] = useState({});
    const [originalConfig, setOriginalConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState({ empresa: true });

    // Estado para gestión de usuarios
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showNewUser, setShowNewUser] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', nombre_completo: '', rol: 'cajero' });
    const [resetPasswordModal, setResetPasswordModal] = useState(null);
    const [resetPassword, setResetPassword] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.rol === 'admin';

    // Cargar configuraciones
    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/config');
            if (res.data.success) {
                setConfig(res.data.data);
                setOriginalConfig(res.data.data);
            }
        } catch (error) {
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar usuarios
    const loadUsers = useCallback(async () => {
        if (!isAdmin) return;
        try {
            setLoadingUsers(true);
            const res = await axios.get('/api/users');
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        } finally {
            setLoadingUsers(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        loadConfig();
        loadUsers();
    }, [loadConfig, loadUsers]);

    // Actualizar valor local
    const updateField = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    // Verificar cambios pendientes
    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    // Guardar configuraciones
    const handleSave = async () => {
        if (!hasChanges) return;
        try {
            setSaving(true);
            // Solo enviar los campos que cambiaron
            const changedKeys = {};
            for (const key of Object.keys(config)) {
                if (config[key] !== originalConfig[key]) {
                    changedKeys[key] = config[key];
                }
            }

            const res = await axios.put('/api/config', { configs: changedKeys });
            if (res.data.success) {
                setOriginalConfig(res.data.data);
                setConfig(res.data.data);
                toast.success('Configuración guardada correctamente');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // Toggle sección abierta/cerrada
    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Crear usuario
    const handleCreateUser = async () => {
        try {
            if (!newUser.username || !newUser.password || !newUser.nombre_completo) {
                toast.error('Todos los campos son obligatorios');
                return;
            }
            const res = await axios.post('/api/users', newUser);
            if (res.data.success) {
                toast.success('Usuario creado correctamente');
                setNewUser({ username: '', password: '', nombre_completo: '', rol: 'cajero' });
                setShowNewUser(false);
                loadUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al crear usuario');
        }
    };

    // Toggle activo/inactivo usuario
    const handleToggleUser = async (userId, currentActive) => {
        try {
            await axios.put(`/api/users/${userId}/toggle`, { active: !currentActive });
            toast.success(currentActive ? 'Usuario desactivado' : 'Usuario activado');
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cambiar estado');
        }
    };

    // Reset contraseña
    const handleResetPassword = async () => {
        if (!resetPassword || resetPassword.length < 4) {
            toast.error('La contraseña debe tener al menos 4 caracteres');
            return;
        }
        try {
            await axios.put(`/api/users/${resetPasswordModal.id}/reset-password`, { newPassword: resetPassword });
            toast.success('Contraseña reseteada correctamente');
            setResetPasswordModal(null);
            setResetPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al resetear contraseña');
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
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        Configuración del Sistema
                    </h1>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                        Administra los parámetros de tu negocio
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.625rem 1.25rem',
                            background: hasChanges ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#475569',
                            color: '#fff', border: 'none', borderRadius: '0.5rem',
                            fontWeight: 600, fontSize: '0.875rem',
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                            opacity: saving ? 0.7 : 1,
                            boxShadow: hasChanges ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                )}
            </div>

            {hasChanges && (
                <div style={{
                    padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: '#fefce8', border: '1px solid #fde047',
                    borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#854d0e'
                }}>
                    ⚠️ Tiene cambios sin guardar
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* ==== SECCIÓN: EMPRESA ==== */}
                <div>
                    <SectionHeader
                        icon={Building2} title="Información de la Empresa"
                        description="Nombre, RIF, dirección y datos del negocio"
                        isOpen={openSections.empresa} onToggle={() => toggleSection('empresa')}
                    />
                    {openSections.empresa && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField label="Nombre del Comercio" value={config.empresa_nombre || ''} onChange={v => updateField('empresa_nombre', v)} placeholder="Mi Comercio" />
                                <FormField label="RIF" value={config.empresa_rif || ''} onChange={v => updateField('empresa_rif', v)} placeholder="J-000000000" />
                            </div>
                            <FormField label="Dirección" value={config.empresa_direccion || ''} onChange={v => updateField('empresa_direccion', v)} placeholder="Dirección del comercio" />
                            <div style={gridTwo}>
                                <FormField label="Teléfono" value={config.empresa_telefono || ''} onChange={v => updateField('empresa_telefono', v)} placeholder="0414-0000000" />
                                <FormField label="Email" value={config.empresa_email || ''} onChange={v => updateField('empresa_email', v)} placeholder="comercio@email.com" type="email" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: FISCAL ==== */}
                <div>
                    <SectionHeader
                        icon={Receipt} title="Configuración Fiscal"
                        description="IVA, moneda, facturación y tickets"
                        isOpen={openSections.fiscal} onToggle={() => toggleSection('fiscal')}
                    />
                    {openSections.fiscal && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField label="Tasa IVA (%)" value={config.tasa_iva_default || '16.0'} onChange={v => updateField('tasa_iva_default', v)} type="number" helpText="Porcentaje de IVA aplicado por defecto" />
                                <FormField label="Moneda Principal" value={config.moneda_principal || 'USD'} onChange={v => updateField('moneda_principal', v)}
                                    type="select" options={[{ value: 'USD', label: 'USD - Dólar' }, { value: 'BS', label: 'BS - Bolívares' }]}
                                />
                            </div>
                            <div style={gridTwo}>
                                <FormField label="Prefijo de Factura" value={config.prefijo_factura || 'VEC'} onChange={v => updateField('prefijo_factura', v)} placeholder="VEC" helpText="Se usará como prefijo del número de factura" />
                                <FormField label="Decimales para Bs" value={config.redondeo_bs || '2'} onChange={v => updateField('redondeo_bs', v)} type="number" helpText="Cantidad de decimales para redondeo en bolívares" />
                            </div>
                            <FormField
                                label="Permitir Venta sin Stock"
                                value={config.permitir_venta_sin_stock || '0'}
                                onChange={v => updateField('permitir_venta_sin_stock', v)}
                                type="select"
                                options={[{ value: '0', label: 'No - Bloquear ventas sin stock' }, { value: '1', label: 'Sí - Permitir ventas sin stock' }]}
                            />
                            <FormField label="Encabezado del Ticket" value={config.empresa_encabezado_ticket || ''} onChange={v => updateField('empresa_encabezado_ticket', v)} type="textarea" placeholder="Texto personalizado para el encabezado del ticket" />
                            <FormField label="Pie del Ticket" value={config.empresa_pie_ticket || ''} onChange={v => updateField('empresa_pie_ticket', v)} placeholder="Gracias por su compra" />
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: IMPRESORA ==== */}
                <div>
                    <SectionHeader
                        icon={Printer} title="Impresora Térmica"
                        description="Tipo de conexión, ancho de papel y configuración"
                        isOpen={openSections.printer} onToggle={() => toggleSection('printer')}
                    />
                    {openSections.printer && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField label="Tipo de Conexión" value={config.printer_type || 'usb'}
                                    onChange={v => updateField('printer_type', v)} type="select"
                                    options={[{ value: 'usb', label: 'USB' }, { value: 'serial', label: 'Serial (COM)' }, { value: 'network', label: 'Red (IP)' }]}
                                />
                                <FormField label="Ancho de Papel (mm)" value={config.printer_width || '58'}
                                    onChange={v => updateField('printer_width', v)} type="select"
                                    options={[{ value: '58', label: '58mm' }, { value: '80', label: '80mm' }]}
                                />
                            </div>
                            <div style={gridTwo}>
                                <FormField label="Vendor ID" value={config.printer_vendor_id || ''} onChange={v => updateField('printer_vendor_id', v)} placeholder="Ej: 0x0416" helpText="Identificador del fabricante USB" />
                                <FormField label="Product ID" value={config.printer_product_id || ''} onChange={v => updateField('printer_product_id', v)} placeholder="Ej: 0x5011" helpText="Identificador del producto USB" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: BALANZA ==== */}
                <div>
                    <SectionHeader
                        icon={Scale} title="Balanza Serial"
                        description="Puerto COM, velocidad y protocolo"
                        isOpen={openSections.scale} onToggle={() => toggleSection('scale')}
                    />
                    {openSections.scale && (
                        <div style={sectionBody}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <FormField label="Puerto COM" value={config.scale_port || 'COM3'} onChange={v => updateField('scale_port', v)} placeholder="COM3" />
                                <FormField label="Baudrate" value={config.scale_baudrate || '9600'} onChange={v => updateField('scale_baudrate', v)} type="select"
                                    options={[{ value: '2400', label: '2400' }, { value: '4800', label: '4800' }, { value: '9600', label: '9600' }, { value: '19200', label: '19200' }]}
                                />
                                <FormField label="Protocolo" value={config.scale_protocol || 'toledo'} onChange={v => updateField('scale_protocol', v)} type="select"
                                    options={[{ value: 'toledo', label: 'Toledo' }, { value: 'cas', label: 'CAS' }, { value: 'dibal', label: 'Dibal' }]}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: SISTEMA ==== */}
                <div>
                    <SectionHeader
                        icon={Database} title="Sistema"
                        description="Backup, facturación y parámetros generales"
                        isOpen={openSections.sistema} onToggle={() => toggleSection('sistema')}
                    />
                    {openSections.sistema && (
                        <div style={sectionBody}>
                            <div style={gridTwo}>
                                <FormField label="Backup al cerrar caja" value={config.backup_auto_cierre_caja || '1'} onChange={v => updateField('backup_auto_cierre_caja', v)}
                                    type="select" options={[{ value: '1', label: 'Sí' }, { value: '0', label: 'No' }]}
                                    helpText="Crear backup automático al cerrar la caja"
                                />
                                <FormField label="Máx. archivos backup" value={config.max_backup_files || '30'} onChange={v => updateField('max_backup_files', v)} type="number" helpText="Cantidad máxima de backups a mantener" />
                            </div>
                            <div style={gridTwo}>
                                <FormField label="Último # Factura" value={config.ultimo_numero_factura || '0'} onChange={v => updateField('ultimo_numero_factura', v)} type="number" helpText="Número de la última factura generada (no editar a menos que sea necesario)" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ==== SECCIÓN: USUARIOS ==== */}
                {isAdmin && (
                    <div>
                        <SectionHeader
                            icon={Users} title="Gestión de Usuarios"
                            description="Crear, activar/desactivar usuarios y resetear contraseñas"
                            isOpen={openSections.users} onToggle={() => toggleSection('users')}
                        />
                        {openSections.users && (
                            <div style={sectionBody}>
                                {/* Botón nuevo usuario */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                    <button
                                        onClick={() => setShowNewUser(!showNewUser)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 1rem', background: '#2563eb', color: '#fff',
                                            border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                                            fontSize: '0.8125rem', fontWeight: 500
                                        }}
                                    >
                                        <UserPlus size={16} /> Nuevo Usuario
                                    </button>
                                </div>

                                {/* Formulario nuevo usuario */}
                                {showNewUser && (
                                    <div style={{
                                        padding: '1rem', marginBottom: '1rem',
                                        background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.15)',
                                        borderRadius: '0.5rem'
                                    }}>
                                        <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '0.875rem' }}>Crear Nuevo Usuario</h4>
                                        <div style={gridTwo}>
                                            <FormField label="Usuario" value={newUser.username} onChange={v => setNewUser(p => ({ ...p, username: v }))} placeholder="nombre_usuario" />
                                            <FormField label="Contraseña" value={newUser.password} onChange={v => setNewUser(p => ({ ...p, password: v }))} type="password" placeholder="Min. 4 caracteres" />
                                        </div>
                                        <div style={gridTwo}>
                                            <FormField label="Nombre Completo" value={newUser.nombre_completo} onChange={v => setNewUser(p => ({ ...p, nombre_completo: v }))} placeholder="Juan Pérez" />
                                            <FormField label="Rol" value={newUser.rol} onChange={v => setNewUser(p => ({ ...p, rol: v }))} type="select"
                                                options={[{ value: 'cajero', label: 'Cajero' }, { value: 'supervisor', label: 'Supervisor' }, { value: 'admin', label: 'Administrador' }]}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => setShowNewUser(false)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>Cancelar</button>
                                            <button onClick={handleCreateUser} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>Crear Usuario</button>
                                        </div>
                                    </div>
                                )}

                                {/* Lista de usuarios */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={thStyle}>Usuario</th>
                                                <th style={thStyle}>Nombre</th>
                                                <th style={thStyle}>Rol</th>
                                                <th style={thStyle}>Estado</th>
                                                <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(u => (
                                                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={tdStyle}><strong>{u.username}</strong></td>
                                                    <td style={tdStyle}>{u.nombre_completo}</td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                                                            background: u.rol === 'admin' ? '#dbeafe' : u.rol === 'supervisor' ? '#fef3c7' : '#dcfce7',
                                                            color: u.rol === 'admin' ? '#1d4ed8' : u.rol === 'supervisor' ? '#92400e' : '#166534'
                                                        }}>{u.rol}</span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem',
                                                            background: u.activo ? '#dcfce7' : '#fee2e2',
                                                            color: u.activo ? '#166534' : '#991b1b'
                                                        }}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                                                            <button onClick={() => handleToggleUser(u.id, u.activo)} title={u.activo ? 'Desactivar' : 'Activar'}
                                                                style={{ ...actionBtn, color: u.activo ? '#dc2626' : '#16a34a' }}>
                                                                {u.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                            </button>
                                                            <button onClick={() => { setResetPasswordModal(u); setResetPassword(''); }} title="Resetear Contraseña"
                                                                style={{ ...actionBtn, color: '#f59e0b' }}>
                                                                <KeyRound size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {users.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.875rem' }}>
                                            No hay usuarios registrados
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Reset Password */}
            {resetPasswordModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '0.75rem', padding: '1.5rem',
                        width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#1e293b' }}>Resetear Contraseña</h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                            Usuario: <strong>{resetPasswordModal.username}</strong>
                        </p>
                        <FormField label="Nueva Contraseña" value={resetPassword} onChange={setResetPassword} type="password" placeholder="Mínimo 4 caracteres" />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button onClick={() => setResetPasswordModal(null)}
                                style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                Cancelar
                            </button>
                            <button onClick={handleResetPassword}
                                style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                                Resetear
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
                input:focus, select:focus, textarea:focus {
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
                    outline: none;
                }
                select {
                    appearance: auto;
                }
            `}</style>
        </div>
    );
};

// Estilos reutilizables
const sectionBody = {
    padding: '1.25rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 0.75rem 0.75rem'
};

const gridTwo = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
};

const thStyle = {
    textAlign: 'left',
    padding: '0.625rem 0.75rem',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tdStyle = {
    padding: '0.625rem 0.75rem',
    color: '#334155'
};

const actionBtn = {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    padding: '0.375rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
};

export default Settings;
