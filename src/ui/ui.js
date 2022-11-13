'use strict';

import { MAGIC, Util, Promises } from '../common.js';
import { l10n } from '../l10n.js';

const SVG = {
    UpDownArrow: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 61.49 122.88"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;fill:currentColor}</style><g><polygon class="st0" points="30.75,0 0,31.98 19.79,31.98 19.79,90.9 0,90.9 30.75,122.88 61.49,90.9 41.7,90.9 41.7,31.98 61.49,31.98 30.75,0"/></g></svg>`
}

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
    constructor(rootElem, model) {
        super(rootElem);
        this.model = model;
        rootElem.classList.add('visual-root');
    }
}
export class CommentUI extends VisualUI {
    constructor({ github, prPage, fileElem, value }) {
        super(Util.createElement(`<tr class="${MAGIC} visual-root visual-comment">`), value);
        this.github = github;
        this.prPage = prPage;
        this.fileElem = fileElem;
        this.events = Util.createEventTarget();
        this.currentValue = value;

        const td = Util.createElement(`
            <td class="line-comments" colspan="4">
                <div class="comment-form-head tabnav flex-justify-between mb-2 edit-mode-visible-only">
                    <nav class="tabnav-tabs">
                        <button type="button" name="write" class="btn-link tabnav-tab write-tab">${l10n.get('visual.comment.writeTab.text')}</button>
                        <button type="button" name="preview" class="btn-link tabnav-tab write-tab">${l10n.get('visual.comment.previewTab.text')}</button>
                    </nav>
                </div>
                <div name="write" class="tabnav-content">
                    <textarea class="form-control input-contrast comment-form-textarea"></textarea>
                    <div class="form-actions">
                        <button type="button" name="accept" class="btn btn-primary">${l10n.get('visual.comment.acceptButton.text')}</button>
                        <button type="button" name="cancel" class="btn">${l10n.get('visual.comment.cancelButton.text')}</button>
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

    setText(text) {
        this.textarea.value = text;
    }

    async onPreviewClick() {
        await this.setPreviewTab();
    }

    async setPreviewTab() {
        this.setTab('preview');
        if (this.textarea.value === this.previousPreviewValue) return; // avoid api calls
        const text = this.textarea.value;
        const commentId = this.prPage.getRandomCommentId();
        const rendered = await this.github.renderMarkdown({ text });
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
                        <svg class="color-fg-muted" width="16" height="16"><use href="#octicon_file_16"></use></svg>
                        <span>${visual.context.file.filename}: ${visual.context.lineNo}</span>
                    </div>
                    <div class="label">${visual.text}</div>
                </div>
                <div class="toolbar">
                    <button name="navTo" class="btn-octicon" title="${l10n.get('sidebar.navToButton.title')}">⎆</button>
                    <button name="delete" class="btn-octicon edit-mode-visible-only" title="${l10n.get('sidebar.deleteButton.title')}">X</button>
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

export class SettingsUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} top-toolbar">`));
        this.events = Util.createEventTarget();

