/**
 * MOCK Scale
 */
class Scale {
    constructor() {
        console.log('⚠️  Mock Scale initialized');
    }

    async connect() {
        return true;
    }

    async requestWeight() {
        return 0.000;
    }
}

module.exports = Scale;
