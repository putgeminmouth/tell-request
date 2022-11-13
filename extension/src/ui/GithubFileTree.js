'use strict';

import { MAGIC, Util } from '../common.js';
import { l10n } from '../l10n.js';
import { SVG } from './svg.js';
import { UI } from './ui.js';

export class GithubFileTree extends UI {
    constructor(fileTreeElem) {
        super(fileTreeElem);
        fileTreeElem.classList.add(`${MAGIC}github-ext-file-tree`);
        const list = this.list = fileTreeElem.querySelector('ul.ActionList');

        this.events = Util.createEventTarget();

        // this.list.append(this.createDropTarget());
        list.querySelectorAll('li').forEach((li) => {
            this.add(li);
        });

        list.prepend(this.createDropTarget());
        list.prepend(Util.createElement(`
            <li class='edit-mode-visible-only'>
                <div class="marker marker-rail">${SVG.UpDownArrow}</div>
            </li>
        `));
    }

    createDropTarget() {
        const dropTarget = Util.createElement(`
            <li class="droptarget"></li>
        `);
        // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#performing_a_drop
        // > A listener for the dragenter and dragover events are used to indicate valid drop targets
        dropTarget.addEventListener('dragstart', e => {
            e.preventDefault();
        });
        dropTarget.addEventListener('dragover', e => {
            e.preventDefault();
        });

        dropTarget.addEventListener('drop', e => {
            this.list.querySelectorAll('.droptarget.hover').forEach(x => x.classList.remove('hover'));
            const { id, filename } = JSON.parse(e.dataTransfer.getData('application/json'));
            const newPosition = Array.from(this.list.querySelectorAll('.droptarget')).indexOf(dropTarget);
            this.events.dispatchEvent(new CustomEvent('reorder', { detail: { id, newPosition, filename } }));
        });

        // workaround for :hover not applied during drag
        dropTarget.addEventListener('dragenter', _ => dropTarget.classList.add('hover'));
        dropTarget.addEventListener('dragleave', _ => dropTarget.classList.remove('hover'));
        return dropTarget;
    }

    getFilenameForItem(item) {
        return item.querySelector('[data-filterable-item-text]').innerText;
    }
    getItemForFilename(filename) {
        return this.list.querySelectorAll('[data-filterable-item-text]').find(x => x.innerText === filename).ancestors(x => x.tagName === 'LI').first();
    }

    add(item) {
        item.style.display = 'flex';
        item.style['flex-direction'] = 'row';

        const dropTarget = this.createDropTarget();

        const marker = Util.createElement(`
            <div class="marker edit-mode-visible-only" draggable="true" title="${l10n.get('sidebar.markerHandle.title')}">${SVG.UpDownArrow}</div>
        `);

        marker.addEventListener('dragstart', e => {
            e.dataTransfer.clearData();
            e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, filename: this.getFilenameForItem(item) }));
            e.dataTransfer.setDragImage(item, -100, -100);
        });
        marker.addEventListener('dragstart', _ => {
            this.rootElem.classList.add('dragging');
        });
        marker.addEventListener('dragend', _ => {
            this.rootElem.classList.remove('dragging');
        });

        item.prepend(marker);
        item.after(dropTarget);
    }

    move({ id, filename, position }) {
        let item;
        if (filename) {
            item = this.getItemForFilename(filename);
        } else {
            item = this.list.querySelector(`#${id}`);
        }
        const dropTarget = item.nextElementSibling;
        Array.from(this.list.querySelectorAll('li.droptarget'))
            .slice(position, position + 1)
            .first()
            .after(item);
        item.after(dropTarget);
    }
}
