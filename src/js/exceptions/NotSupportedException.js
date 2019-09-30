import { CustomException } from './CustomException.js';

export class NotSupportedException extends CustomException {
    constructor(message, ...metadata) {
        super(message, metadata);
    }
}