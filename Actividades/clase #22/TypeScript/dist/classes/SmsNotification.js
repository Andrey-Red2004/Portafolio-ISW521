"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsNotification = void 0;
const BaseNotifications_1 = require("./BaseNotifications");
class SmsNotification extends BaseNotifications_1.BaseNotification {
    send() {
        this.logNotification("SMS");
        console.log(`Enviando SMS del numero: ${this.recipient}`);
        console.log(`Mensaje: ${this.message}`);
    }
}
exports.SmsNotification = SmsNotification;
//# sourceMappingURL=SmsNotification.js.map