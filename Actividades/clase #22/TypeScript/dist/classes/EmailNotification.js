"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotification = void 0;
const BaseNotifications_1 = require("./BaseNotifications");
class EmailNotification extends BaseNotifications_1.BaseNotification {
    subject;
    constructor(recipient, message, subject) {
        super(recipient, message);
        this.subject = subject;
    }
    send() {
        this.logNotification("Email");
        console.log(`Enviando Email de: ${this.recipient}`);
        console.log(`Asunto: ${this.subject}`);
        console.log(`Cuerpo: ${this.message}`);
    }
}
exports.EmailNotification = EmailNotification;
//# sourceMappingURL=EmailNotification.js.map