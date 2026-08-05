import { INotification } from "./interface/INotification";
import { EmailNotification } from "./classes/EmailNotification";
import { SmsNotification } from "./classes/SmsNotification";
import { NotificationService } from "./services/NotificationService";

const email = new EmailNotification("prueba@ejemplo.com", "Hola Charizard", "Prueba de envio");
const sms = new SmsNotification("+506 66666666", "Recibiendo pin: 4563");

const queue: INotification[] = [email, sms];

const service = new NotificationService();
service.processNotification(queue);