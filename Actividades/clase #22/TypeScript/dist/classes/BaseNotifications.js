"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseNotification = void 0;
class BaseNotification {
    recipient;
    message;
    constructor(recipient, message) {
        this.recipient = recipient;
        this.message = message;
    }
    logNotification(type) {
        console.log(`[log - ${new Date().toISOString()}] iniciando envio de ${type} a ${this.recipient}`);
    }
}
exports.BaseNotification = BaseNotification;
//# sourceMappingURL=BaseNotifications.js.map