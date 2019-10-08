export class Message {
    static create(type, message, messageId = undefined) {
        return { type, message, messageId, isError: false };
    }
}