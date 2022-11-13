'use strict';

export class UI {
    constructor(rootElem) { this.rootElem = rootElem; }

    enable() {
        this.rootElem.querySelectorAll('input,button,textarea').forEach(x => x.disabled = false);
    }

    disable() {
        this.rootElem.querySelectorAll('input,button,textarea').forEach(x => x.disabled = true);
    }
}

export class VisualUI extends UI {
    constructor(rootElem, model) {
        super(rootElem);
        this.model = model;
        rootElem.classList.add('visual-root');
    }
}