        this.rootElem.innerHTML = `
            <button name="settings" class="btn-octicon">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="26" viewBox="0, 0, 400,319.5402298850575" version="1.1"><g ><path d="M23.633 9.682 C 23.354 9.897,22.954 10.396,22.743 10.791 C 22.532 11.187,22.165 11.511,21.928 11.511 C 21.507 11.511,20.464 13.321,20.464 14.052 C 20.464 14.253,20.072 14.807,19.594 15.282 C 19.115 15.758,18.030 16.938,17.182 17.906 C 16.334 18.873,15.290 20.024,14.862 20.464 C 14.313 21.028,13.949 21.976,13.622 23.690 C 13.343 25.154,12.833 26.598,12.335 27.331 C 11.176 29.040,11.039 40.300,12.163 41.506 C 12.932 42.332,22.535 42.488,35.477 41.885 C 44.632 41.458,45.636 41.335,46.435 40.536 C 46.934 40.036,47.757 39.806,49.846 39.583 C 54.368 39.100,54.659 39.022,55.501 38.078 C 56.210 37.282,56.593 37.156,58.881 36.965 C 60.860 36.800,61.695 36.576,62.465 36.003 C 64.020 34.846,64.605 34.790,77.433 34.575 C 89.350 34.375,89.486 34.365,90.243 33.653 L 91.008 32.934 127.758 32.921 C 190.040 32.899,226.655 32.471,227.195 31.759 C 228.063 30.614,227.773 28.669,226.539 27.360 C 225.703 26.474,225.420 25.893,225.420 25.064 C 225.420 24.216,225.138 23.665,224.221 22.718 C 221.978 20.404,221.281 19.444,221.085 18.399 C 220.977 17.824,220.540 17.011,220.113 16.591 C 219.260 15.751,219.262 15.752,216.880 13.239 L 215.215 11.482 203.291 11.185 C 196.733 11.022,185.870 10.884,179.151 10.880 L 166.935 10.871 165.757 10.072 L 164.579 9.273 94.360 9.283 C 39.666 9.291,24.029 9.379,23.633 9.682 M60.122 44.040 C 59.060 44.458,48.793 55.186,48.190 56.509 C 48.011 56.901,47.622 57.299,47.325 57.393 C 46.079 57.789,45.404 63.227,45.404 72.873 L 45.404 77.362 46.347 77.850 C 47.986 78.697,260.912 78.580,261.681 77.731 C 262.716 76.587,262.298 65.346,261.170 64.007 C 260.488 63.197,260.264 62.515,260.086 60.709 C 259.905 58.872,259.692 58.239,258.985 57.434 C 258.502 56.884,257.958 55.891,257.774 55.227 C 257.488 54.190,254.387 50.537,252.324 48.806 C 252.085 48.605,251.581 48.098,251.204 47.679 C 250.828 47.260,249.814 46.217,248.951 45.361 L 247.382 43.805 153.987 43.830 C 102.619 43.844,60.380 43.938,60.122 44.040 M12.040 53.343 C 11.550 53.884,11.511 61.510,11.511 156.593 L 11.511 259.259 15.321 263.123 C 17.417 265.248,19.270 266.986,19.440 266.986 C 19.610 266.986,20.122 267.477,20.580 268.076 C 21.188 268.875,21.752 269.224,22.685 269.382 C 23.386 269.500,24.478 270.010,25.113 270.514 C 27.036 272.042,32.860 272.498,33.909 271.203 C 34.936 269.934,35.008 263.340,35.010 170.584 L 35.012 77.538 35.853 76.419 L 36.694 75.300 36.851 67.204 L 37.008 59.109 38.005 58.080 C 39.489 56.549,39.729 54.398,38.522 53.449 C 37.253 52.451,12.935 52.353,12.040 53.343 M45.852 87.773 C 45.366 88.514,45.343 95.665,45.539 182.337 C 45.770 284.048,45.803 286.540,46.922 288.052 C 47.391 288.684,47.769 289.876,48.005 291.465 C 48.369 293.914,49.571 295.916,51.496 297.278 C 51.804 297.496,52.266 298.291,52.523 299.045 C 52.844 299.988,53.851 301.303,55.746 303.255 L 58.503 306.093 126.214 306.388 C 193.060 306.680,235.350 306.605,236.298 306.194 C 236.565 306.078,236.963 305.697,237.181 305.348 C 237.605 304.669,238.377 305.477,219.930 287.281 C 217.351 284.736,215.081 282.654,214.887 282.654 C 214.693 282.654,214.371 282.294,214.170 281.855 C 213.970 281.415,213.698 281.055,213.566 281.055 C 213.434 281.055,211.047 278.816,208.262 276.080 C 205.476 273.343,203.054 270.970,202.878 270.806 C 202.702 270.642,201.196 269.126,199.532 267.437 L 196.506 264.365 194.188 264.483 C 192.086 264.589,191.772 264.695,190.807 265.630 C 190.081 266.334,189.253 266.752,188.196 266.950 C 187.142 267.147,186.432 267.505,185.970 268.073 C 185.500 268.651,184.804 268.997,183.701 269.198 C 182.608 269.398,181.908 269.742,181.463 270.300 C 181.017 270.859,180.368 271.177,179.376 271.324 C 178.545 271.447,177.455 271.914,176.794 272.430 C 175.773 273.226,171.615 274.021,168.466 274.021 C 168.330 274.021,167.854 274.358,167.409 274.771 C 165.862 276.204,144.351 276.327,143.219 274.908 C 142.645 274.189,140.711 273.735,138.127 273.715 C 135.879 273.697,134.506 273.298,133.350 272.325 C 132.647 271.733,131.880 271.497,130.096 271.321 C 128.182 271.132,127.579 270.929,126.737 270.190 C 126.122 269.650,125.156 269.203,124.326 269.073 C 123.418 268.930,122.708 268.578,122.263 268.047 C 121.810 267.507,121.067 267.144,120.025 266.954 C 119.167 266.797,118.247 266.405,117.979 266.084 C 117.259 265.217,116.045 264.532,114.832 264.308 C 114.241 264.199,113.377 263.746,112.914 263.301 C 109.842 260.353,109.342 259.979,108.188 259.762 C 107.511 259.636,106.586 259.159,106.133 258.703 C 105.413 257.977,104.712 257.308,103.007 255.717 C 96.495 249.638,89.848 242.312,89.848 241.212 C 89.848 240.736,89.372 239.922,88.649 239.164 C 86.238 236.632,85.448 235.479,85.230 234.172 C 85.090 233.336,84.673 232.530,84.093 231.974 C 83.529 231.434,83.094 230.610,82.963 229.831 C 82.845 229.135,82.343 228.104,81.848 227.539 C 81.108 226.697,80.906 226.095,80.716 224.168 C 80.524 222.222,80.327 221.642,79.560 220.768 C 78.713 219.803,78.605 219.397,78.280 215.932 C 77.974 212.675,77.820 212.036,77.164 211.325 C 75.434 209.449,75.445 183.709,77.177 182.104 C 77.769 181.556,77.991 180.928,78.154 179.346 C 78.699 174.057,78.724 173.944,79.637 172.795 C 80.170 172.125,80.633 171.061,80.760 170.215 C 80.878 169.422,81.179 168.696,81.427 168.601 C 82.008 168.378,82.672 167.057,82.935 165.604 C 83.051 164.963,83.545 164.074,84.060 163.581 C 84.653 163.012,85.053 162.229,85.191 161.366 C 85.327 160.514,85.753 159.671,86.372 159.031 C 86.935 158.450,87.471 157.445,87.652 156.633 C 87.824 155.865,88.234 154.948,88.565 154.596 C 90.987 152.019,92.019 150.622,92.201 149.672 C 92.316 149.073,92.909 148.067,93.521 147.433 C 103.433 137.170,106.862 133.973,108.191 133.758 C 109.177 133.598,109.805 133.136,112.945 130.265 C 113.427 129.825,114.578 129.242,115.503 128.971 C 116.429 128.700,117.474 128.142,117.826 127.733 C 118.219 127.274,118.990 126.906,119.828 126.774 C 120.714 126.636,121.519 126.234,122.126 125.627 C 122.922 124.830,123.453 124.641,125.719 124.345 C 127.829 124.069,128.528 123.840,129.106 123.233 C 129.900 122.402,130.304 122.278,133.157 121.992 C 134.511 121.857,135.374 121.562,136.154 120.966 C 137.679 119.803,150.252 119.288,163.982 119.827 L 173.048 120.183 174.329 121.071 C 175.325 121.761,176.147 122.010,178.013 122.188 C 179.983 122.377,180.571 122.567,181.284 123.251 C 181.854 123.797,182.710 124.171,183.772 124.339 C 184.939 124.524,185.601 124.838,186.141 125.464 C 186.600 125.996,187.437 126.455,188.303 126.649 C 189.079 126.823,190.191 127.384,190.774 127.895 C 191.356 128.407,192.324 128.918,192.924 129.030 C 193.557 129.149,194.460 129.693,195.072 130.325 C 195.653 130.924,196.249 131.415,196.397 131.415 C 196.544 131.415,197.579 132.334,198.696 133.457 C 199.877 134.643,201.215 135.659,201.889 135.882 C 202.996 136.247,205.291 138.218,209.561 142.469 C 214.317 147.204,215.447 148.537,215.845 149.880 C 216.067 150.627,216.352 151.239,216.479 151.239 C 217.154 151.239,222.508 157.926,222.714 159.027 C 222.851 159.755,223.341 160.592,223.988 161.202 C 224.765 161.935,225.096 162.580,225.256 163.671 C 225.402 164.677,225.773 165.463,226.419 166.137 C 227.236 166.990,227.394 167.449,227.563 169.461 C 227.728 171.437,227.903 171.960,228.702 172.869 C 229.592 173.884,229.654 174.137,229.804 177.380 C 229.945 180.410,230.063 180.966,230.809 182.094 L 231.655 183.373 231.655 196.803 L 231.655 210.232 230.855 211.297 C 230.154 212.231,230.034 212.787,229.876 215.816 C 229.712 218.963,229.619 219.361,228.836 220.291 C 228.364 220.853,227.919 221.625,227.847 222.007 C 227.775 222.389,227.566 223.608,227.384 224.716 C 227.158 226.086,226.839 226.903,226.385 227.273 C 226.019 227.573,225.515 228.593,225.267 229.541 C 225.018 230.489,224.435 231.660,223.972 232.144 C 223.508 232.627,222.992 233.636,222.823 234.386 C 222.655 235.136,222.163 236.170,221.730 236.684 C 221.297 237.198,220.943 237.837,220.943 238.103 C 220.943 238.618,260.629 278.497,261.141 278.497 C 262.200 278.497,262.203 278.175,262.116 182.543 C 262.044 102.996,261.961 87.944,261.592 87.499 C 261.185 87.009,253.266 86.970,153.765 86.970 L 46.378 86.970 45.852 87.773 M295.770 87.282 C 294.155 87.684,292.000 90.073,291.730 91.761 C 291.614 92.491,291.349 93.259,291.141 93.467 C 290.001 94.612,289.756 95.546,289.548 99.544 C 289.283 104.636,289.281 104.641,286.347 107.547 C 284.369 109.506,283.705 109.969,282.655 110.124 C 281.951 110.227,280.790 110.398,280.074 110.503 C 279.271 110.622,278.428 111.034,277.867 111.582 C 277.103 112.328,276.583 112.504,274.591 112.691 C 272.277 112.908,272.186 112.950,270.644 114.521 L 269.065 116.128 268.970 131.113 C 268.869 147.193,268.981 148.471,270.445 147.874 C 270.741 147.754,271.401 147.530,271.912 147.377 C 272.423 147.224,273.289 146.627,273.836 146.051 C 274.383 145.475,275.521 144.428,276.366 143.725 C 277.210 143.022,278.277 142.118,278.736 141.717 C 279.195 141.316,280.183 140.833,280.932 140.645 C 281.680 140.457,282.748 139.895,283.305 139.398 C 284.116 138.674,284.745 138.449,286.444 138.275 C 288.513 138.063,290.469 137.225,290.731 136.439 C 290.998 135.639,308.670 135.913,309.567 136.731 C 310.729 137.790,311.424 138.046,313.829 138.299 C 315.637 138.489,316.268 138.710,317.115 139.449 C 317.694 139.954,318.719 140.452,319.408 140.562 C 320.183 140.686,320.989 141.111,321.538 141.684 C 322.024 142.191,322.594 142.606,322.804 142.606 C 323.014 142.606,323.566 143.105,324.031 143.715 C 324.607 144.470,325.309 144.938,326.228 145.181 C 327.860 145.613,334.913 152.664,335.267 154.218 C 335.562 155.513,336.212 156.663,336.936 157.170 C 337.295 157.422,337.652 158.159,337.769 158.893 C 337.887 159.626,338.371 160.626,338.899 161.228 C 339.671 162.108,339.877 162.721,340.146 164.941 C 340.393 166.991,340.636 167.780,341.203 168.384 C 342.679 169.955,342.644 186.597,341.162 188.175 C 340.722 188.644,340.421 189.666,340.169 191.546 C 339.874 193.747,339.642 194.434,338.910 195.270 C 338.348 195.913,337.931 196.842,337.794 197.756 C 337.651 198.712,337.339 199.382,336.893 199.694 C 336.518 199.957,335.921 200.947,335.568 201.895 C 334.755 204.073,332.863 206.256,326.297 212.595 C 325.769 213.105,324.705 213.692,323.935 213.900 C 323.164 214.107,322.063 214.734,321.489 215.292 C 319.041 217.670,318.242 218.113,315.856 218.413 C 314.595 218.571,313.263 218.917,312.897 219.180 C 310.501 220.904,311.407 220.783,300.836 220.783 L 291.003 220.783 289.908 219.722 C 288.928 218.772,288.554 218.637,286.333 218.424 C 284.713 218.270,283.729 218.020,283.494 217.703 C 282.937 216.953,281.647 216.246,280.427 216.020 C 279.818 215.908,278.953 215.464,278.504 215.035 C 278.056 214.605,277.063 214.033,276.298 213.763 C 274.957 213.290,273.731 212.419,271.552 210.391 C 268.962 207.981,268.905 208.276,268.905 224.185 C 268.905 238.235,268.927 238.511,270.169 239.968 C 270.469 240.320,270.888 241.217,271.100 241.961 C 271.508 243.396,271.937 243.752,273.642 244.076 C 274.225 244.186,275.118 244.693,275.626 245.202 C 276.256 245.831,277.021 246.197,278.021 246.347 C 279.072 246.504,279.729 246.834,280.326 247.504 C 280.785 248.020,281.487 248.441,281.887 248.441 C 283.270 248.441,284.838 249.435,286.970 251.662 C 287.146 251.845,287.793 252.513,288.408 253.146 L 289.526 254.296 289.642 260.142 L 289.758 265.989 291.359 267.607 L 292.960 269.225 300.209 269.225 L 307.458 269.225 308.965 267.695 L 310.472 266.165 310.489 262.659 C 310.511 258.220,310.927 254.188,311.393 253.900 C 311.591 253.778,312.103 253.203,312.531 252.624 C 313.896 250.773,316.429 248.837,317.785 248.608 C 318.590 248.472,319.338 248.061,319.874 247.459 C 320.333 246.944,320.887 246.522,321.106 246.521 C 322.167 246.516,323.979 245.771,324.626 245.073 C 325.066 244.599,325.935 244.184,326.844 244.014 C 327.666 243.861,328.777 243.366,329.314 242.914 C 329.995 242.341,330.845 242.026,332.131 241.871 C 334.342 241.605,335.991 240.977,336.250 240.302 C 336.642 239.280,343.075 239.616,344.479 240.732 C 345.118 241.239,346.176 241.755,346.829 241.878 C 348.007 242.099,348.964 242.740,351.430 244.958 C 352.623 246.032,352.895 246.125,355.377 246.316 C 359.623 246.643,359.686 246.612,364.109 242.135 L 368.026 238.170 368.026 235.930 C 368.026 233.663,367.769 232.812,366.735 231.655 C 366.421 231.303,366.005 230.414,365.810 229.680 C 365.602 228.895,365.066 228.016,364.511 227.549 C 363.837 226.982,363.506 226.355,363.357 225.367 C 363.229 224.515,362.811 223.612,362.270 223.022 C 360.606 221.206,360.635 215.901,362.318 214.179 C 362.980 213.502,363.233 212.922,363.243 212.059 C 363.270 209.818,363.768 208.193,364.783 207.037 C 365.501 206.219,365.787 205.573,365.787 204.770 C 365.787 204.004,366.026 203.422,366.538 202.942 C 367.521 202.021,368.026 201.033,368.026 200.032 C 368.026 199.540,368.445 198.802,369.094 198.154 C 369.802 197.445,370.232 196.652,370.368 195.801 C 370.513 194.895,370.928 194.175,371.777 193.357 C 372.440 192.718,373.167 191.974,373.394 191.702 C 373.621 191.430,374.259 191.207,374.813 191.207 C 375.766 191.207,377.931 190.043,377.935 189.528 C 377.937 189.396,379.341 189.276,381.055 189.262 C 386.753 189.212,387.693 188.986,389.312 187.272 L 390.727 185.774 390.727 179.568 L 390.727 173.362 389.572 171.973 C 387.918 169.983,387.462 169.808,383.899 169.796 C 381.034 169.785,380.664 169.713,379.821 169.004 C 379.272 168.543,378.274 168.138,377.377 168.013 C 376.294 167.862,375.557 167.513,374.802 166.794 C 372.513 164.613,370.437 162.358,369.889 161.457 C 369.573 160.937,369.174 160.512,369.002 160.512 C 368.830 160.512,368.532 159.900,368.339 159.153 C 367.743 156.848,367.704 156.761,366.935 155.988 C 366.362 155.412,366.108 154.644,365.852 152.718 C 365.566 150.570,365.371 150.050,364.519 149.171 C 363.636 148.261,363.499 147.866,363.335 145.773 C 363.174 143.718,363.024 143.272,362.197 142.397 C 360.770 140.885,360.662 135.484,362.031 134.055 C 362.512 133.553,363.121 132.430,363.385 131.559 C 363.731 130.413,364.429 129.375,365.913 127.796 C 367.364 126.253,368.027 125.275,368.181 124.449 C 368.302 123.808,368.819 122.806,369.332 122.222 C 369.844 121.638,370.264 121.030,370.264 120.870 C 370.264 119.781,358.671 108.393,357.563 108.393 C 357.220 108.393,356.565 108.789,356.107 109.273 C 355.649 109.756,354.594 110.727,353.763 111.431 C 352.932 112.134,351.830 113.099,351.313 113.575 C 350.797 114.051,349.849 114.608,349.208 114.812 C 348.566 115.017,347.598 115.604,347.055 116.117 C 346.463 116.677,345.569 117.126,344.817 117.242 C 343.508 117.442,341.807 118.263,341.807 118.694 C 341.807 119.299,339.173 118.920,338.188 118.172 C 337.628 117.748,336.595 117.295,335.891 117.168 C 335.188 117.040,334.156 116.539,333.599 116.054 C 333.003 115.536,332.016 115.084,331.201 114.956 C 330.284 114.812,329.583 114.461,329.127 113.917 C 328.552 113.232,327.972 113.026,325.654 112.683 C 323.543 112.371,322.763 112.118,322.426 111.636 C 321.904 110.891,320.590 110.439,318.144 110.164 C 315.919 109.913,313.254 107.610,312.879 105.615 C 312.757 104.961,312.246 103.844,311.743 103.133 C 310.881 101.910,310.817 101.592,310.605 97.385 C 310.389 93.114,310.343 92.891,309.492 91.949 C 309.005 91.409,308.065 90.346,307.404 89.588 C 306.744 88.829,305.833 88.018,305.380 87.786 C 304.367 87.267,297.315 86.897,295.770 87.282 M145.484 126.836 C 145.220 126.937,144.696 127.300,144.319 127.642 C 143.790 128.123,142.849 128.335,140.163 128.581 C 136.844 128.885,135.809 129.219,134.669 130.354 C 134.437 130.586,134.077 130.778,133.870 130.782 C 131.918 130.815,129.361 131.472,128.561 132.145 C 128.052 132.573,126.988 133.086,126.196 133.286 C 125.403 133.485,124.333 134.004,123.817 134.438 C 123.301 134.872,122.266 135.364,121.516 135.533 C 120.767 135.701,119.768 136.208,119.297 136.659 C 118.826 137.111,117.754 137.687,116.914 137.939 C 116.075 138.192,115.061 138.734,114.662 139.143 C 112.689 141.167,110.707 142.594,109.859 142.601 C 108.873 142.609,101.166 150.572,100.879 151.880 C 100.749 152.472,100.308 153.325,99.900 153.776 C 97.344 156.599,96.617 157.588,96.418 158.508 C 96.199 159.519,95.719 160.195,93.285 162.919 C 92.626 163.656,92.086 164.561,92.086 164.928 C 92.086 166.503,91.335 168.878,90.507 169.920 C 90.015 170.539,89.517 171.645,89.400 172.380 C 89.282 173.115,88.840 174.127,88.417 174.629 C 87.982 175.147,87.577 176.130,87.482 176.900 C 86.812 182.377,86.688 182.917,85.877 183.881 L 85.052 184.861 85.052 196.528 C 85.052 208.291,85.122 209.092,86.226 209.912 C 86.480 210.101,86.789 211.409,86.980 213.110 C 87.482 217.565,87.583 217.985,88.392 218.946 C 88.851 219.491,89.232 220.471,89.359 221.433 C 89.742 224.321,89.887 224.754,90.804 225.735 C 91.363 226.334,91.793 227.228,91.924 228.062 C 92.053 228.890,92.424 229.665,92.878 230.056 C 94.135 231.138,96.018 233.825,96.381 235.054 C 96.871 236.715,107.219 247.759,112.069 251.799 C 112.914 252.502,114.123 253.601,114.756 254.240 C 115.475 254.965,116.338 255.478,117.054 255.603 C 117.685 255.714,118.684 256.236,119.275 256.764 C 119.866 257.291,120.933 257.878,121.645 258.067 C 122.358 258.256,123.248 258.694,123.623 259.041 C 123.997 259.388,124.991 259.879,125.830 260.131 C 126.670 260.384,127.871 260.983,128.499 261.462 C 129.404 262.152,130.140 262.381,132.037 262.563 C 133.485 262.701,134.563 262.968,134.762 263.238 C 135.484 264.215,136.869 264.572,141.411 264.948 C 145.722 265.304,146.217 265.410,147.111 266.162 C 148.088 266.984,148.107 266.986,154.117 266.986 L 160.143 266.986 161.141 266.146 C 162.056 265.376,162.493 265.281,166.362 265.009 C 171.631 264.637,171.757 264.610,172.968 263.591 C 173.758 262.926,174.404 262.721,176.110 262.594 C 177.916 262.459,178.478 262.264,179.648 261.369 C 180.797 260.489,181.423 260.266,183.255 260.086 C 184.972 259.917,185.596 259.713,186.021 259.182 C 186.323 258.805,187.074 258.151,187.690 257.728 C 188.305 257.306,189.060 256.705,189.367 256.393 C 189.674 256.080,190.465 255.724,191.125 255.600 C 191.958 255.444,192.987 254.779,194.493 253.427 C 195.750 252.298,197.186 251.322,197.910 251.105 C 199.606 250.598,207.194 243.056,207.194 241.878 C 207.194 241.388,207.781 240.446,208.760 239.364 C 209.622 238.413,210.554 237.368,210.833 237.043 C 211.111 236.717,211.908 235.820,212.603 235.049 C 213.400 234.166,213.942 233.204,214.070 232.446 C 214.182 231.785,214.627 230.912,215.060 230.505 C 215.493 230.099,216.063 229.025,216.326 228.120 C 216.589 227.214,217.149 226.150,217.569 225.755 C 218.070 225.285,218.406 224.515,218.542 223.528 C 218.688 222.462,219.012 221.771,219.644 221.174 C 220.567 220.302,220.940 219.152,220.948 217.146 C 220.953 216.010,221.201 215.400,222.281 213.871 C 223.292 212.439,223.994 200.112,223.535 191.847 C 223.045 183.029,222.940 182.296,222.044 181.465 C 221.464 180.928,221.270 180.302,221.095 178.405 C 220.912 176.429,220.709 175.809,219.914 174.794 C 219.152 173.823,218.886 173.063,218.630 171.117 C 218.351 169.005,218.176 168.553,217.365 167.857 C 216.703 167.287,216.373 166.657,216.247 165.723 C 216.124 164.808,215.709 163.996,214.909 163.107 C 212.752 160.711,212.065 159.712,211.725 158.482 C 211.347 157.115,211.541 157.333,202.978 148.665 C 194.503 140.088,192.442 138.252,190.976 137.977 C 190.302 137.851,189.259 137.279,188.576 136.663 C 187.768 135.932,187.051 135.572,186.410 135.572 C 185.883 135.572,185.173 135.293,184.834 134.953 C 183.856 133.976,182.826 133.421,181.586 133.204 C 180.955 133.094,180.113 132.658,179.716 132.235 C 179.211 131.698,178.497 131.406,177.346 131.265 C 173.702 130.821,171.063 130.357,171.063 130.161 C 171.063 129.485,168.945 128.864,165.682 128.584 C 162.511 128.311,162.031 128.190,161.495 127.527 C 160.898 126.790,147.153 126.197,145.484 126.836 M169.323 157.130 C 170.348 157.881,170.166 163.734,169.058 165.660 C 168.164 167.213,168.005 167.826,167.548 171.488 C 167.309 173.404,167.078 174.118,166.562 174.536 C 166.042 174.957,165.805 175.706,165.519 177.844 C 165.243 179.897,164.969 180.797,164.450 181.350 C 163.466 182.399,163.070 183.625,163.070 185.621 C 163.070 187.102,162.935 187.485,162.126 188.314 C 161.201 189.260,161.050 189.746,160.686 192.951 C 160.563 194.029,160.253 194.799,159.716 195.360 C 159.105 195.997,158.846 196.761,158.573 198.720 C 158.290 200.756,158.041 201.459,157.308 202.294 C 156.563 203.142,156.355 203.746,156.173 205.592 C 155.996 207.397,155.766 208.084,155.034 209.006 C 154.529 209.641,154.117 210.220,154.117 210.294 C 154.117 212.063,153.284 215.169,152.622 215.872 C 152.127 216.397,151.762 217.241,151.653 218.110 C 151.535 219.056,151.175 219.826,150.535 220.504 C 149.747 221.339,149.537 221.919,149.263 224.021 C 149.013 225.942,148.755 226.731,148.173 227.351 C 147.621 227.939,147.285 228.889,146.952 230.796 C 146.453 233.654,146.006 234.402,143.130 237.185 C 141.345 238.913,141.005 239.000,140.463 237.869 C 140.247 237.419,139.790 236.796,139.446 236.485 C 138.829 235.926,138.830 235.910,139.550 234.848 C 140.203 233.887,140.295 233.289,140.438 229.074 C 140.581 224.843,140.662 224.320,141.244 223.856 C 142.287 223.026,142.520 222.251,142.764 218.786 C 142.970 215.858,143.090 215.388,143.893 214.378 C 144.624 213.458,144.834 212.797,145.019 210.825 C 145.214 208.742,145.385 208.244,146.239 207.271 C 147.095 206.296,147.259 205.816,147.423 203.813 C 147.586 201.828,147.755 201.326,148.577 200.390 C 149.395 199.458,149.569 198.946,149.733 196.990 C 149.895 195.060,150.075 194.517,150.851 193.634 C 151.645 192.729,151.807 192.221,151.988 190.055 C 152.113 188.559,152.372 187.400,152.622 187.210 C 153.532 186.523,154.084 185.196,154.388 182.970 C 154.620 181.269,154.919 180.395,155.506 179.696 C 156.067 179.031,156.371 178.189,156.517 176.902 C 156.768 174.681,157.260 172.982,157.650 172.982 C 158.215 172.982,158.830 171.187,158.993 169.069 C 159.133 167.241,159.309 166.744,160.155 165.781 C 160.767 165.083,161.151 164.298,161.151 163.743 C 161.151 161.074,161.533 159.999,163.074 158.332 L 164.606 156.675 166.654 156.675 C 167.923 156.675,168.939 156.848,169.323 157.130 M130.492 171.942 C 131.504 174.563,130.593 176.311,125.742 181.053 C 124.488 182.279,121.916 184.173,121.504 184.173 C 120.810 184.173,118.500 186.172,112.349 192.096 C 110.392 193.981,107.924 196.303,106.865 197.256 L 104.939 198.988 105.364 200.401 C 105.846 202.002,106.473 202.581,108.049 202.880 C 109.119 203.083,109.821 203.596,112.266 205.964 C 113.041 206.715,113.907 207.206,114.690 207.338 C 115.608 207.494,116.489 208.091,118.278 209.768 C 119.582 210.990,120.819 211.990,121.026 211.990 C 121.234 211.990,121.678 212.299,122.013 212.676 C 122.348 213.054,123.248 213.642,124.012 213.984 C 126.144 214.938,130.246 219.364,130.476 220.960 C 130.645 222.127,130.570 222.280,129.357 223.244 C 128.642 223.812,128.010 224.389,127.952 224.525 C 127.894 224.662,127.390 224.431,126.833 224.012 C 126.275 223.593,125.172 223.148,124.380 223.022 C 123.414 222.869,122.670 222.503,122.114 221.906 C 121.571 221.322,120.802 220.936,119.876 220.781 C 118.904 220.619,118.151 220.224,117.456 219.512 C 116.831 218.872,116.003 218.407,115.280 218.289 C 114.462 218.157,113.459 217.520,111.923 216.158 C 110.573 214.961,109.200 214.053,108.343 213.792 C 107.035 213.392,104.677 211.468,101.381 208.110 C 100.667 207.384,99.812 206.873,99.099 206.748 C 98.199 206.590,97.145 205.756,94.098 202.794 L 90.237 199.041 92.912 196.483 C 94.383 195.076,96.172 193.626,96.886 193.260 C 97.600 192.895,98.403 192.283,98.671 191.901 C 98.938 191.519,99.344 191.207,99.572 191.207 C 99.800 191.207,100.979 190.231,102.192 189.038 C 106.848 184.458,109.469 182.319,110.709 182.088 C 111.492 181.941,112.235 181.489,112.858 180.780 C 113.381 180.184,113.904 179.696,114.020 179.696 C 114.136 179.696,114.771 179.208,115.432 178.612 C 116.189 177.927,117.118 177.445,117.948 177.304 C 118.672 177.182,119.265 176.960,119.265 176.810 C 119.265 176.120,123.437 173.035,124.647 172.831 C 125.358 172.711,126.228 172.278,126.640 171.840 C 127.748 170.660,130.019 170.721,130.492 171.942 M186.032 173.832 C 186.664 174.464,187.509 174.921,188.291 175.053 C 189.503 175.258,191.255 176.657,195.379 180.715 C 196.081 181.405,197.033 181.979,197.678 182.100 C 198.622 182.277,201.503 184.629,204.157 187.389 C 204.333 187.572,204.754 187.967,205.093 188.265 C 205.433 188.564,206.789 189.852,208.107 191.127 C 209.425 192.402,210.614 193.445,210.749 193.445 C 210.884 193.445,211.243 193.866,211.547 194.379 C 211.850 194.893,212.418 195.485,212.809 195.694 C 213.199 195.903,213.710 196.431,213.943 196.867 C 214.177 197.303,214.914 197.938,215.581 198.279 L 216.794 198.898 216.271 199.910 C 215.404 201.587,212.672 204.256,211.578 204.497 C 211.031 204.617,210.037 205.237,209.369 205.875 C 208.701 206.513,207.564 207.538,206.842 208.153 C 206.120 208.769,204.514 210.242,203.273 211.426 C 201.689 212.937,200.682 213.642,199.896 213.790 C 198.838 213.988,197.537 214.966,195.164 217.346 C 194.594 217.918,194.010 218.385,193.865 218.385 C 193.721 218.385,192.895 218.889,192.029 219.504 C 191.163 220.120,190.269 220.624,190.043 220.624 C 189.816 220.624,189.127 221.066,188.511 221.607 C 187.602 222.404,186.900 222.669,184.795 223.006 C 183.152 223.269,181.854 223.677,181.258 224.117 L 180.317 224.813 179.847 223.688 C 178.761 221.089,179.071 220.263,182.349 217.014 C 187.921 211.493,189.687 210.006,191.046 209.690 C 191.784 209.519,192.798 208.930,193.445 208.298 C 194.060 207.695,196.414 205.412,198.675 203.224 C 200.936 201.036,202.735 199.102,202.672 198.927 C 202.516 198.490,199.866 195.801,198.058 194.245 C 197.241 193.541,195.577 191.999,194.359 190.817 C 192.927 189.427,191.726 188.552,190.957 188.339 C 190.101 188.102,188.874 187.116,186.571 184.810 C 184.812 183.050,183.122 181.529,182.814 181.431 C 182.506 181.332,182.254 181.123,182.254 180.966 C 182.254 180.808,181.679 180.127,180.977 179.452 C 179.484 178.017,178.860 175.024,179.720 173.417 C 180.423 172.104,184.576 172.377,186.032 173.832 M209.940 252.740 C 206.643 256.026,206.600 256.114,206.863 259.026 L 207.082 261.457 211.535 266.025 C 229.573 284.528,249.210 303.674,250.520 304.036 C 251.530 304.315,256.506 308.554,259.492 311.679 C 260.387 312.616,260.759 312.757,263.020 313.012 C 267.263 313.492,268.708 313.031,269.247 311.026 C 269.445 310.291,269.953 309.279,270.375 308.777 C 271.346 307.623,271.345 306.876,270.368 305.761 C 269.942 305.274,269.070 304.273,268.429 303.535 C 267.789 302.798,267.123 301.680,266.949 301.052 C 266.751 300.336,265.833 299.084,264.492 297.701 C 263.314 296.487,260.839 293.883,258.993 291.915 C 257.146 289.947,254.148 286.845,252.330 285.022 C 250.101 282.788,248.851 281.263,248.493 280.342 C 248.159 279.484,247.249 278.323,246.043 277.218 C 244.988 276.251,244.075 275.347,244.015 275.209 C 243.603 274.272,237.958 269.192,236.973 268.872 C 236.144 268.602,234.250 266.930,230.351 263.024 C 227.347 260.015,223.688 256.475,222.218 255.156 C 220.748 253.837,219.155 252.345,218.677 251.841 C 217.764 250.879,216.130 250.399,213.678 250.374 C 212.419 250.361,212.167 250.520,209.940 252.740 " stroke="black" stroke-width="10" fill-rule="evenodd"></path><path d="M28.777 0.639 C 28.777 1.255,28.564 1.279,23.022 1.279 L 17.266 1.279 17.266 2.398 L 17.266 3.517 15.534 3.517 C 13.235 3.517,12.790 3.724,12.790 4.795 C 12.790 5.558,12.631 5.714,11.671 5.894 C 10.696 6.077,10.552 6.224,10.552 7.034 C 10.552 7.839,10.405 7.992,9.467 8.168 C 8.283 8.390,7.994 9.055,7.994 11.551 C 7.994 12.754,7.961 12.790,6.875 12.790 C 5.809 12.790,5.755 12.843,5.755 13.909 C 5.755 14.863,5.647 15.028,5.020 15.028 C 3.751 15.028,3.517 15.605,3.517 18.733 L 3.517 21.671 2.398 21.881 L 1.279 22.091 1.279 35.826 C 1.279 49.347,1.269 49.560,0.639 49.560 C 0.002 49.560,0.000 49.774,0.000 138.129 C 0.000 226.356,0.002 226.699,0.637 226.699 C 1.263 226.699,1.275 226.964,1.356 243.725 L 1.439 260.751 2.478 260.852 L 3.517 260.952 3.517 263.330 L 3.517 265.707 4.622 265.707 L 5.726 265.707 5.821 267.866 L 5.915 270.024 6.954 270.124 C 7.849 270.210,7.994 270.346,7.994 271.099 C 7.994 272.156,8.517 272.742,9.462 272.742 C 9.959 272.742,10.226 272.996,10.382 273.618 C 10.636 274.628,11.059 274.968,12.070 274.975 C 12.650 274.979,12.790 275.160,12.790 275.905 C 12.790 277.015,13.215 277.218,15.534 277.218 L 17.266 277.218 17.266 278.337 C 17.266 279.403,17.319 279.456,18.385 279.456 C 19.275 279.456,19.504 279.582,19.504 280.070 C 19.504 281.606,19.707 281.695,23.216 281.695 L 26.539 281.695 26.539 282.814 L 26.539 283.933 31.015 283.933 L 35.492 283.933 35.494 288.010 C 35.499 294.590,35.669 295.444,36.975 295.444 L 38.050 295.444 38.050 297.842 L 38.050 300.240 39.154 300.240 L 40.259 300.240 40.353 302.398 L 40.448 304.556 41.487 304.657 C 42.438 304.748,42.526 304.850,42.526 305.856 C 42.526 306.895,42.586 306.954,43.626 306.954 C 44.666 306.954,44.731 307.020,44.825 308.153 C 44.915 309.242,45.018 309.362,45.940 309.451 C 46.939 309.548,46.959 309.583,47.175 311.602 C 47.392 313.623,47.411 313.657,48.478 313.857 C 49.455 314.040,49.560 314.165,49.560 315.143 L 49.560 316.227 74.800 316.227 L 100.039 316.227 100.140 317.266 L 100.240 318.305 154.197 318.386 C 207.887 318.467,208.153 318.470,208.153 319.106 C 208.153 319.740,208.383 319.744,241.407 319.744 C 274.447 319.744,274.660 319.740,274.660 319.105 C 274.660 318.587,274.873 318.465,275.779 318.465 C 276.845 318.465,276.898 318.412,276.898 317.346 C 276.898 316.400,277.010 316.226,277.618 316.222 C 278.813 316.214,279.078 315.828,279.313 313.745 C 279.516 311.957,279.614 311.751,280.258 311.751 C 281.616 311.751,281.713 311.235,281.622 304.515 L 281.535 298.161 280.539 298.065 C 279.572 297.970,279.538 297.913,279.342 296.039 C 279.095 293.671,279.009 293.525,277.858 293.525 C 277.025 293.525,276.928 293.411,276.838 292.326 C 276.748 291.235,276.646 291.118,275.714 291.028 L 274.689 290.929 274.595 288.790 L 274.500 286.651 273.461 286.550 L 272.422 286.450 272.422 283.337 C 272.422 280.025,272.202 279.456,270.919 279.456 L 270.184 279.456 270.184 267.946 L 270.184 256.435 271.127 256.435 C 271.662 256.435,272.195 256.212,272.359 255.920 C 272.623 255.447,272.663 255.447,272.844 255.920 C 272.953 256.203,273.385 256.435,273.805 256.435 C 274.392 256.435,274.636 256.675,274.864 257.474 C 275.092 258.275,275.360 258.536,276.029 258.614 C 276.738 258.697,276.898 258.877,276.898 259.590 C 276.898 260.705,277.431 261.231,278.561 261.231 L 279.456 261.231 279.456 264.588 L 279.456 267.946 280.576 267.946 L 281.695 267.946 281.695 271.269 C 281.695 274.777,281.783 274.980,283.320 274.980 C 283.807 274.980,283.933 275.209,283.933 276.099 C 283.933 277.161,283.989 277.218,285.032 277.218 C 286.038 277.218,286.139 277.306,286.231 278.257 L 286.331 279.297 300.400 279.385 C 316.230 279.485,315.907 279.511,315.907 278.171 C 315.907 277.328,316.016 277.218,316.855 277.218 C 318.179 277.218,318.465 276.484,318.465 273.083 L 318.465 270.184 319.584 270.184 L 320.703 270.184 320.703 266.893 L 320.703 263.601 321.743 263.296 C 322.768 262.994,322.783 262.961,322.876 260.831 L 322.971 258.673 324.075 258.673 C 325.122 258.673,325.180 258.615,325.180 257.569 L 325.180 256.464 327.338 256.370 C 329.468 256.276,329.500 256.261,329.802 255.236 L 330.108 254.197 332.280 254.197 L 334.452 254.197 334.452 253.078 L 334.452 251.958 339.068 251.958 L 343.685 251.958 343.785 252.998 C 343.873 253.911,344.010 254.049,344.924 254.137 C 345.689 254.211,345.963 254.394,345.963 254.834 C 345.963 255.908,346.854 256.435,348.668 256.435 C 350.358 256.435,350.370 256.442,350.578 257.554 C 350.769 258.572,350.887 258.673,351.873 258.673 C 352.862 258.673,352.966 258.764,353.057 259.709 C 353.180 260.981,354.073 261.204,358.913 261.175 C 363.324 261.148,363.984 260.975,364.189 259.792 C 364.320 259.036,364.552 258.804,365.308 258.673 C 366.059 258.543,366.296 258.309,366.424 257.572 C 366.552 256.838,366.814 256.576,367.636 256.363 C 368.441 256.155,368.728 255.878,368.869 255.177 C 369.007 254.486,369.279 254.218,369.984 254.077 C 370.704 253.933,370.961 253.670,371.110 252.923 C 371.259 252.178,371.533 251.897,372.302 251.697 C 373.073 251.498,373.339 251.224,373.464 250.502 C 373.592 249.765,373.829 249.531,374.580 249.400 C 375.337 249.269,375.568 249.038,375.699 248.281 C 375.830 247.525,376.062 247.293,376.819 247.162 C 377.570 247.032,377.807 246.798,377.935 246.061 C 378.060 245.338,378.326 245.065,379.099 244.865 C 380.209 244.577,380.484 243.973,380.491 241.807 C 380.496 240.468,380.512 240.448,381.615 240.448 C 382.677 240.448,382.734 240.391,382.734 239.349 C 382.734 238.343,382.822 238.241,383.773 238.150 L 384.812 238.050 384.812 235.811 L 384.812 233.573 383.773 233.473 C 382.822 233.381,382.734 233.280,382.734 232.274 C 382.734 231.235,382.674 231.175,381.635 231.175 C 380.629 231.175,380.528 231.087,380.436 230.136 C 380.348 229.227,380.208 229.084,379.315 228.998 C 378.427 228.912,378.282 228.767,378.196 227.879 C 378.110 226.986,377.968 226.846,377.058 226.758 C 376.108 226.667,376.019 226.565,376.019 225.563 C 376.019 224.536,375.941 224.455,374.765 224.267 L 373.511 224.067 373.406 221.828 C 373.348 220.597,373.346 218.024,373.401 216.110 L 373.501 212.630 374.566 212.630 C 375.826 212.630,376.019 212.270,376.019 209.926 C 376.019 208.312,376.062 208.225,376.952 208.047 C 377.836 207.870,377.895 207.754,378.106 205.786 C 378.324 203.750,378.346 203.711,379.332 203.615 C 380.240 203.526,380.345 203.403,380.435 202.318 C 380.529 201.184,380.594 201.119,381.634 201.119 C 382.676 201.119,382.734 201.061,382.734 200.009 L 382.734 198.898 387.290 198.810 L 391.847 198.721 391.947 197.682 L 392.047 196.643 395.384 196.643 L 398.721 196.643 398.721 194.404 C 398.721 192.379,398.782 192.166,399.361 192.166 C 399.992 192.166,400.000 191.953,400.000 176.019 L 400.000 159.872 394.884 159.872 C 390.054 159.872,389.768 159.838,389.768 159.259 C 389.768 157.671,389.659 157.634,384.938 157.634 L 380.496 157.634 380.496 156.515 C 380.496 155.449,380.442 155.396,379.376 155.396 C 378.303 155.396,378.256 155.347,378.220 154.197 C 378.149 151.959,377.831 151.121,376.978 150.920 C 376.217 150.741,376.169 150.591,375.970 147.780 C 375.710 144.090,375.628 143.885,374.430 143.885 L 373.461 143.885 373.461 139.268 L 373.461 134.651 374.660 134.552 C 375.794 134.458,375.865 134.387,375.959 133.253 C 376.043 132.231,376.170 132.054,376.819 132.054 C 377.798 132.054,377.901 131.858,378.143 129.541 C 378.339 127.666,378.373 127.609,379.340 127.515 C 380.201 127.431,380.349 127.280,380.435 126.398 C 380.521 125.509,380.665 125.365,381.554 125.279 L 382.574 125.180 382.663 120.800 L 382.752 116.419 381.641 116.211 C 380.684 116.031,380.518 115.864,380.434 114.996 C 380.349 114.125,380.199 113.976,379.329 113.891 C 378.462 113.807,378.293 113.640,378.115 112.692 C 377.935 111.732,377.788 111.591,376.964 111.591 C 376.246 111.591,376.019 111.444,376.019 110.977 C 376.019 109.755,375.655 109.353,374.546 109.353 C 373.519 109.353,373.461 109.293,373.461 108.233 C 373.461 107.168,373.408 107.114,372.342 107.114 C 371.279 107.114,371.223 107.059,371.223 106.010 C 371.223 105.000,371.126 104.887,370.104 104.695 C 369.143 104.515,368.985 104.359,368.985 103.596 C 368.985 102.692,368.509 102.318,367.360 102.318 C 366.968 102.318,366.747 102.096,366.747 101.705 C 366.747 100.482,366.382 100.080,365.274 100.080 C 364.290 100.080,364.189 99.993,364.189 99.155 C 364.189 98.045,363.763 97.842,361.445 97.842 L 359.712 97.842 359.712 96.723 L 359.712 95.604 357.474 95.604 L 355.236 95.604 355.236 96.723 L 355.236 97.842 353.503 97.842 C 351.185 97.842,350.759 98.045,350.759 99.155 C 350.759 99.993,350.658 100.080,349.674 100.080 C 348.566 100.080,348.201 100.482,348.201 101.705 C 348.201 102.096,347.980 102.318,347.588 102.318 C 346.433 102.318,345.963 102.692,345.963 103.611 C 345.963 104.398,345.828 104.529,344.924 104.616 C 343.975 104.708,343.876 104.821,343.786 105.915 L 343.686 107.114 341.308 107.114 L 338.929 107.114 338.929 106.035 C 338.929 104.753,338.351 104.556,334.593 104.556 L 332.255 104.556 332.155 103.517 L 332.054 102.478 329.915 102.384 L 327.776 102.290 327.677 101.265 C 327.587 100.332,327.470 100.231,326.379 100.141 C 325.245 100.047,325.180 99.982,325.180 98.942 C 325.180 97.898,325.123 97.842,324.061 97.842 C 322.995 97.842,322.942 97.788,322.942 96.723 C 322.942 95.659,322.887 95.604,321.833 95.604 L 320.725 95.604 320.634 92.166 L 320.544 88.729 319.513 88.629 L 318.483 88.530 318.394 83.993 L 318.305 79.456 316.006 79.363 L 313.708 79.269 313.608 78.244 L 313.509 77.218 300.277 77.135 C 286.297 77.046,286.171 77.059,286.171 78.522 C 286.171 79.220,286.033 79.273,284.013 79.362 L 281.855 79.456 281.767 85.132 C 281.685 90.459,281.643 90.807,281.074 90.807 C 279.642 90.807,279.456 91.102,279.456 93.379 L 279.456 95.563 278.417 95.663 C 277.391 95.762,277.375 95.790,277.088 97.922 L 276.798 100.080 275.729 100.080 C 274.721 100.080,274.660 100.143,274.660 101.199 C 274.660 102.867,272.523 102.941,272.362 101.279 C 272.274 100.365,272.137 100.228,271.223 100.140 L 270.184 100.039 270.184 77.544 C 270.184 53.224,270.229 54.037,268.871 54.037 C 267.981 54.037,267.945 53.979,267.941 52.518 C 267.934 50.014,267.708 49.560,266.470 49.560 C 265.446 49.560,265.388 49.500,265.388 48.441 C 265.388 47.379,265.332 47.322,264.288 47.322 C 263.248 47.322,263.183 47.257,263.089 46.123 C 262.998 45.028,262.899 44.915,261.950 44.824 C 260.999 44.732,260.911 44.631,260.911 43.625 C 260.911 42.586,260.851 42.526,259.812 42.526 C 258.806 42.526,258.705 42.438,258.613 41.487 C 258.525 40.573,258.388 40.436,257.474 40.347 C 256.711 40.274,256.435 40.090,256.435 39.654 C 256.435 38.459,256.064 38.050,254.982 38.050 C 254.015 38.050,253.908 37.955,253.817 37.010 L 253.717 35.971 251.559 35.877 L 249.400 35.782 249.400 34.830 C 249.400 33.584,248.532 33.253,245.258 33.253 C 242.797 33.253,242.752 33.239,242.535 32.377 C 242.240 31.201,241.880 31.026,239.743 31.020 L 237.919 31.015 237.824 28.857 L 237.730 26.699 236.701 26.599 L 235.673 26.500 235.582 23.082 L 235.492 19.664 234.496 19.567 C 233.529 19.473,233.495 19.416,233.299 17.542 C 233.056 15.217,232.955 15.028,231.956 15.028 C 231.399 15.028,231.175 14.852,231.175 14.415 C 231.175 13.192,230.811 12.790,229.702 12.790 C 228.682 12.790,228.617 12.725,228.617 11.705 C 228.617 10.601,228.214 10.232,227.012 10.232 C 226.577 10.232,226.393 9.956,226.319 9.193 C 226.232 8.283,226.091 8.141,225.199 8.055 C 224.310 7.969,224.166 7.824,224.080 6.936 C 223.994 6.047,223.849 5.902,222.960 5.816 C 222.072 5.730,221.927 5.586,221.841 4.697 C 221.755 3.809,221.611 3.664,220.722 3.578 C 219.834 3.492,219.689 3.348,219.603 2.459 C 219.513 1.532,219.395 1.430,218.305 1.340 C 217.366 1.262,217.106 1.106,217.106 0.620 C 217.106 0.008,215.916 0.000,122.942 0.000 C 28.990 0.000,28.777 0.001,28.777 0.639 M165.757 10.072 L 166.935 10.871 179.151 10.880 C 185.870 10.884,196.733 11.022,203.291 11.185 L 215.215 11.482 216.880 13.239 C 219.262 15.752,219.260 15.751,220.113 16.591 C 220.540 17.011,220.977 17.824,221.085 18.399 C 221.281 19.444,221.978 20.404,224.221 22.718 C 225.138 23.665,225.420 24.216,225.420 25.064 C 225.420 25.893,225.703 26.474,226.539 27.360 C 227.773 28.669,228.063 30.614,227.195 31.759 C 226.655 32.471,190.040 32.899,127.758 32.921 L 91.008 32.934 90.243 33.653 C 89.486 34.365,89.350 34.375,77.433 34.575 C 64.605 34.790,64.020 34.846,62.465 36.003 C 61.695 36.576,60.860 36.800,58.881 36.965 C 56.593 37.156,56.210 37.282,55.501 38.078 C 54.659 39.022,54.368 39.100,49.846 39.583 C 47.757 39.806,46.934 40.036,46.435 40.536 C 45.636 41.335,44.632 41.458,35.477 41.885 C 22.535 42.488,12.932 42.332,12.163 41.506 C 11.039 40.300,11.176 29.040,12.335 27.331 C 12.833 26.598,13.343 25.154,13.622 23.690 C 13.949 21.976,14.313 21.028,14.862 20.464 C 15.290 20.024,16.334 18.873,17.182 17.906 C 18.030 16.938,19.115 15.758,19.594 15.282 C 20.072 14.807,20.464 14.253,20.464 14.052 C 20.464 13.321,21.507 11.511,21.928 11.511 C 22.165 11.511,22.532 11.187,22.743 10.791 C 22.954 10.396,23.354 9.897,23.633 9.682 C 24.029 9.379,39.666 9.291,94.360 9.283 L 164.579 9.273 165.757 10.072 M248.951 45.361 C 249.814 46.217,250.828 47.260,251.204 47.679 C 251.581 48.098,252.085 48.605,252.324 48.806 C 254.387 50.537,257.488 54.190,257.774 55.227 C 257.958 55.891,258.502 56.884,258.985 57.434 C 259.692 58.239,259.905 58.872,260.086 60.709 C 260.264 62.515,260.488 63.197,261.170 64.007 C 262.298 65.346,262.716 76.587,261.681 77.731 C 260.912 78.580,47.986 78.697,46.347 77.850 L 45.404 77.362 45.404 72.873 C 45.404 63.227,46.079 57.789,47.325 57.393 C 47.622 57.299,48.011 56.901,48.190 56.509 C 48.793 55.186,59.060 44.458,60.122 44.040 C 60.380 43.938,102.619 43.844,153.987 43.830 L 247.382 43.805 248.951 45.361 M38.522 53.449 C 39.729 54.398,39.489 56.549,38.005 58.080 L 37.008 59.109 36.851 67.204 L 36.694 75.300 35.853 76.419 L 35.012 77.538 35.010 170.584 C 35.008 263.340,34.936 269.934,33.909 271.203 C 32.860 272.498,27.036 272.042,25.113 270.514 C 24.478 270.010,23.386 269.500,22.685 269.382 C 21.752 269.224,21.188 268.875,20.580 268.076 C 20.122 267.477,19.610 266.986,19.440 266.986 C 19.270 266.986,17.417 265.248,15.321 263.123 L 11.511 259.259 11.511 156.593 C 11.511 61.510,11.550 53.884,12.040 53.343 C 12.935 52.353,37.253 52.451,38.522 53.449 M261.592 87.499 C 261.961 87.944,262.044 102.996,262.116 182.543 C 262.203 278.175,262.200 278.497,261.141 278.497 C 260.629 278.497,220.943 238.618,220.943 238.103 C 220.943 237.837,221.297 237.198,221.730 236.684 C 222.163 236.170,222.655 235.136,222.823 234.386 C 222.992 233.636,223.508 232.627,223.972 232.144 C 224.435 231.660,225.018 230.489,225.267 229.541 C 225.515 228.593,226.019 227.573,226.385 227.273 C 226.839 226.903,227.158 226.086,227.384 224.716 C 227.566 223.608,227.775 222.389,227.847 222.007 C 227.919 221.625,228.364 220.853,228.836 220.291 C 229.619 219.361,229.712 218.963,229.876 215.816 C 230.034 212.787,230.154 212.231,230.855 211.297 L 231.655 210.232 231.655 196.803 L 231.655 183.373 230.809 182.094 C 230.063 180.966,229.945 180.410,229.804 177.380 C 229.654 174.137,229.592 173.884,228.702 172.869 C 227.903 171.960,227.728 171.437,227.563 169.461 C 227.394 167.449,227.236 166.990,226.419 166.137 C 225.773 165.463,225.402 164.677,225.256 163.671 C 225.096 162.580,224.765 161.935,223.988 161.202 C 223.341 160.592,222.851 159.755,222.714 159.027 C 222.508 157.926,217.154 151.239,216.479 151.239 C 216.352 151.239,216.067 150.627,215.845 149.880 C 215.447 148.537,214.317 147.204,209.561 142.469 C 205.291 138.218,202.996 136.247,201.889 135.882 C 201.215 135.659,199.877 134.643,198.696 133.457 C 197.579 132.334,196.544 131.415,196.397 131.415 C 196.249 131.415,195.653 130.924,195.072 130.325 C 194.460 129.693,193.557 129.149,192.924 129.030 C 192.324 128.918,191.356 128.407,190.774 127.895 C 190.191 127.384,189.079 126.823,188.303 126.649 C 187.437 126.455,186.600 125.996,186.141 125.464 C 185.601 124.838,184.939 124.524,183.772 124.339 C 182.710 124.171,181.854 123.797,181.284 123.251 C 180.571 122.567,179.983 122.377,178.013 122.188 C 176.147 122.010,175.325 121.761,174.329 121.071 L 173.048 120.183 163.982 119.827 C 150.252 119.288,137.679 119.803,136.154 120.966 C 135.374 121.562,134.511 121.857,133.157 121.992 C 130.304 122.278,129.900 122.402,129.106 123.233 C 128.528 123.840,127.829 124.069,125.719 124.345 C 123.453 124.641,122.922 124.830,122.126 125.627 C 121.519 126.234,120.714 126.636,119.828 126.774 C 118.990 126.906,118.219 127.274,117.826 127.733 C 117.474 128.142,116.429 128.700,115.503 128.971 C 114.578 129.242,113.427 129.825,112.945 130.265 C 109.805 133.136,109.177 133.598,108.191 133.758 C 106.862 133.973,103.433 137.170,93.521 147.433 C 92.909 148.067,92.316 149.073,92.201 149.672 C 92.019 150.622,90.987 152.019,88.565 154.596 C 88.234 154.948,87.824 155.865,87.652 156.633 C 87.471 157.445,86.935 158.450,86.372 159.031 C 85.753 159.671,85.327 160.514,85.191 161.366 C 85.053 162.229,84.653 163.012,84.060 163.581 C 83.545 164.074,83.051 164.963,82.935 165.604 C 82.672 167.057,82.008 168.378,81.427 168.601 C 81.179 168.696,80.878 169.422,80.760 170.215 C 80.633 171.061,80.170 172.125,79.637 172.795 C 78.724 173.944,78.699 174.057,78.154 179.346 C 77.991 180.928,77.769 181.556,77.177 182.104 C 75.445 183.709,75.434 209.449,77.164 211.325 C 77.820 212.036,77.974 212.675,78.280 215.932 C 78.605 219.397,78.713 219.803,79.560 220.768 C 80.327 221.642,80.524 222.222,80.716 224.168 C 80.906 226.095,81.108 226.697,81.848 227.539 C 82.343 228.104,82.845 229.135,82.963 229.831 C 83.094 230.610,83.529 231.434,84.093 231.974 C 84.673 232.530,85.090 233.336,85.230 234.172 C 85.448 235.479,86.238 236.632,88.649 239.164 C 89.372 239.922,89.848 240.736,89.848 241.212 C 89.848 242.312,96.495 249.638,103.007 255.717 C 104.712 257.308,105.413 257.977,106.133 258.703 C 106.586 259.159,107.511 259.636,108.188 259.762 C 109.342 259.979,109.842 260.353,112.914 263.301 C 113.377 263.746,114.241 264.199,114.832 264.308 C 116.045 264.532,117.259 265.217,117.979 266.084 C 118.247 266.405,119.167 266.797,120.025 266.954 C 121.067 267.144,121.810 267.507,122.263 268.047 C 122.708 268.578,123.418 268.930,124.326 269.073 C 125.156 269.203,126.122 269.650,126.737 270.190 C 127.579 270.929,128.182 271.132,130.096 271.321 C 131.880 271.497,132.647 271.733,133.350 272.325 C 134.506 273.298,135.879 273.697,138.127 273.715 C 140.711 273.735,142.645 274.189,143.219 274.908 C 144.351 276.327,165.862 276.204,167.409 274.771 C 167.854 274.358,168.330 274.021,168.466 274.021 C 171.615 274.021,175.773 273.226,176.794 272.430 C 177.455 271.914,178.545 271.447,179.376 271.324 C 180.368 271.177,181.017 270.859,181.463 270.300 C 181.908 269.742,182.608 269.398,183.701 269.198 C 184.804 268.997,185.500 268.651,185.970 268.073 C 186.432 267.505,187.142 267.147,188.196 266.950 C 189.253 266.752,190.081 266.334,190.807 265.630 C 191.772 264.695,192.086 264.589,194.188 264.483 L 196.506 264.365 199.532 267.437 C 201.196 269.126,202.702 270.642,202.878 270.806 C 203.054 270.970,205.476 273.343,208.262 276.080 C 211.047 278.816,213.434 281.055,213.566 281.055 C 213.698 281.055,213.970 281.415,214.170 281.855 C 214.371 282.294,214.693 282.654,214.887 282.654 C 215.081 282.654,217.351 284.736,219.930 287.281 C 238.377 305.477,237.605 304.669,237.181 305.348 C 236.963 305.697,236.565 306.078,236.298 306.194 C 235.350 306.605,193.060 306.680,126.214 306.388 L 58.503 306.093 55.746 303.255 C 53.851 301.303,52.844 299.988,52.523 299.045 C 52.266 298.291,51.804 297.496,51.496 297.278 C 49.571 295.916,48.369 293.914,48.005 291.465 C 47.769 289.876,47.391 288.684,46.922 288.052 C 45.803 286.540,45.770 284.048,45.539 182.337 C 45.343 95.665,45.366 88.514,45.852 87.773 L 46.378 86.970 153.765 86.970 C 253.266 86.970,261.185 87.009,261.592 87.499 M305.380 87.786 C 305.833 88.018,306.744 88.829,307.404 89.588 C 308.065 90.346,309.005 91.409,309.492 91.949 C 310.343 92.891,310.389 93.114,310.605 97.385 C 310.817 101.592,310.881 101.910,311.743 103.133 C 312.246 103.844,312.757 104.961,312.879 105.615 C 313.254 107.610,315.919 109.913,318.144 110.164 C 320.590 110.439,321.904 110.891,322.426 111.636 C 322.763 112.118,323.543 112.371,325.654 112.683 C 327.972 113.026,328.552 113.232,329.127 113.917 C 329.583 114.461,330.284 114.812,331.201 114.956 C 332.016 115.084,333.003 115.536,333.599 116.054 C 334.156 116.539,335.188 117.040,335.891 117.168 C 336.595 117.295,337.628 117.748,338.188 118.172 C 339.173 118.920,341.807 119.299,341.807 118.694 C 341.807 118.263,343.508 117.442,344.817 117.242 C 345.569 117.126,346.463 116.677,347.055 116.117 C 347.598 115.604,348.566 115.017,349.208 114.812 C 349.849 114.608,350.797 114.051,351.313 113.575 C 351.830 113.099,352.932 112.134,353.763 111.431 C 354.594 110.727,355.649 109.756,356.107 109.273 C 356.565 108.789,357.220 108.393,357.563 108.393 C 358.671 108.393,370.264 119.781,370.264 120.870 C 370.264 121.030,369.844 121.638,369.332 122.222 C 368.819 122.806,368.302 123.808,368.181 124.449 C 368.027 125.275,367.364 126.253,365.913 127.796 C 364.429 129.375,363.731 130.413,363.385 131.559 C 363.121 132.430,362.512 133.553,362.031 134.055 C 360.662 135.484,360.770 140.885,362.197 142.397 C 363.024 143.272,363.174 143.718,363.335 145.773 C 363.499 147.866,363.636 148.261,364.519 149.171 C 365.371 150.050,365.566 150.570,365.852 152.718 C 366.108 154.644,366.362 155.412,366.935 155.988 C 367.704 156.761,367.743 156.848,368.339 159.153 C 368.532 159.900,368.830 160.512,369.002 160.512 C 369.174 160.512,369.573 160.937,369.889 161.457 C 370.437 162.358,372.513 164.613,374.802 166.794 C 375.557 167.513,376.294 167.862,377.377 168.013 C 378.274 168.138,379.272 168.543,379.821 169.004 C 380.664 169.713,381.034 169.785,383.899 169.796 C 387.462 169.808,387.918 169.983,389.572 171.973 L 390.727 173.362 390.727 179.568 L 390.727 185.774 389.312 187.272 C 387.693 188.986,386.753 189.212,381.055 189.262 C 379.341 189.276,377.937 189.396,377.935 189.528 C 377.931 190.043,375.766 191.207,374.813 191.207 C 374.259 191.207,373.621 191.430,373.394 191.702 C 373.167 191.974,372.440 192.718,371.777 193.357 C 370.928 194.175,370.513 194.895,370.368 195.801 C 370.232 196.652,369.802 197.445,369.094 198.154 C 368.445 198.802,368.026 199.540,368.026 200.032 C 368.026 201.033,367.521 202.021,366.538 202.942 C 366.026 203.422,365.787 204.004,365.787 204.770 C 365.787 205.573,365.501 206.219,364.783 207.037 C 363.768 208.193,363.270 209.818,363.243 212.059 C 363.233 212.922,362.980 213.502,362.318 214.179 C 360.635 215.901,360.606 221.206,362.270 223.022 C 362.811 223.612,363.229 224.515,363.357 225.367 C 363.506 226.355,363.837 226.982,364.511 227.549 C 365.066 228.016,365.602 228.895,365.810 229.680 C 366.005 230.414,366.421 231.303,366.735 231.655 C 367.769 232.812,368.026 233.663,368.026 235.930 L 368.026 238.170 364.109 242.135 C 359.686 246.612,359.623 246.643,355.377 246.316 C 352.895 246.125,352.623 246.032,351.430 244.958 C 348.964 242.740,348.007 242.099,346.829 241.878 C 346.176 241.755,345.118 241.239,344.479 240.732 C 343.075 239.616,336.642 239.280,336.250 240.302 C 335.991 240.977,334.342 241.605,332.131 241.871 C 330.845 242.026,329.995 242.341,329.314 242.914 C 328.777 243.366,327.666 243.861,326.844 244.014 C 325.935 244.184,325.066 244.599,324.626 245.073 C 323.979 245.771,322.167 246.516,321.106 246.521 C 320.887 246.522,320.333 246.944,319.874 247.459 C 319.338 248.061,318.590 248.472,317.785 248.608 C 316.429 248.837,313.896 250.773,312.531 252.624 C 312.103 253.203,311.591 253.778,311.393 253.900 C 310.927 254.188,310.511 258.220,310.489 262.659 L 310.472 266.165 308.965 267.695 L 307.458 269.225 300.209 269.225 L 292.960 269.225 291.359 267.607 L 289.758 265.989 289.642 260.142 L 289.526 254.296 288.408 253.146 C 287.793 252.513,287.146 251.845,286.970 251.662 C 284.838 249.435,283.270 248.441,281.887 248.441 C 281.487 248.441,280.785 248.020,280.326 247.504 C 279.729 246.834,279.072 246.504,278.021 246.347 C 277.021 246.197,276.256 245.831,275.626 245.202 C 275.118 244.693,274.225 244.186,273.642 244.076 C 271.937 243.752,271.508 243.396,271.100 241.961 C 270.888 241.217,270.469 240.320,270.169 239.968 C 268.927 238.511,268.905 238.235,268.905 224.185 C 268.905 208.276,268.962 207.981,271.552 210.391 C 273.731 212.419,274.957 213.290,276.298 213.763 C 277.063 214.033,278.056 214.605,278.504 215.035 C 278.953 215.464,279.818 215.908,280.427 216.020 C 281.647 216.246,282.937 216.953,283.494 217.703 C 283.729 218.020,284.713 218.270,286.333 218.424 C 288.554 218.637,288.928 218.772,289.908 219.722 L 291.003 220.783 300.836 220.783 C 311.407 220.783,310.501 220.904,312.897 219.180 C 313.263 218.917,314.595 218.571,315.856 218.413 C 318.242 218.113,319.041 217.670,321.489 215.292 C 322.063 214.734,323.164 214.107,323.935 213.900 C 324.705 213.692,325.769 213.105,326.297 212.595 C 332.863 206.256,334.755 204.073,335.568 201.895 C 335.921 200.947,336.518 199.957,336.893 199.694 C 337.339 199.382,337.651 198.712,337.794 197.756 C 337.931 196.842,338.348 195.913,338.910 195.270 C 339.642 194.434,339.874 193.747,340.169 191.546 C 340.421 189.666,340.722 188.644,341.162 188.175 C 342.644 186.597,342.679 169.955,341.203 168.384 C 340.636 167.780,340.393 166.991,340.146 164.941 C 339.877 162.721,339.671 162.108,338.899 161.228 C 338.371 160.626,337.887 159.626,337.769 158.893 C 337.652 158.159,337.295 157.422,336.936 157.170 C 336.212 156.663,335.562 155.513,335.267 154.218 C 334.913 152.664,327.860 145.613,326.228 145.181 C 325.309 144.938,324.607 144.470,324.031 143.715 C 323.566 143.105,323.014 142.606,322.804 142.606 C 322.594 142.606,322.024 142.191,321.538 141.684 C 320.989 141.111,320.183 140.686,319.408 140.562 C 318.719 140.452,317.694 139.954,317.115 139.449 C 316.268 138.710,315.637 138.489,313.829 138.299 C 311.424 138.046,310.729 137.790,309.567 136.731 C 308.670 135.913,290.998 135.639,290.731 136.439 C 290.469 137.225,288.513 138.063,286.444 138.275 C 284.745 138.449,284.116 138.674,283.305 139.398 C 282.748 139.895,281.680 140.457,280.932 140.645 C 280.183 140.833,279.195 141.316,278.736 141.717 C 278.277 142.118,277.210 143.022,276.366 143.725 C 275.521 144.428,274.383 145.475,273.836 146.051 C 273.289 146.627,272.423 147.224,271.912 147.377 C 271.401 147.530,270.741 147.754,270.445 147.874 C 268.981 148.471,268.869 147.193,268.970 131.113 L 269.065 116.128 270.644 114.521 C 272.186 112.950,272.277 112.908,274.591 112.691 C 276.583 112.504,277.103 112.328,277.867 111.582 C 278.428 111.034,279.271 110.622,280.074 110.503 C 280.790 110.398,281.951 110.227,282.655 110.124 C 283.705 109.969,284.369 109.506,286.347 107.547 C 289.281 104.641,289.283 104.636,289.548 99.544 C 289.756 95.546,290.001 94.612,291.141 93.467 C 291.349 93.259,291.614 92.491,291.730 91.761 C 292.000 90.073,294.155 87.684,295.770 87.282 C 297.315 86.897,304.367 87.267,305.380 87.786 M161.495 127.527 C 162.031 128.190,162.511 128.311,165.682 128.584 C 168.945 128.864,171.063 129.485,171.063 130.161 C 171.063 130.357,173.702 130.821,177.346 131.265 C 178.497 131.406,179.211 131.698,179.716 132.235 C 180.113 132.658,180.955 133.094,181.586 133.204 C 182.826 133.421,183.856 133.976,184.834 134.953 C 185.173 135.293,185.883 135.572,186.410 135.572 C 187.051 135.572,187.768 135.932,188.576 136.663 C 189.259 137.279,190.302 137.851,190.976 137.977 C 192.442 138.252,194.503 140.088,202.978 148.665 C 211.541 157.333,211.347 157.115,211.725 158.482 C 212.065 159.712,212.752 160.711,214.909 163.107 C 215.709 163.996,216.124 164.808,216.247 165.723 C 216.373 166.657,216.703 167.287,217.365 167.857 C 218.176 168.553,218.351 169.005,218.630 171.117 C 218.886 173.063,219.152 173.823,219.914 174.794 C 220.709 175.809,220.912 176.429,221.095 178.405 C 221.270 180.302,221.464 180.928,222.044 181.465 C 224.063 183.337,224.265 211.061,222.281 213.871 C 221.201 215.400,220.953 216.010,220.948 217.146 C 220.940 219.152,220.567 220.302,219.644 221.174 C 219.012 221.771,218.688 222.462,218.542 223.528 C 218.406 224.515,218.070 225.285,217.569 225.755 C 217.149 226.150,216.589 227.214,216.326 228.120 C 216.063 229.025,215.493 230.099,215.060 230.505 C 214.627 230.912,214.182 231.785,214.070 232.446 C 213.942 233.204,213.400 234.166,212.603 235.049 C 211.908 235.820,211.111 236.717,210.833 237.043 C 210.554 237.368,209.622 238.413,208.760 239.364 C 207.781 240.446,207.194 241.388,207.194 241.878 C 207.194 243.056,199.606 250.598,197.910 251.105 C 197.186 251.322,195.750 252.298,194.493 253.427 C 192.987 254.779,191.958 255.444,191.125 255.600 C 190.465 255.724,189.674 256.080,189.367 256.393 C 189.060 256.705,188.305 257.306,187.690 257.728 C 187.074 258.151,186.323 258.805,186.021 259.182 C 185.596 259.713,184.972 259.917,183.255 260.086 C 181.423 260.266,180.797 260.489,179.648 261.369 C 178.478 262.264,177.916 262.459,176.110 262.594 C 174.404 262.721,173.758 262.926,172.968 263.591 C 171.757 264.610,171.631 264.637,166.362 265.009 C 162.493 265.281,162.056 265.376,161.141 266.146 L 160.143 266.986 154.117 266.986 C 148.107 266.986,148.088 266.984,147.111 266.162 C 146.217 265.410,145.722 265.304,141.411 264.948 C 136.869 264.572,135.484 264.215,134.762 263.238 C 134.563 262.968,133.485 262.701,132.037 262.563 C 130.140 262.381,129.404 262.152,128.499 261.462 C 127.871 260.983,126.670 260.384,125.830 260.131 C 124.991 259.879,123.997 259.388,123.623 259.041 C 123.248 258.694,122.358 258.256,121.645 258.067 C 120.933 257.878,119.866 257.291,119.275 256.764 C 118.684 256.236,117.685 255.714,117.054 255.603 C 116.338 255.478,115.475 254.965,114.756 254.240 C 114.123 253.601,112.914 252.502,112.069 251.799 C 107.219 247.759,96.871 236.715,96.381 235.054 C 96.018 233.825,94.135 231.138,92.878 230.056 C 92.424 229.665,92.053 228.890,91.924 228.062 C 91.793 227.228,91.363 226.334,90.804 225.735 C 89.887 224.754,89.742 224.321,89.359 221.433 C 89.232 220.471,88.851 219.491,88.392 218.946 C 87.583 217.985,87.482 217.565,86.980 213.110 C 86.789 211.409,86.480 210.101,86.226 209.912 C 85.122 209.092,85.052 208.291,85.052 196.528 L 85.052 184.861 85.877 183.881 C 86.688 182.917,86.812 182.377,87.482 176.900 C 87.577 176.130,87.982 175.147,88.417 174.629 C 88.840 174.127,89.282 173.115,89.400 172.380 C 89.517 171.645,90.015 170.539,90.507 169.920 C 91.335 168.878,92.086 166.503,92.086 164.928 C 92.086 164.561,92.626 163.656,93.285 162.919 C 95.719 160.195,96.199 159.519,96.418 158.508 C 96.617 157.588,97.344 156.599,99.900 153.776 C 100.308 153.325,100.749 152.472,100.879 151.880 C 101.166 150.572,108.873 142.609,109.859 142.601 C 110.707 142.594,112.689 141.167,114.662 139.143 C 115.061 138.734,116.075 138.192,116.914 137.939 C 117.754 137.687,118.826 137.111,119.297 136.659 C 119.768 136.208,120.767 135.701,121.516 135.533 C 122.266 135.364,123.301 134.872,123.817 134.438 C 124.333 134.004,125.403 133.485,126.196 133.286 C 126.988 133.086,128.052 132.573,128.561 132.145 C 129.361 131.472,131.918 130.815,133.870 130.782 C 134.077 130.778,134.437 130.586,134.669 130.354 C 135.809 129.219,136.844 128.885,140.163 128.581 C 142.849 128.335,143.790 128.123,144.319 127.642 C 145.395 126.664,145.546 126.649,153.426 126.716 C 160.830 126.778,160.894 126.784,161.495 127.527 M304.776 147.162 L 304.876 148.201 308.153 148.293 C 311.118 148.375,311.431 148.441,311.431 148.986 C 311.431 150.416,311.725 150.600,314.023 150.600 L 316.227 150.600 316.227 151.719 L 316.227 152.838 318.446 152.838 L 320.665 152.838 320.764 154.037 C 320.854 155.126,320.956 155.245,321.884 155.335 C 322.772 155.421,322.917 155.565,323.003 156.454 C 323.088 157.337,323.236 157.487,324.101 157.571 C 325.075 157.666,325.107 157.720,325.325 159.646 C 325.559 161.711,325.824 162.097,327.018 162.105 C 327.626 162.110,327.738 162.283,327.738 163.229 C 327.738 164.293,327.793 164.349,328.846 164.349 L 329.954 164.349 330.045 167.786 L 330.136 171.223 331.175 171.323 L 332.214 171.423 332.214 179.376 L 332.214 187.330 331.175 187.430 C 330.230 187.521,330.127 187.637,330.038 188.710 C 329.949 189.779,329.843 189.900,328.919 189.989 L 327.898 190.088 327.803 192.246 L 327.709 194.404 326.619 194.404 C 325.629 194.404,325.509 194.506,325.322 195.505 C 325.159 196.377,324.929 196.647,324.221 196.803 C 323.512 196.958,323.283 197.228,323.119 198.100 C 322.941 199.048,322.787 199.201,322.002 199.201 C 321.077 199.201,320.703 199.668,320.703 200.826 C 320.703 201.289,320.477 201.439,319.778 201.439 C 318.838 201.439,318.465 201.900,318.465 203.064 C 318.465 203.552,318.236 203.677,317.346 203.677 C 316.280 203.677,316.227 203.730,316.227 204.796 L 316.227 205.915 314.388 205.920 C 312.249 205.926,311.925 206.085,311.634 207.274 C 311.440 208.068,311.282 208.153,310.007 208.153 C 307.933 208.153,306.954 208.612,306.954 209.584 L 306.954 210.392 300.126 210.392 L 293.298 210.392 293.001 209.353 L 292.703 208.313 289.437 208.222 L 286.171 208.131 286.171 207.023 C 286.171 205.979,286.109 205.915,285.098 205.915 C 284.162 205.915,283.988 205.783,283.729 204.876 C 283.439 203.864,283.381 203.834,281.463 203.742 C 279.505 203.648,279.494 203.642,279.396 202.623 C 279.306 201.694,279.186 201.590,278.116 201.501 C 277.006 201.408,276.929 201.331,276.837 200.222 C 276.748 199.151,276.643 199.032,275.714 198.942 L 274.689 198.842 274.595 196.703 L 274.500 194.564 273.461 194.464 L 272.422 194.364 272.418 191.746 C 272.412 188.194,272.249 187.690,271.106 187.690 L 270.184 187.690 270.184 178.483 L 270.184 169.277 271.223 168.971 L 272.262 168.665 272.353 165.407 L 272.444 162.149 273.472 162.050 L 274.500 161.950 274.595 159.811 L 274.689 157.672 275.714 157.573 C 276.607 157.487,276.751 157.343,276.837 156.453 C 276.927 155.528,277.048 155.423,278.116 155.334 C 279.229 155.241,279.302 155.167,279.396 154.037 L 279.495 152.838 281.520 152.838 C 283.624 152.838,283.933 152.632,283.933 151.227 C 283.933 150.711,284.229 150.616,286.091 150.534 L 288.249 150.440 288.349 149.411 L 288.448 148.383 291.866 148.292 L 295.284 148.201 295.384 147.162 L 295.484 146.123 300.080 146.123 L 304.676 146.123 304.776 147.162 M163.074 158.332 C 161.533 159.999,161.151 161.074,161.151 163.743 C 161.151 164.298,160.767 165.083,160.155 165.781 C 159.309 166.744,159.133 167.241,158.993 169.069 C 158.830 171.187,158.215 172.982,157.650 172.982 C 157.260 172.982,156.768 174.681,156.517 176.902 C 156.371 178.189,156.067 179.031,155.506 179.696 C 154.919 180.395,154.620 181.269,154.388 182.970 C 154.084 185.196,153.532 186.523,152.622 187.210 C 152.372 187.400,152.113 188.559,151.988 190.055 C 151.807 192.221,151.645 192.729,150.851 193.634 C 150.075 194.517,149.895 195.060,149.733 196.990 C 149.569 198.946,149.395 199.458,148.577 200.390 C 147.755 201.326,147.586 201.828,147.423 203.813 C 147.259 205.816,147.095 206.296,146.239 207.271 C 145.385 208.244,145.214 208.742,145.019 210.825 C 144.834 212.797,144.624 213.458,143.893 214.378 C 143.090 215.388,142.970 215.858,142.764 218.786 C 142.520 222.251,142.287 223.026,141.244 223.856 C 140.662 224.320,140.581 224.843,140.438 229.074 C 140.295 233.289,140.203 233.887,139.550 234.848 C 138.830 235.910,138.829 235.926,139.446 236.485 C 139.790 236.796,140.247 237.419,140.463 237.869 C 141.005 239.000,141.345 238.913,143.130 237.185 C 146.006 234.402,146.453 233.654,146.952 230.796 C 147.285 228.889,147.621 227.939,148.173 227.351 C 148.755 226.731,149.013 225.942,149.263 224.021 C 149.537 221.919,149.747 221.339,150.535 220.504 C 151.175 219.826,151.535 219.056,151.653 218.110 C 151.762 217.241,152.127 216.397,152.622 215.872 C 153.284 215.169,154.117 212.063,154.117 210.294 C 154.117 210.220,154.529 209.641,155.034 209.006 C 155.766 208.084,155.996 207.397,156.173 205.592 C 156.355 203.746,156.563 203.142,157.308 202.294 C 158.041 201.459,158.290 200.756,158.573 198.720 C 158.846 196.761,159.105 195.997,159.716 195.360 C 160.253 194.799,160.563 194.029,160.686 192.951 C 161.050 189.746,161.201 189.260,162.126 188.314 C 162.935 187.485,163.070 187.102,163.070 185.621 C 163.070 183.625,163.466 182.399,164.450 181.350 C 164.969 180.797,165.243 179.897,165.519 177.844 C 165.805 175.706,166.042 174.957,166.562 174.536 C 167.078 174.118,167.309 173.404,167.548 171.488 C 168.005 167.826,168.164 167.213,169.058 165.660 C 169.772 164.418,169.872 163.863,169.906 160.919 C 169.952 156.893,169.784 156.675,166.654 156.675 L 164.606 156.675 163.074 158.332 M126.640 171.840 C 126.228 172.278,125.358 172.711,124.647 172.831 C 123.437 173.035,119.265 176.120,119.265 176.810 C 119.265 176.960,118.672 177.182,117.948 177.304 C 117.118 177.445,116.189 177.927,115.432 178.612 C 114.771 179.208,114.136 179.696,114.020 179.696 C 113.904 179.696,113.381 180.184,112.858 180.780 C 112.235 181.489,111.492 181.941,110.709 182.088 C 109.469 182.319,106.848 184.458,102.192 189.038 C 100.979 190.231,99.800 191.207,99.572 191.207 C 99.344 191.207,98.938 191.519,98.671 191.901 C 98.403 192.283,97.600 192.895,96.886 193.260 C 96.172 193.626,94.383 195.076,92.912 196.483 L 90.237 199.041 94.098 202.794 C 97.145 205.756,98.199 206.590,99.099 206.748 C 99.812 206.873,100.667 207.384,101.381 208.110 C 104.677 211.468,107.035 213.392,108.343 213.792 C 109.200 214.053,110.573 214.961,111.923 216.158 C 113.459 217.520,114.462 218.157,115.280 218.289 C 116.003 218.407,116.831 218.872,117.456 219.512 C 118.151 220.224,118.904 220.619,119.876 220.781 C 120.802 220.936,121.571 221.322,122.114 221.906 C 122.670 222.503,123.414 222.869,124.380 223.022 C 125.172 223.148,126.275 223.593,126.833 224.012 C 127.390 224.431,127.894 224.662,127.952 224.525 C 128.010 224.389,128.642 223.812,129.357 223.244 C 130.570 222.280,130.645 222.127,130.476 220.960 C 130.246 219.364,126.144 214.938,124.012 213.984 C 123.248 213.642,122.348 213.054,122.013 212.676 C 121.678 212.299,121.234 211.990,121.026 211.990 C 120.819 211.990,119.582 210.990,118.278 209.768 C 116.489 208.091,115.608 207.494,114.690 207.338 C 113.907 207.206,113.041 206.715,112.266 205.964 C 109.821 203.596,109.119 203.083,108.049 202.880 C 106.473 202.581,105.846 202.002,105.364 200.401 L 104.939 198.988 106.865 197.256 C 107.924 196.303,110.392 193.981,112.349 192.096 C 118.500 186.172,120.810 184.173,121.504 184.173 C 121.916 184.173,124.488 182.279,125.742 181.053 C 130.593 176.311,131.504 174.563,130.492 171.942 C 130.019 170.721,127.748 170.660,126.640 171.840 M179.720 173.417 C 178.860 175.024,179.484 178.017,180.977 179.452 C 181.679 180.127,182.254 180.808,182.254 180.966 C 182.254 181.123,182.506 181.332,182.814 181.431 C 183.122 181.529,184.812 183.050,186.571 184.810 C 188.874 187.116,190.101 188.102,190.957 188.339 C 191.726 188.552,192.927 189.427,194.359 190.817 C 195.577 191.999,197.241 193.541,198.058 194.245 C 199.866 195.801,202.516 198.490,202.672 198.927 C 202.735 199.102,200.936 201.036,198.675 203.224 C 196.414 205.412,194.060 207.695,193.445 208.298 C 192.798 208.930,191.784 209.519,191.046 209.690 C 189.687 210.006,187.921 211.493,182.349 217.014 C 179.071 220.263,178.761 221.089,179.847 223.688 L 180.317 224.813 181.258 224.117 C 181.854 223.677,183.152 223.269,184.795 223.006 C 186.900 222.669,187.602 222.404,188.511 221.607 C 189.127 221.066,189.816 220.624,190.043 220.624 C 190.269 220.624,191.163 220.120,192.029 219.504 C 192.895 218.889,193.721 218.385,193.865 218.385 C 194.010 218.385,194.594 217.918,195.164 217.346 C 197.537 214.966,198.838 213.988,199.896 213.790 C 200.682 213.642,201.689 212.937,203.273 211.426 C 204.514 210.242,206.120 208.769,206.842 208.153 C 207.564 207.538,208.701 206.513,209.369 205.875 C 210.037 205.237,211.031 204.617,211.578 204.497 C 212.672 204.256,215.404 201.587,216.271 199.910 L 216.794 198.898 215.581 198.279 C 214.914 197.938,214.177 197.303,213.943 196.867 C 213.710 196.431,213.199 195.903,212.809 195.694 C 212.418 195.485,211.850 194.893,211.547 194.379 C 211.243 193.866,210.884 193.445,210.749 193.445 C 210.614 193.445,209.425 192.402,208.107 191.127 C 206.789 189.852,205.433 188.564,205.093 188.265 C 204.754 187.967,204.333 187.572,204.157 187.389 C 201.503 184.629,198.622 182.277,197.678 182.100 C 197.033 181.979,196.081 181.405,195.379 180.715 C 191.255 176.657,189.503 175.258,188.291 175.053 C 187.509 174.921,186.664 174.464,186.032 173.832 C 184.576 172.377,180.423 172.104,179.720 173.417 M216.418 250.656 C 217.291 250.825,218.131 251.266,218.677 251.841 C 219.155 252.345,220.748 253.837,222.218 255.156 C 223.688 256.475,227.347 260.015,230.351 263.024 C 234.250 266.930,236.144 268.602,236.973 268.872 C 237.958 269.192,243.603 274.272,244.015 275.209 C 244.075 275.347,244.988 276.251,246.043 277.218 C 247.249 278.323,248.159 279.484,248.493 280.342 C 248.851 281.263,250.101 282.788,252.330 285.022 C 254.148 286.845,257.146 289.947,258.993 291.915 C 260.839 293.883,263.314 296.487,264.492 297.701 C 265.833 299.084,266.751 300.336,266.949 301.052 C 267.123 301.680,267.789 302.798,268.429 303.535 C 269.070 304.273,269.942 305.274,270.368 305.761 C 271.345 306.876,271.346 307.623,270.375 308.777 C 269.953 309.279,269.445 310.291,269.247 311.026 C 268.708 313.031,267.263 313.492,263.020 313.012 C 260.759 312.757,260.387 312.616,259.492 311.679 C 256.506 308.554,251.530 304.315,250.520 304.036 C 249.210 303.674,229.573 284.528,211.535 266.025 L 207.082 261.457 206.863 259.026 C 206.600 256.114,206.643 256.026,209.940 252.740 C 212.555 250.134,212.990 249.994,216.418 250.656 " stroke="none" fill-rule="evenodd"></path></g></svg>
            </button>
            <ol class="menu">
                <li><button name="load" class="btn-octicon">${l10n.get('settings.loadButton.text')}</button></li>
                <li class="edit-mode-enabled-only"><button name="save" class="btn-octicon">${l10n.get('settings.saveButton.text')}</button></li>
                <li class="divider">
                <li><button name="import" class="btn-octicon">${l10n.get('settings.importButton.text')}</button></li>
                <li><button name="export" class="btn-octicon">${l10n.get('settings.exportButton.text')}</button></li>
                <li class="divider edit-mode-possible-visible-only">
                <li class="edit-mode-possible-visible-only"><button name="edit" class="btn-octicon" title="${l10n.get('settings.editButton.title')}">📝</button>
                    <button name="view" class="btn-octicon" title="${l10n.get('settings.viewButton.title')}">👁</button></li>
            </ol>
            <dialog name="import">
                <div class="title">${l10n.get('settings.importDialog.title.text')}</div>
                <div class="content">
                    <textarea placeholder="${l10n.get('settings.importDialog.textarea.placeholder')}"></textarea>
                    <div class="error"></div>
                </div>
                <div class="button-bar">
                    <button name="accept" class="btn">${l10n.get('settings.importDialog.acceptButton.text')}</button>
                    <button name="cancel" class="btn">${l10n.get('settings.importDialog.cancelButton.text')}</button>
                </div>
            </dialog>
            <dialog name="export">
                <div class="title">${l10n.get('settings.exportDialog.title.text')}</div>
                <div class="content">
                    <textarea readonly></textarea>
                </div>
                <div class="button-bar">
                    <button name="close" class="btn">${l10n.get('settings.exportDialog.closeButton.text')}</button>
                </div>
            </dialog>
        `;

