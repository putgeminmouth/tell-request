'use strict';

import { MAGIC, Util } from '../common.js';

class UI {
    constructor(rootElem) { this.rootElem = rootElem; }

    enable() {
        this.rootElem.querySelectorAll('input,button,textarea').forEach(x => x.disabled = false);
    }

    disable() {
        this.rootElem.querySelectorAll('input,button,textarea').forEach(x => x.disabled = true);
    }
}

class VisualUI extends UI {
    constructor(rootElem) {
        super(rootElem);
        rootElem.classList.add('visual-root');
    }
}
export class CommentUI extends VisualUI {
    constructor({ github, prPage, fileElem, value }) {
        super(Util.createElement(`<tr class="${MAGIC} visual-root">`));
        this.github = github;
        this.prPage = prPage;
        this.fileElem = fileElem;
        this.events = Util.createEventTarget();
        this.currentValue = value;

        const td = Util.createElement(`
            <td class="line-comments" colspan="4">
                <div class="comment-form-head tabnav d-flex flex-justify-between mb-2">
                    <nav class="tabnav-tabs">
                        <button type="button" name="write" class="btn-link tabnav-tab write-tab">Write</button>
                        <button type="button" name="preview" class="btn-link tabnav-tab write-tab">Preview</button>
                    </nav>
                </div>
                <div name="write" class="tabnav-content">
                    <textarea class="form-control input-contrast comment-form-textarea"></textarea>
                    <div class="form-actions">
                        <button type="button" name="accept" class="btn btn-primary">OK</button>
                        <button type="button" name="cancel" class="btn">Cancel</button>
                    </div>
                </div>
                <div name="preview" class="tabnav-content">
                    <div class="toolbar">
                        <div name="position" class="toolbar-item btn-octicon"></div>
                    </div>
                    <div class="comment-body markdown-body"></div>
                </div>
            </td>
        `);
        const tr = this.rootElem;
        tr.setAttribute('data-visual-id', this.currentValue.id);
        tr.append(td);

        tr.data = { visualUI: this, visual: this.currentValue };
        const textarea = this.textarea = tr.querySelector('textarea');
        textarea.value = this.currentValue.text;
        const previewButton = this.previewButton = tr.querySelector('button[name="preview"]');
        const writeButton = this.writeButton = tr.querySelector('button[name="write"]');

        writeButton.addEventListener('click', e => this.onWriteClick(e));

        tr.querySelector('button[name="cancel"]').addEventListener('click', e => this.onCancelClick(e));

        tr.querySelector('button[name="accept"]').addEventListener('click', e => this.onAcceptClick(e));

        tr.querySelector('button[name="preview"]').addEventListener('click', e => this.onPreviewClick(e));

        tr.querySelectorAll('.tabnav-tabs>button').forEach(button => {
            const name = button.name;
            button.addEventListener('click', e => {
                this.setTab(name);
            });
        });
        // tr.querySelector('button[name="linkTo"]').addEventListener('click', _ => {
        //     const svg = Util.createElement(`
        //         <svg style="position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible">
        //             <!--
        //             <circle class="debug1" fill="blue" cx="0" cy="0" r="5"></circle>
        //             <circle class="debug2" fill="yellow" cx="0" cy="0" r="5"></circle>
        //             -->
        //             <path stroke="red" stroke-width="2" fill="yellow" fill-opacity="0.5"></path>
        //         </svg>
        //     `);
        //     const path = svg.querySelector('path');
        //     // tr.querySelector('button[name="linkTo"]').after(svg);
        //     document.body.append(svg);
        //     document.addEventListener('mousemove', e => {
        //         const getDocumentOffset = e => {
        //             const r = e.getBoundingClientRect();
        //             return { x: r.x + window.scrollX, y: r.y + window.scrollY };
        //         };
        //         const commonOrigin = getDocumentOffset(tr.querySelector('button[name="linkTo"]'));
        //         const commonTarget = { x: e.pageX, y: e.pageY };
        //         const calcControlPoint = ({ origin, target, focalMultiplier, bias }) => {
        //             const segment = { x: target.x - origin.x, y: target.y - origin.y };
        //             const ctrl = (() => {
        //                 const mid = { x: segment.x * bias, y: segment.y * bias };
        //                 // svg.querySelector('circle.debug1').setAttribute('cx', origin.x + mid.x);
        //                 // svg.querySelector('circle.debug1').setAttribute('cy', origin.y + mid.y);
        //                 const midAngle = Math.atan2(segment.y, segment.x);
        //                 const orthY = Math.sin(midAngle - Math.PI / 2);
        //                 const orthX = Math.cos(midAngle - Math.PI / 2);
        //                 const focalLength = focalMultiplier * Math.sqrt(mid.x * mid.x + mid.y * mid.y);
        //                 const focus = { x: mid.x + orthX * focalLength, y: mid.y + orthY * focalLength };
        //                 // svg.querySelector('circle.debug2').setAttribute('cx', origin.x + focus.x);
        //                 // svg.querySelector('circle.debug2').setAttribute('cy', origin.y + focus.y);
        //                 return focus;
        //             }).apply();
        //             return { segment, ctrl };
        //         };
        //         const commonSegment = { x: Math.abs(commonTarget.x - commonOrigin.x), y: Math.abs(commonTarget.y - commonOrigin.y) };
        //         const d = commonSegment.x > commonSegment.y;
        //         const dx = d ? 0 : 5;
        //         const dy = d ? -5 : 0;
        //         const path1 = (() => {
        //             const origin = { x: commonOrigin.x - dx, y: commonOrigin.y - dy };
        //             const target = commonTarget;
        //             const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: 1.6, bias: 0.2 });
        //             return `l ${-dx} ${-dy} q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
        //         }).apply();
        //         const path2 = (() => {
        //             const origin = commonTarget;
        //             const target = { x: commonOrigin.x + dx, y: commonOrigin.y + dy };
        //             const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: -0.6, bias: 0.8 });
        //             return `q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
        //         }).apply();
        //         path.setAttribute('d', `M ${commonOrigin.x} ${commonOrigin.y} ${path1} ${path2} L ${commonOrigin.x} ${commonOrigin.y}`);

        //         const other = document.elementsFromPoint(e.clientX, e.clientY)
        //             .find(x => x.matches(`tr.${MAGIC} :scope`));

        //         if (other) {
        //             const otherAncestor = Element.ancestors(other).find(x => x.matches(`tr.${MAGIC}`));
        //             document.querySelectorAll('.visual-linker-over').toArray().forEach(x => x.classList.remove('visual-linker-over'));
        //             otherAncestor.classList.add('visual-linker-over');
        //         }
        //     });
        // });
    }

