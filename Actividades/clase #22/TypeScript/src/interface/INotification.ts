export interface INotification {
    readonly recipient: string;
    readonly message: string;

    send(): void;
}