export class ErrorMessage {
    static create(type, message, messageId = undefined) {
        return { type, message, messageId, isError: true };
    }
}