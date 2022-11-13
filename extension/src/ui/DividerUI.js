'use strict';

import { MAGIC, Util } from '../common.js';
import { l10n } from '../l10n.js';
import { UI } from './ui.js';

export class DividerUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} divider">`));
        this.events = Util.createEventTarget();

        const divider = this.rootElem;
        this.rootElem.innerHTML = `
            <button class="btn-octicon" name="collapse" title="${l10n.get('divider.collapseButton.title')}">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-sidebar-collapse">
                    <path fill-rule="evenodd" d="M6.823 7.823L4.427 5.427A.25.25 0 004 5.604v4.792c0 .223.27.335.427.177l2.396-2.396a.25.25 0 000-.354z"></path><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25H9.5v13H1.75a.25.25 0 01-.25-.25V1.75zM11 14.5v-13h3.25a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H11z"></path>
                </svg>
            </button>
            <div class="handle">
                <button class="btn-octicon">
                    <svg aria-label="Expand all" aria-hidden="false" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-unfold" style="transform: rotate(90deg);">
                        <path d="M8.177.677l2.896 2.896a.25.25 0 01-.177.427H8.75v1.25a.75.75 0 01-1.5 0V4H5.104a.25.25 0 01-.177-.427L7.823.677a.25.25 0 01.354 0zM7.25 10.75a.75.75 0 011.5 0V12h2.146a.25.25 0 01.177.427l-2.896 2.896a.25.25 0 01-.354 0l-2.896-2.896A.25.25 0 015.104 12H7.25v-1.25zm-5-2a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM6 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 016 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM12 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 0112 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5z"></path>
                    </svg>
                </button>
                <div class="line"></div>
            </div>
        `;
        const handle = divider.querySelector('.handle');
        handle.addEventListener('mousedown', _ => {
            divider.classList.add('dragging');
            const aborter = new AbortController();
            document.addEventListener('mousemove', e => {
                this.events.dispatchEvent(new CustomEvent('resize', { detail: { pageX: e.pageX } }));
            }, { signal: aborter.signal });
            document.addEventListener('mouseup', _ => {
                divider.classList.remove('dragging');
                aborter.abort();
            }, { signal: aborter.signal });
        });
        divider.querySelector('button[name=collapse]').addEventListener('click', e => {
            e.stopPropagation(); // prevent interactions with dragging
            divider.classList.toggle('collapsed');
            const collapsed = divider.classList.contains('collapsed');
            this.events.dispatchEvent(new CustomEvent('collapse', { detail: { collapsed } }));
        });
    }
}
