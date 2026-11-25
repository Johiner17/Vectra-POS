import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PwaUpdateBanner from './components/PwaUpdateBanner';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import CurrencyPage from './pages/CurrencyPage';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import Customization from './pages/Customization';
import Reports from './pages/Reports';

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster position="top-right" />
            <PwaUpdateBanner />
            <Routes>
                <Route path="/login" element={<Navigate to="/pos" replace />} />

                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/pos" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="currency" element={<CurrencyPage />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="customization" element={<Customization />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="*" element={<Navigate to="/pos" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App;
