require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dbManager = require('./database/database');
const routes = require('./routes/routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const bcvSyncService = require('./services/BcvSyncService');
const configService = require('./services/ConfigService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging simple
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Rutas
app.use('/api', routes);

// Error Handling
app.use(errorMiddleware);

// Start Server
async function startServer() {
    try {
        // Inicializar base de datos
        await dbManager.connect();

        // Inicializar configuraciones por defecto si no existen
        await configService.initializeDefaults();
        console.log('✅ Configuraciones verificadas/inicializadas');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n==================================================`);
            console.log(`🚀 VECTRA POS - Backend Iniciado`);
            console.log(`==================================================`);
            console.log(`📡 URL: http://0.0.0.0:${PORT}`);
            console.log(`🌐 Red Local: accesible vía IP`);
            console.log(`💾 Base de Datos: SQLite (Async)`);
            console.log(`==================================================\n`);
        });

        // Iniciar sincronización automática de tasa BCV (offline-first)
        bcvSyncService.start();

    } catch (error) {
        console.error('❌ Error fatal al iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    bcvSyncService.stop();
    await dbManager.close();
    process.exit(0);
});