    onCancelClick() {
        this.textarea.value = this.currentValue.text || '';
        this.rootElem.querySelector('button[name="preview"]').click();
    }

    async onAcceptClick() {
        const text = this.textarea.value;
        this.currentValue.text = text;

        const detail = {
            comment: this.currentValue,
        };
        this.disable();
        this.events.dispatchEvent(new CustomEvent('accept', { detail }));
        this.enable();
        this.rootElem.querySelector('button[name="preview"]').click();
    }

    onWriteClick() {
        setTimeout(() => this.textarea.focus()); // no idea why timeout
    }

    setTab(name) {
        this.rootElem.querySelectorAll(`.tabnav-tabs>button,.tabnav-tabs,.tabnav-content`).forEach(x => {
            x.classList.remove('selected');
        });
        this.rootElem.querySelectorAll(`.tabnav-tabs>button[name="${name}"],.tabnav-content[name="${name}"]`).forEach(x => {
            x.classList.add('selected');
        });
    }

    async onPreviewClick() {
        await this.setPreviewTab();
    }

    async setPreviewTab() {
        this.setTab('preview');
        if (this.textarea.value === this.previousPreviewValue) return; // avoid api calls
        const text = this.textarea.value;
        const commentId = this.prPage.getRandomCommentId();
        const rendered = await this.github.renderMarkdown({ authenticityToken: await this.github.pullFiles.fetchCommentCsrfToken(commentId), text });
        this.rootElem.querySelector('.comment-body').innerHTML = rendered;
        this.previousPreviewValue = text;
    }
}

