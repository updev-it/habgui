export class CustomException extends Error {
    constructor(message, ...metadata) {
        super(message);
        this.metadata = metadata;
    }
}