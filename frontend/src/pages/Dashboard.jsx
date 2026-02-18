import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Package, AlertTriangle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            padding: '1rem',
            borderRadius: '50%',
            backgroundColor: `${color}20`,
            color: color
        }}>
            <Icon size={24} />
        </div>
        <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{title}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalUsd: 0,
        lowStock: 0,
        rate: 0
    });

    useEffect(() => {
        // Fetch dashboard data
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                const [rateRes, lowStockRes] = await Promise.all([
                    axios.get('/api/currency/rate', config),
                    axios.get('/api/products/low-stock', config).catch(() => ({ data: { data: [] } }))
                ]);

                setStats(prev => ({
                    ...prev,
                    rate: rateRes.data.data.tasa,
                    lowStock: lowStockRes.data.data?.length || 0
                }));
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            }
        };

        fetchData();
    }, []);

    const data = [
        { name: 'Lun', ventas: 4000 },
        { name: 'Mar', ventas: 3000 },
        { name: 'Mie', ventas: 2000 },
        { name: 'Jue', ventas: 2780 },
        { name: 'Vie', ventas: 1890 },
        { name: 'Sab', ventas: 2390 },
        { name: 'Dom', ventas: 3490 },
    ];

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard
                    title="Ventas del Día"
                    value="$1,245.50"
                    icon={DollarSign}
                    color="#2563eb"
                />
                <StatCard
                    title="Tasa BCV"
                    value={`Bs. ${stats.rate}`}
                    icon={TrendingUp}
                    color="#16a34a"
                />
                <StatCard
                    title="Productos"
                    value="1,432"
                    icon={Package}
                    color="#9333ea"
                />
                <StatCard
                    title="Stock Bajo"
                    value={stats.lowStock}
                    icon={AlertTriangle}
                    color="#dc2626"
                />
            </div>

            <div className="card" style={{ height: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Ventas de la Semana</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="ventas" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Dashboard;
