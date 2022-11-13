'use strict';

import { Util } from '../common.js';

export class Ids {
    static _idGen = 0;
    static initId(id) {
        this._idGen = ++id;
    }
    static nextId() { return `${++Ids._idGen}`; }
    static valid(id) { return !!id; } // documentation
}

class Visual {
    constructor({ id, context }) {
        this.id = id || Ids.nextId();
        this.context = context;
    }

    static import(data) {
        const typeKey = Object.keys(data)[0];
        switch (typeKey) {
            case 'comment': return Comment.import(data);
        }
    }

    export() {
        return {
            id: this.id,
            ...this.context.export()
        };
    }
}

export class Comment extends Visual {
    constructor({ id, context, text }) {
        super({ id, context });
        this.text = text || '';
    }

    static import(data) {
        const { id, text } = data.comment;
        const context = FileContext.import(data.comment);
        return new Comment({ id, context, text });
    }

    export() {
        return {
            comment: {
                ...super.export(),
                text: this.text
            }
        };
    }
}

export class File {

    constructor(filename) {
        this.filename = filename;
    }

    static import(data) {
        const { filename } = data.file;
        return new File(filename);
    }

    export() {
        return { file: { filename: this.filename } };
    }
}

export class FileContext {
    constructor({ file, lineNo }) {
        this.file = file;
        this.lineNo = lineNo;
    }

    static import(data) {
        const { lineNo } = data.context;
        const file = File.import(data.context);
        return new FileContext({ file, lineNo });
    }

    export() {
        return {
            context: {
                lineNo: this.lineNo,
                ...this.file.export()
            }
        };
    }
}

export class Presentation {
    constructor() {
        this.visuals = [];
        this.events = Util.createEventTarget();
    }

    addOrReplaceVisual({ visual, position }) {
        const existing = this.visuals.findIndex(x => x.id === visual.id);
        let removed = [];
        if (existing !== -1) {
            removed = this.visuals.splice(existing, 1);
        } else {
        }
        this.visuals.splice(isNaN(position) ? this.visuals.length : position, 0, visual);

        this.events.dispatchEvent(new CustomEvent('change', { detail: { presentation: this, added: [visual], removed: removed } }));
    }

    removeVisual({ id }) {
        const existing = this.visuals.findIndex(x => x.id === id);
        if (existing === -1) return;

        const removed = this.visuals.splice(existing, 1);

        this.events.dispatchEvent(new CustomEvent('change', { detail: { presentation: this, added: [], removed: removed } }));
    }

    removeAllVisuals() {
        const removed = this.visuals;
        this.visuals = [];

        this.events.dispatchEvent(new CustomEvent('change', { detail: { presentation: this, added: [], removed: removed } }));
    }

    moveVisual({ id, position }) {
        const visual = this.visuals.find(x => x.id === id);
        const oldIndex = this.indexOf({ id });

        this.visuals.splice(oldIndex, 1);
        this.visuals.splice(position, 0, visual);

        this.events.dispatchEvent(new CustomEvent('change', { detail: { presentation: this, added: [visual], removed: [visual] } }));
    }

    findByLineNo(filename, lineNo) {
        return this.visuals.find(x => x.context.file.filename === filename && x.context.lineNo === lineNo);
    }

    findByIndex(index) {
        return this.visuals[index];
    }

    indexOf({ id }) {
        if (id) return this.visuals.findIndex(x => x.id === id);
        return -1;
    }

    get length() { return this.visuals.length; }

    export() {
        return { visuals: this.visuals.map(x => x.export()) };
    }

    import(data) {
        const removed = this.visuals;

        const added = data.visuals.map(v => {
            const vv = Visual.import(v);
            return vv;
        });
        this.visuals = added;
        this.events.dispatchEvent(new CustomEvent('change', { detail: { presentation: this, added, removed } }));
    }
}
