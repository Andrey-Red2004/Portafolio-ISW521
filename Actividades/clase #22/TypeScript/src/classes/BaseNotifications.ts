import { INotification } from "../interface/INotification";

export abstract class BaseNotification implements INotification {
    constructor(public readonly recipient: string, public readonly message: string) {

    }
    protected logNotification(type: string): void{
        console.log(
            `[log - ${new Date().toISOString()}] iniciando envio de ${type} a ${this.recipient}`
        );
    }
    
    abstract send(): void;
}