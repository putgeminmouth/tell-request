'use strict';

import { GithubApi, PullRequestPage } from './github.js';
import { Opt, Promises, Try, Util, Element } from './common.js';

const APP_UUID = 'cc91a745-d35c-466f-9047-3f20031fb4ae';
const MAGIC = `----${APP_UUID}----`;
//----cc91a745-d35c-466f-9047-3f20031fb4ae----
//{"navigationOrder": 1}

const parseComment = c => {
    const PARSE_REGEX = new RegExp(`^(?<before>.*?)(?:<!--\\s*)?(?:${MAGIC})(?<data>.*)(?:${MAGIC})(?:\\s*-->)?(?<after>.*)$`, 'gs');
    let { value: matches } = c.matchAll(PARSE_REGEX)?.next();
    if (!matches)
        return;

    const body = matches.groups.data;
    const rest = matches.groups.before + matches.groups.after;
    const j = Try(() => JSON.parse(body));
    if (!j) return;
    return {
        data: j,
        comment: rest
    };
};

const renderComment = c => {
    return c.comment + ((!c.comment.length || /\s$/.test(c.comment)) ? '' : '\n') + '<!-- ' + MAGIC + JSON.stringify(c.data, null, 2) + MAGIC + ' -->';
};

class Ids {
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

class Comment extends Visual {
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

class File {

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

class FileContext {
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

class Presentation {
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

        this.events.dispatchEvent(new CustomEvent('change', { detail: { added: [visual], removed: removed } }));
    }

    moveVisual({ id, position }) {
        const visual = this.visuals.find(x => x.id === id);
        const oldIndex = this.indexOf({ id });

        this.visuals.splice(oldIndex, 1);
        this.visuals.splice(position, 0, visual);

        this.events.dispatchEvent(new CustomEvent('change', { detail: { added: [visual], removed: [visual] } }));
    }

    findByLineNo(filename, lineNo) {
        return this.visuals.find(x => x.context.file.filename === filename && x.context.lineNo === lineNo);
    }

