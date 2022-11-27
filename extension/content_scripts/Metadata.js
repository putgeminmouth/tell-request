'use strict';

export class Metadata {
    constructor(data) {
        this.version = data?.version || 0;
        this.lastModifiedDate = data?.lastModifiedDate;
    }
}
