import { BaseNotification } from "./BaseNotifications";

export class EmailNotification extends BaseNotification {
    constructor(recipient: string, message: string, public readonly subject: string
    ) {
        super(recipient, message);
    }
    send(): void {
        this.logNotification("Email");
        console.log(`Enviando Email de: ${this.recipient}`);
        console.log(`Asunto: ${this.subject}`);
        console.log(`Cuerpo: ${this.message}`);
    }

}