    indexOf({ id }) {
        if (id) return this.visuals.findIndex(x => x.id === id);
        return -1;
    }

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
        this.events.dispatchEvent(new CustomEvent('change', { detail: { added, removed } }));
    }
}

class VisualUI {
    constructor(rootElem) {
        this.rootElem = rootElem;
    }
}
class CommentUI extends VisualUI {
    constructor({ github, prPage, fileElem, context, value }) {
        super(Util.createElement(`<tr class="${MAGIC} visual-root">`));
        this.github = github;
        this.prPage = prPage;
        this.fileElem = fileElem;
        this.events = Util.createEventTarget();
        this.currentValue = value || new Comment({ context, text: '' });

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
                        <button type="button" name="save" class="btn btn-primary">Save</button>
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
        const tr = this.tr = this.rootElem;
        tr.setAttribute('data-visual-id', this.currentValue.id);
        tr.append(td);

        tr.data = { visualUI: this };
        const textarea = this.textarea = tr.querySelector('textarea');
        textarea.value = this.currentValue.text;
        const previewButton = this.previewButton = tr.querySelector('button[name="preview"]');
        const writeButton = this.writeButton = tr.querySelector('button[name="write"]');

        writeButton.addEventListener('click', e => this.onWriteClick(e));

        tr.querySelector('button[name="cancel"]').addEventListener('click', e => this.onCancelClick(e));

        tr.querySelector('button[name="save"]').addEventListener('click', e => this.onSaveClick(e));

        tr.querySelector('button[name="preview"]').addEventListener('click', e => this.onPreviewClick(e));

        tr.querySelectorAll('.tabnav-tabs>button').forEach(button => {
            const name = button.name;
            button.addEventListener('click', e => {
                tr.querySelectorAll(`.tabnav-tabs>button,.tabnav-tabs,.tabnav-content`).forEach(x => {
                    x.classList.remove('selected');
                });
                tr.querySelectorAll(`.tabnav-tabs>button[name="${name}"],.tabnav-content[name="${name}"]`).forEach(x => {
                    x.classList.add('selected');
                });
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
        this.tr.querySelector('button[name="preview"]').click();
    }

    async onSaveClick() {
        const text = this.textarea.value;
        this.currentValue.text = text;

        const detail = {
            comment: this.currentValue,
            _promises: [],
            promise() {
                const p = Promises.create();
                detail._promises.push(p);
                return p;
            }
        };
        this.disable();
        try {
            this.events.dispatchEvent(new CustomEvent('save', { detail }));
            await Promise.all(detail._promises);
        } finally {
            this.enable();
        }
        this.tr.querySelector('button[name="preview"]').click();
    }

    onWriteClick() {
        setTimeout(() => this.textarea.focus()); // no idea why timeout
    }

    async onPreviewClick() {
        if (this.textarea.value === this.previousPreviewValue) return; // avoid api calls
        const text = this.textarea.value;
        const commentId = this.prPage.getRandomCommentId();
        const rendered = await this.github.renderMarkdown({ authenticityToken: await this.github.pullFiles.fetchCommentCsrfToken(commentId), text });
        this.tr.querySelector('.comment-body').innerHTML = rendered;
        this.previousPreviewValue = text;
    }

    enable() {
        this.tr.querySelectorAll('input,button,textarea').forEach(x => x.disabled = false);
    }

    disable() {
        this.tr.querySelectorAll('input,button,textarea').forEach(x => x.disabled = true);
    }
}

class SidebarUI {
    constructor() {
        const sidebar = this.sidebar = Util.createElement(`
            <div class="${MAGIC} sidebar">
                <div class="header">
                    <div class="toolbar navbar">
                        <button name="prev" class="toolbar-item btn-octicon">◀</button>
                        <button name="next" class="toolbar-item btn-octicon">▶</button>
                    </div>
                </div>
                <ol>
                    <li>
                        <div class="marker marker-rail">⭥</div>
                        <div></div>
                    </li>
                </ol>
            </div>
        `);
        const list = this.list = sidebar.querySelector('ol');
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
        this.events = Util.createEventTarget();

        this.list.append(this.createDropTarget());
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
                    <button name="select" class="btn-octicon">⌖</button>
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
        const selectButton = item.querySelector('button[name="select"]');

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
        selectButton.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('select', { detail: { id: item.data.id } }));
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

class App {
    constructor({ github, prPage }) {
        this.github = github;
        this.prPage = prPage;
        this.events = Util.createEventTarget();
        this.presentation = new Presentation();

        this.files = [];

        this.presentation.events.addEventListener('change', e => this.onPresentationChange(e));
        this.events.addEventListener('select', e => this.onSelect(e));
    }

    async init(document) {
        const sidebar = this.sidebar = new SidebarUI();
        document.querySelector('[data-target="diff-layout.mainContainer"].Layout-main').after(sidebar.sidebar);
        sidebar.events.addEventListener('navTo', e => this.onSidebarNav(e));
        sidebar.events.addEventListener('select', e => this.onSidebarSelect(e));
        sidebar.events.addEventListener('reorder', e => this.onSidebarReorder(e));

        this.initAddVisualButtons();

        const issueForm = await this.github.issue.fetchIssueEditForm(this.prPage.getPullId());
        const currentValue = issueForm.editForm.querySelector('textarea').value;
        const parsed = parseComment(currentValue);
        this.import(parsed.data);
    }

    import(data) {
        const getAllIds = (o) => {
            if (o?.id) return o?.id;
            return Object.values(o).flatMap(v => {
                if (Array.isArray(v))
                    return v.flatMap(getAllIds);
                if (typeof (v) === 'object')
                    return getAllIds(v);
                return [];
            });
        };

        const maxId = getAllIds(data).map(x => parseInt(x)).toArray().sort((a, b) => b - a).first();
        Ids.initId(maxId);
        this.presentation.import(data);

        this.presentation.visuals.forEach(v => {
            const lineNo = v.context.lineNo;
            const fileElem = document.querySelector(`div[data-tagsearch-path="${v.context.file.filename}"].file`);
            const commentUI = this.createCommentUI({ fileElem, context: v.context, value: v });
            document.querySelector(`[data-tagsearch-path] [data-line-number="${lineNo}"]`)
                .ancestors(x => x.tagName === 'TR')
                .first()
                .after(commentUI.tr);
            commentUI.previewButton.click(); // todo: don't cause initial focus
        });
    }

    export() {
        return this.presentation.export();
    }

    async persist() {
        const currentValue = (await this.github.issue.fetchIssueEditForm(this.prPage.getPullId())).editForm.querySelector('textarea').value;
        const currentParsed = parseComment(currentValue) || { comment: currentValue, data: {} };
        currentParsed.data = this.export();
        await this.github.issue.updateIssuePart({ part: 'body', text: renderComment(currentParsed) });
    }

    createCommentUI({ fileElem, context, value }) {
        const commentUI = new CommentUI({ github: this.github, prPage: this.prPage, fileElem, context, value });
        commentUI.events.addEventListener('save', async e => {
            const { comment } = e.detail;
            const promise = e.detail.promise();
            try {
                this.presentation.addOrReplaceVisual({ visual: comment });
                await this.persist();
            } finally {
                promise.resolve();
            }
        });

        commentUI.tr.addEventListener('focusin', _ => {
            this.selectVisual(value.id);
        });
        commentUI.tr.addEventListener('click', _ => {
            this.selectVisual(value.id);
        });
        return commentUI;
    }

    initAddVisualButtons() {

        const createButton = ({ file, fileElem, originalButton }) => {
            const lineNo = originalButton.ancestors('td').first().previousElementSibling.getAttribute('data-line-number');
            const context = new FileContext({ file, lineNo });

            const addButton = document.createElement('button');
            addButton.classList.add('add-line-comment');
            addButton.classList.add('btn-link');
            addButton.innerHTML = originalButton.innerHTML;
            addButton.style.backgroundColor = 'red';
            addButton.style.left = '20px';
            originalButton.parentElement.prepend(addButton)

            addButton.addEventListener('click', async e => {
                const commentUI = this.createCommentUI({ fileElem, context, value: new Comment({ context }) });

                originalButton.ancestors().filter(x => x.tagName === 'TR').first()
                    .after(commentUI.tr);
                commentUI.writeButton.click();
            });
            return addButton;
        };

        const fileElems = document.querySelectorAll('div[data-tagsearch-path].file');
        fileElems.forEach(fileElem => {
            const file = new File(fileElem.getAttribute('data-tagsearch-path'));
            fileElem.querySelectorAll('button.add-line-comment')
                .forEach(originalButton => createButton({ file, fileElem, originalButton }));
        });
    }

    findVisualUI(id) {
        return document.querySelector(`[data-visual-id="${id}"].visual-root`)?.data.visualUI;
    }

    onPresentationChange(e) {
        const { added, removed } = e.detail;
        removed.forEach(x => this.sidebar.remove(x.id));
        added.forEach(x => this.sidebar.add(x, this.presentation.indexOf({ id: x.id })));
    }

    onSidebarNav(e) {
        const { id } = e.detail;
        this.findVisualUI(id).rootElem.scrollIntoView({ behavior: 'smooth' });
    }

    onSidebarSelect(e) {
        const { id } = e.detail;
        this.selectVisual(id);
    }

    async onSidebarReorder(e) {
        const { id, newPosition } = e.detail;
        this.presentation.moveVisual({ id, position: newPosition });
        this.sidebar.move(id, newPosition);
        await this.persist();
    }

    onSelect(e) {
        const { id } = e.detail;
        this.sidebar.select(id);
    }

    selectVisual(id) {
        if (this.findVisualUI(id).rootElem.classList.contains('selected')) return;
        document.querySelectorAll(`.${MAGIC}.visual-root.selected`).forEach(x => x.classList.remove('selected'));
        this.findVisualUI(id)?.rootElem.classList.add('selected');
        this.events.dispatchEvent(new CustomEvent('select', { detail: { id } }));
    }
}

let app;

document.addEventListener('readystatechange', async e => {
    if (document.readyState !== 'complete') return;
    {
        const prPage = new PullRequestPage();
        const {
            owner, repository, pull
        } = prPage.parseUrl();
        const github = new GithubApi({
            repositoryUrl: `/${owner}/${repository}`,
            pullUrl: `/${owner}/${repository}/pull/${pull}`,
        });
        app = new App({ document, github, prPage });
        await app.init(document);
    }

    (() => {
        const debug = document.createElement('button');
        debug.innerHTML = 'Debug';
        debug.addEventListener('click', e => {
            const exported = JSON.stringify(app.export());
            navigator.clipboard.writeText(exported);
            console.log(exported);
        });
        document.body.prepend(debug);
    }).apply();
});
