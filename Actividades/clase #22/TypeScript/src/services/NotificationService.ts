import { INotification } from "../interface/INotification";

export class NotificationService {
    public processNotification(notifications: INotification[]): void {
        console.log("Analizando notifocaciones por bloque \n\n");

        for(const notification of notifications){
            notification.send();
        }
        console.log("Finalizacion del bloque de notificaciones \n\n");
    }
}