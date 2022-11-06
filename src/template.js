'use strict';

class StaticTemplate extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const tpl = document.querySelector('template' + this.getAttribute('template'));
        let content = tpl.innerHTML;
        const varNames = this.getAttributeNames().filter(x => x.startsWith('data-')).map(x => x.slice('data-'.length));
        varNames.forEach(name => {
            const value = this.getAttribute(`data-${name}`);
            content = content.replaceAll('${' + name + '}', value);
        });
        this.innerHTML = content;
        this.after.apply(this, (Array.from(this.childNodes)));
        this.remove();
    }
}

if (customElements)
    customElements.define('static-template', StaticTemplate);