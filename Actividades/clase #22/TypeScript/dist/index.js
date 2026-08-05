"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EmailNotification_1 = require("./classes/EmailNotification");
const SmsNotification_1 = require("./classes/SmsNotification");
const NotificationService_1 = require("./services/NotificationService");
const email = new EmailNotification_1.EmailNotification("prueba@ejemplo.com", "Hola Charizard", "Prueba de envio");
const sms = new SmsNotification_1.SmsNotification("+506 66666666", "Recibiendo pin: 4563");
const queue = [email, sms];
const service = new NotificationService_1.NotificationService();
service.processNotification(queue);
//# sourceMappingURL=index.js.map