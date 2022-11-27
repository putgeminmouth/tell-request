'use strict';

import { MAGIC, Util } from '../common.js';
import { l10n } from '../l10n.js';
import { SVG } from './svg.js';
import { UI } from './ui.js';

export class SidebarUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} sidebar">`));
        const sidebar = this.sidebar = this.rootElem;
        sidebar.innerHTML = `
            <div class="header">
                <div class="toolbar navbar">
                    <button name="prev" class="toolbar-item btn-octicon" title="${l10n.get('sidebar.navPrevButton.title')}">◀</button>
                    <button name="next" class="toolbar-item btn-octicon" title="${l10n.get('sidebar.navNextButton.title')}">▶</button>
                </div>
            </div>
            <ol>
                <li class='edit-mode-visible-only'>
                    <div class="marker marker-rail">${SVG.UpDownArrow}</div>
                    <div></div>
                </li>
            </ol>
        `;
        this.list = sidebar.querySelector('ol');
        this.events = Util.createEventTarget();

        this.list.append(this.createDropTarget());

        sidebar.querySelector('.header .navbar button[name="prev"]').addEventListener('click', _ => {
            const id = this.list.querySelector('li.visual.selected')?.previousElementSibling.previousElementSibling?.data?.id;
            if (!id)
                return;
            this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id } }));
        });
        sidebar.querySelector('.header .navbar button[name="next"]').addEventListener('click', _ => {
            const id = this.list.querySelector('li.visual.selected')?.nextElementSibling.nextElementSibling?.data.id;
            if (!id)
                return;
            this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id } }));
        });
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
            const { id } = JSON.parse(e.dataTransfer.getData('application/json'));
            const newPosition = Array.from(this.list.querySelectorAll('.droptarget')).indexOf(dropTarget);
            this.events.dispatchEvent(new CustomEvent('reorder', { detail: { id, newPosition } }));
        });

        // workaround for :hover not applied during drag
        dropTarget.addEventListener('dragenter', _ => dropTarget.classList.add('hover'));
        dropTarget.addEventListener('dragleave', _ => dropTarget.classList.remove('hover'));
        return dropTarget;
    }

    add(visual, index) {
        const item = Util.createElement(`
            <li class="visual">
                <div class="marker edit-mode-visible-only" draggable="true" title="${l10n.get('sidebar.markerHandle.title')}">${SVG.UpDownArrow}</div>
                <div class="content">
                    <div class="context">
                        ${SVG.Folder}
                        <span>${l10n.get('sidebar.context.text', { filename: visual.context.file.filename, lineNo: visual.context.lineNo })}</span>
                    </div>
                    <div class="label">${visual.text}</div>
                </div>
                <div class="toolbar">
                    <button name="delete" class="btn-octicon edit-mode-visible-only" title="${l10n.get('sidebar.deleteButton.title')}">X</button>
                </div>
            </li>
        `);
        const dropTarget = this.createDropTarget();

        const marker = item.querySelector('.marker');
        const contentElem = item.querySelector('.content');
        const deleteButton = item.querySelector('button[name="delete"]');

        marker.addEventListener('dragstart', e => {
            e.dataTransfer.clearData();
            e.dataTransfer.setData('application/json', JSON.stringify({ id: visual.id }));
            e.dataTransfer.setDragImage(item, -100, -100);
        });
        marker.addEventListener('dragstart', _ => {
            this.sidebar.classList.add('dragging');
        });
        marker.addEventListener('dragend', _ => {
            this.sidebar.classList.remove('dragging');
        });

        contentElem.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id: item.data.id } }));
        });
        deleteButton.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('delete', { detail: { id: item.data.id } }));
        });
        item.data = {
            id: visual.id,
        };
        const insertAt = Array.from(this.list.querySelectorAll(`li.droptarget`))[index];
        insertAt.before(item);
        item.before(dropTarget);
    }

    append(visual) {
        this.add(visual, this.list.querySelectorAll(`li.droptarget`).length - 1);
    }

    remove(id) {
        const item = this.list.querySelectorAll('li.visual').find(x => x.data?.id === id);
        item.nextElementSibling.remove();
        item.remove();
    }

    clear() {
        this.list.querySelectorAll('li.visual')
            .filter(x => !!x.data?.id)
            .toArray()
            .forEach(x => {
                x.nextElementSibling.remove();
                x.remove();
            });
    }

    move(id, position) {
        const items = Array.from(this.list.querySelectorAll('li.visual'));
        const item = items.find(x => x.data?.id === id);
        const dropTarget = item.nextElementSibling;
        if (position > items.length - 1)
            items[items.length - 1].nextElementSibling.after(item);
        else
            items[position].before(item);
        item.after(dropTarget);
    }

    select(id) {
        if (this.list.querySelector('li.visual.selected')?.data.id === id)
            return;
        this.list.querySelectorAll('li.visual.selected').forEach(x => x.classList.remove('selected'));
        this.list.querySelectorAll('li.visual').find(x => x.data?.id === id)?.classList.add('selected');
        this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
    }
}