        this.rootElem.querySelector('button[name="settings"]').addEventListener('click', e => {
            e.stopPropagation();
            this.rootElem.classList.toggle('visible');
        });
        this.rootElem.addEventListener('click', _ => {
            this.rootElem.classList.remove('visible');
        });

        this.rootElem.querySelectorAll('.menu button[name="edit"],button[name="view"]').forEach(x => x.addEventListener('click', _ => {
            this.events.dispatchEvent(new CustomEvent('toggleEditMode'));
        }));

        this.rootElem.querySelector('.menu button[name="load"]').addEventListener('click', _ => {
            this.events.dispatchEvent(new CustomEvent('load'));
        });
        this.rootElem.querySelector('.menu button[name="save"]').addEventListener('click', _ => {
            this.events.dispatchEvent(new CustomEvent('save'));
        });
        {
            const dialog = this.rootElem.querySelector('dialog[name="import"]');
            const error = dialog.querySelector('.error');
            const textarea = dialog.querySelector('textarea');

            this.rootElem.querySelector('.menu button[name="import"]').addEventListener('click', _ => {
                error.innerText = '';
                textarea.value = '';

                dialog.showModal();
            });
            dialog.querySelector('button[name="accept"]').addEventListener('click', async _ => {
                error.innerText = '';

                let json;
                try {
                    json = JSON.parse(textarea.value);
                } catch (e) {
                    error.innerText = `${l10n.get('settings.importDialog.errors.invalidJson.text')}${e}`;
                    return;
                }
                const detail = {
                    data: json,
                    promise: Promises.create()
                };
                this.events.dispatchEvent(new CustomEvent('import', { detail }));

                try {
                    await detail.promise;
                    dialog.close();
                } catch (e) {
                    console.error(e);
                    error.innerText = `${l10n.get('settings.importDialog.errors.importFailed.text')}${e}`;
                }
            });
            dialog.querySelector('button[name="cancel"]').addEventListener('click', _ => {
                dialog.close();
            });
        }
        {
            const dialog = this.rootElem.querySelector('dialog[name="export"]');
            const textarea = dialog.querySelector('textarea');

            this.rootElem.querySelector('.menu button[name="export"]').addEventListener('click', _ => {
                textarea.value = '';

                const detail = {
                    setExportData: d => detail.data = d
                };
                this.events.dispatchEvent(new CustomEvent('export', { detail }));
                textarea.value = JSON.stringify(detail.data, null, 2);
                dialog.showModal();
            });
            dialog.querySelector('button[name="close"]').addEventListener('click', _ => {
                dialog.close();
            });
        }
    }

    setEditMode(e) {
        this.rootElem.querySelector('button[name="edit"]').click();
    }
}


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