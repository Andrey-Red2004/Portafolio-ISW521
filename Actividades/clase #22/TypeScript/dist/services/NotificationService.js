"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
class NotificationService {
    processNotification(notifications) {
        console.log("Analizando notifocaciones por bloque \n\n");
        for (const notification of notifications) {
            notification.send();
        }
        console.log("Finalizacion del bloque de notificaciones \n\n");
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map