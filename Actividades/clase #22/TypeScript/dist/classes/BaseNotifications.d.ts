import { INotification } from "../interface/INotification";
export declare abstract class BaseNotification implements INotification {
    readonly recipient: string;
    readonly message: string;
    constructor(recipient: string, message: string);
    protected logNotification(type: string): void;
    abstract send(): void;
}
//# sourceMappingURL=BaseNotifications.d.ts.map