'use strict';

export class Shortcut {
    static META = ['Control', 'Alt', 'Shift', 'Meta'];
    static parseEvent(e) {
        return { ctrl: e.ctrlKey || e.code.includes('Control'), alt: e.altKey || e.code.includes('Alt'), shift: e.shiftKey || e.code.includes('Shift'), meta: e.metaKey || e.code.includes('Meta'), key: Shortcut.META.find(x => e.code.includes(x)) ? null : e.code };
    }

    // like adjective order in english, i wonder what agreement there is in ordering these modifiers (as in ctrl alt del)
    constructor({ ctrl = false, alt = false, shift = false, meta = false, key } = {}) {
        if (!key) throw new Error('Invalid key');

        this.ctrl = ctrl;
        this.alt = alt;
        this.shift = shift;
        this.meta = meta;
        this.key = key;
    }

    test({ ctrl = false, alt = false, shift = false, meta = false, key }) {
        const t = this.ctrl === ctrl &&
            this.alt === alt &&
            this.shift === shift &&
            this.meta === meta &&
            this.key == key;
        return t;
    }

    testEvent(e) {
        return this.test(Shortcut.parseEvent({ ctrl: e.ctrl, alt: e.alt, shift: e.shift, meta: e.meta, code: e.code }));
    }

    toDisplayString() {
        const a = [];
        // this isn't meant to be mac-centric, but its convenient for the moment that there are unicode representations
        if (this.ctrl) a.push('⌃');
        if (this.alt) a.push('⌥');
        if (this.shift) a.push('⇧');
        if (this.meta) a.push('⌘');
        a.push(this.key.replace(/^Key/, ''));
        return a.join('+');
    }

    toJSON() {
        return {
            ctrl: this.ctrl,
            alt: this.alt,
            shift: this.shift,
            meta: this.meta,
            key: this.key
        };
    }
}
