/**
 * MOCK ThermalPrinter - Para entornos sin drivers USB
 */
class ThermalPrinter {
    constructor() {
        this.device = null;
        this.printer = null;
        console.log('⚠️  Mock ThermalPrinter initialized');
    }

    async connect() {
        console.log('✓ Mock Printer connected');
        return true;
    }

    async printTicket(ticketData) {
        console.log('--------------------------------');
        console.log('🖨️  MOCK PRINTING TICKET');
        console.log('Factura:', ticketData.invoice.number);
        console.log('Total:', ticketData.totals.total_usd);
        console.log('--------------------------------');
        return true;
    }

    async printZReport(reportData) {
        console.log('--------------------------------');
        console.log('🖨️  MOCK PRINTING Z REPORT');
        console.log('Cierre:', reportData.fecha_cierre);
        console.log('--------------------------------');
        return true;
    }

    async openCashDrawer() {
        console.log('🔓 Mock Cash Drawer Opened');
        return true;
    }

    disconnect() { }
}

module.exports = ThermalPrinter;
