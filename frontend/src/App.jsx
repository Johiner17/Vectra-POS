import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import CurrencyPage from './pages/CurrencyPage';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import Customization from './pages/Customization';

// Verificación de autenticación real (token en localStorage)
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster position="top-right" />
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="currency" element={<CurrencyPage />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="customization" element={<Customization />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App;
