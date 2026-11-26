import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Package, ClipboardList,
    TrendingUp, Settings, Store, Palette, BarChart3, Menu, X
} from 'lucide-react';
import { settingsRepository } from '../services/settingsRepository';

/** Detecta si la pantalla es móvil (< 768px) */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
}

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',          path: '/dashboard' },
    { icon: ShoppingCart,   label: 'Punto de Venta',      path: '/pos' },
    { icon: Package,        label: 'Inventario',           path: '/inventory' },
    { icon: ClipboardList,  label: 'Historial de Ventas',  path: '/sales' },
    { icon: BarChart3,      label: 'Reportería',           path: '/reports' },
    { icon: TrendingUp,     label: 'Tasa BCV',             path: '/currency' },
    { icon: Settings,       label: 'Configuración',        path: '/settings' },
    { icon: Palette,        label: 'Personalización',      path: '/customization' },
];

/** Ítems que aparecen en la barra inferior de móvil (el 5to botón abre el menú completo) */
const bottomNavItems = [
    { icon: ShoppingCart,  label: 'POS',        path: '/pos' },
    { icon: Package,       label: 'Inventario', path: '/inventory' },
    { icon: ClipboardList, label: 'Ventas',     path: '/sales' },
    { icon: BarChart3,     label: 'Reportes',   path: '/reports' },
];

const Layout = () => {
    const location = useLocation();
    const isMobile = useIsMobile();
    const [businessName, setBusinessName] = useState('Vectra POS');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const loadBusiness = async () => {
            try {
                const cfg = await settingsRepository.getConfig();
                if (cfg?.empresa_nombre) setBusinessName(cfg.empresa_nombre);
            } catch {
                // usar nombre por defecto
            }
        };
        loadBusiness();
        window.addEventListener('vectra:config-updated', loadBusiness);
        return () => window.removeEventListener('vectra:config-updated', loadBusiness);
    }, []);

    // Cierra sidebar al navegar en móvil
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    /* ── Sidebar compartido (desktop siempre visible / móvil como drawer) ── */
    const SidebarContent = () => (
        <aside style={{
            width: '250px',
            backgroundColor: '#1e293b',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            {/* Logo / Nombre */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{businessName}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Store size={14} color="#fff" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8125rem', color: '#e2e8f0', margin: 0, fontWeight: 600 }}>Vectra POS</p>
                            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>Punto de Venta</p>
                        </div>
                    </div>
                </div>
                {/* Botón cerrar en móvil */}
                {isMobile && (
                    <button
                        onClick={() => setSidebarOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                        aria-label="Cerrar menú"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            marginBottom: '0.25rem',
                            borderRadius: '0.5rem',
                            color: location.pathname === item.path ? 'white' : '#94a3b8',
                            backgroundColor: location.pathname === item.path ? '#2563eb' : 'transparent',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <item.icon size={20} style={{ marginRight: '0.75rem', flexShrink: 0 }} />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div style={{ padding: '1rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#94a3b8' }}>
                Datos guardados en este dispositivo
            </div>
        </aside>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

            {/* ── DESKTOP: sidebar siempre visible ── */}
            {!isMobile && <SidebarContent />}

            {/* ── MÓVIL: overlay + drawer ── */}
            {isMobile && sidebarOpen && (
                <>
                    {/* Fondo oscuro */}
                    <div
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                    {/* Drawer */}
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                        display: 'flex',
                    }}>
                        <SidebarContent />
                    </div>
                </>
            )}

            {/* ── Main content ── */}
            <main style={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                // Deja espacio para barra inferior en móvil
                paddingBottom: isMobile ? '64px' : 0,
            }}>
                {/* Contenido de la página */}
                <div style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflow: 'auto' }}>
                    <Outlet />
                </div>
            </main>

            {/* ── MÓVIL: Barra de navegación inferior ── */}
            {isMobile && (
                <nav style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    zIndex: 999,
                    backgroundColor: 'white',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'stretch',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
                }}>
                    {bottomNavItems.map(item => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem 0.25rem',
                                    color: active ? '#2563eb' : '#94a3b8',
                                    textDecoration: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    minHeight: '56px',
                                }}
                            >
                                <item.icon size={22} />
                                <span style={{ fontSize: '0.625rem', marginTop: '0.25rem', fontWeight: active ? 700 : 400 }}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem 0.25rem',
                            background: 'none',
                            border: 'none',
                            color: sidebarOpen ? '#2563eb' : '#94a3b8',
                            WebkitTapHighlightColor: 'transparent',
                            minHeight: '56px',
                            cursor: 'pointer',
                        }}
                        aria-label="Más opciones"
                    >
                        <Menu size={22} />
                        <span style={{ fontSize: '0.625rem', marginTop: '0.25rem', fontWeight: sidebarOpen ? 700 : 400 }}>
                            Más
                        </span>
                    </button>
                </nav>
            )}
        </div>
    );
};

export default Layout;