export class SidebarUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} sidebar">`));
        const sidebar = this.sidebar = this.rootElem;
        sidebar.innerHTML = `
            <div class="header">
                <div class="toolbar navbar">
                    <button name="prev" class="toolbar-item btn-octicon">◀</button>
                    <button name="next" class="toolbar-item btn-octicon">▶</button>
                    <button name="save" class="toolbar-item btn-octicon" style="margin-left: auto"><svg style="width: 1em; height: 1em; vertical-align: middle;fill: currentColor; overflow: hidden;" viewBox="0 0 1024 1024"><path d="M149.75 37.001h698.373l123.836 112.94v820.924H67.192V37.001z"  /><path d="M264.701 339.385h509.743V57.427H264.701v281.958zM519.516 598.068H828.04v281.078H211.105V598.068z" fill="#FFFFFF" /><path d="M275.727 671.121h487.692v-23.968H275.727v23.968zM275.727 750.581h487.692v-23.967H275.727v23.967zM275.727 830.041h487.692v-23.968H275.727v23.968z" fill="#696F70" /><path d="M563.97 85.349h168.493v226.112H563.97z" fill="#20A5D5" /></svg></button>
                </div>
            </div>
            <ol>
                <li>
                    <div class="marker marker-rail">⭥</div>
                    <div></div>
                </li>
            </ol>
        `;
        this.list = sidebar.querySelector('ol');
        this.events = Util.createEventTarget();

        this.list.append(this.createDropTarget());

        sidebar.querySelector('.header .navbar button[name="prev"]').addEventListener('click', _ => {
            const id = this.list.querySelector('li.visual.selected')?.previousElementSibling.previousElementSibling?.data?.id;
            if (!id) return;
            this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id } }));
        });
        sidebar.querySelector('.header .navbar button[name="next"]').addEventListener('click', _ => {
            const id = this.list.querySelector('li.visual.selected')?.nextElementSibling.nextElementSibling?.data.id;
            if (!id) return;
            this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id } }));
        });
        sidebar.querySelector('.header .navbar button[name="save"]').addEventListener('click', async _ => {
            this.disable();
            try {
                const detail = Util.addPromisesToEventDetail();
                this.events.dispatchEvent(new CustomEvent('save', { detail }));
                await Promise.all(detail._promises);
            } finally {
                this.enable();
            }
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
                <div class="marker" draggable="true">⭥</div>
                <div class="content">
                    <div class="context">
                        <svg class="color-fg-muted" width="16" height="16"><use href="#octicon_file_16"></use></svg>
                        <span>${visual.context.file.filename}: ${visual.context.lineNo}</span>
                    </div>
                    <div class="label">${visual.text}</div>
                </div>
                <div class="toolbar">
                    <button name="navTo" class="btn-octicon">⎆</button>
                    <button name="delete" class="btn-octicon">X</button>
                </div>
            </li>
        `);
        const dropTarget = this.createDropTarget();
        // item.addEventListener('dragenter', e => {
        //     // this.list.querySelectorAll('li.droptarget').forEach(x => x.classList.remove('droptarget'));
        //     item.classList.add('droptarget');
        //     e.preventDefault();
        // });
        // item.addEventListener('dragleave', e => {
        //     item.classList.remove('droptarget');
        // });
        const marker = item.querySelector('.marker');
        const navToButton = item.querySelector('button[name="navTo"]');
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

        navToButton.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id: item.data.id } }));
        });
        deleteButton.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('delete', { detail: { id: item.data.id } }));
        });
        item.data = {
            id: visual.id,
            navToButton
        };
        const insertAt = Array.from(this.list.querySelectorAll(`li.droptarget`)).slice(index, index + 1).first();
        insertAt.after(item);
        item.after(dropTarget);
    }

    remove(id) {
        const item = this.list.querySelectorAll('li.visual').find(x => x.data?.id === id);
        item.nextElementSibling.remove();
        item.remove();
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
        if (this.list.querySelector('li.visual.selected')?.data.id === id) return;
        this.list.querySelectorAll('li.visual.selected').forEach(x => x.classList.remove('selected'));
        this.list.querySelectorAll('li.visual').find(x => x.data?.id === id)?.classList.add('selected');
        this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
    }
}

export class DividerUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} divider">`));
        this.events = Util.createEventTarget();

        const divider = this.rootElem;
        this.rootElem.innerHTML = `
            <button class="btn-octicon" name="collapse">
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