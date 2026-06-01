import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, ClipboardList, TrendingUp, Settings, LogOut, User, Palette, BarChart3 } from 'lucide-react';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: ShoppingCart, label: 'Punto de Venta', path: '/pos' },
        { icon: Package, label: 'Inventario', path: '/inventory' },
        { icon: ClipboardList, label: 'Historial de Ventas', path: '/sales' },
        { icon: BarChart3, label: 'Reportería', path: '/reports' },
        { icon: TrendingUp, label: 'Tasa BCV', path: '/currency' },
        { icon: Settings, label: 'Configuración', path: '/settings' },
        { icon: Palette, label: 'Personalización', path: '/customization' },
    ];

    const rolLabels = {
        admin: 'Administrador',
        cajero: 'Cajero',
        supervisor: 'Supervisor'
    };

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: '#1e293b',
                color: 'white',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Vectra POS</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <User size={14} color="#fff" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8125rem', color: '#e2e8f0', margin: 0 }}>
                                {user.nombre_completo || user.username || 'Usuario'}
                            </p>
                            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
                                {rolLabels[user.rol] || user.rol || ''}
                            </p>
                        </div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1rem' }}>
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
                                fontSize: '0.875rem'
                            }}
                        >
                            <item.icon size={20} style={{ marginRight: '0.75rem' }} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid #334155' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            color: '#ef4444',
                            backgroundColor: 'transparent',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={20} style={{ marginRight: '0.75rem' }} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#f1f5f9' }}>
                <header style={{
                    backgroundColor: 'white',
                    padding: '1rem 2rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        {navItems.find(i => location.pathname.startsWith(i.path))?.label || 'Vectra POS'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {new Date().toLocaleDateString('es-VE', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </span>
                    </div>
                </header>
                <div style={{ padding: '2rem' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
