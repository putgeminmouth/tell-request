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
        this.text = text;
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

class Link {
    constructor({ prev, next, data }) {
        this.prev = prev;
        this.next = next;
        this.data = data;
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
        this.visuals.splice(isNaN(position) ? -1 : position, 0, visual);

        this.events.dispatchEvent(new CustomEvent('change', { detail: { added: [visual], removed: removed } }));
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
                    <div class="toolbar">
                        <button name="linkTo" class="toolbar-item btn-octicon">🔗⇢</button>
                    </div>
                    <textarea class="form-control input-contrast comment-form-textarea"></textarea>
                </div>
                <div name="preview" class="tabnav-content">
                    <div class="toolbar">
                        <div name="position" class="toolbar-item btn-octicon"></div>
                    </div>
                    <div class="comment-body markdown-body"></div>
                </div>
                <div class="form-actions">
                    <button type="button" name="save" class="btn btn-primary">Save</button>
                    <button type="button" name="cancel" class="btn">Cancel</button>
                </div>
            </td>
        `);
        const tr = this.tr = this.rootElem;
        tr.setAttribute('data-visual-id', this.currentValue.id);
        tr.append(td);

        tr.data = { visualUI: this };
        const textarea = this.textarea = tr.querySelector('textarea');
        textarea.value = this.currentValue.text;
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
        tr.querySelector('button[name="linkTo"]').addEventListener('click', _ => {
            const svg = Util.createElement(`
                <svg style="position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible">
                    <!--
                    <circle class="debug1" fill="blue" cx="0" cy="0" r="5"></circle>
                    <circle class="debug2" fill="yellow" cx="0" cy="0" r="5"></circle>
                    -->
                    <path stroke="red" stroke-width="2" fill="yellow" fill-opacity="0.5"></path>
                </svg>
            `);
            const path = svg.querySelector('path');
            // tr.querySelector('button[name="linkTo"]').after(svg);
            document.body.append(svg);
            document.addEventListener('mousemove', e => {
                const getDocumentOffset = e => {
                    const r = e.getBoundingClientRect();
                    return { x: r.x + window.scrollX, y: r.y + window.scrollY };
                };
                const commonOrigin = getDocumentOffset(tr.querySelector('button[name="linkTo"]'));
                const commonTarget = { x: e.pageX, y: e.pageY };
                const calcControlPoint = ({ origin, target, focalMultiplier, bias }) => {
                    const segment = { x: target.x - origin.x, y: target.y - origin.y };
                    const ctrl = (() => {
                        const mid = { x: segment.x * bias, y: segment.y * bias };
                        // svg.querySelector('circle.debug1').setAttribute('cx', origin.x + mid.x);
                        // svg.querySelector('circle.debug1').setAttribute('cy', origin.y + mid.y);
                        const midAngle = Math.atan2(segment.y, segment.x);
                        const orthY = Math.sin(midAngle - Math.PI / 2);
                        const orthX = Math.cos(midAngle - Math.PI / 2);
                        const focalLength = focalMultiplier * Math.sqrt(mid.x * mid.x + mid.y * mid.y);
                        const focus = { x: mid.x + orthX * focalLength, y: mid.y + orthY * focalLength };
                        // svg.querySelector('circle.debug2').setAttribute('cx', origin.x + focus.x);
                        // svg.querySelector('circle.debug2').setAttribute('cy', origin.y + focus.y);
                        return focus;
                    }).apply();
                    return { segment, ctrl };
                };
                const commonSegment = { x: Math.abs(commonTarget.x - commonOrigin.x), y: Math.abs(commonTarget.y - commonOrigin.y) };
                const d = commonSegment.x > commonSegment.y;
                const dx = d ? 0 : 5;
                const dy = d ? -5 : 0;
                const path1 = (() => {
                    const origin = { x: commonOrigin.x - dx, y: commonOrigin.y - dy };
                    const target = commonTarget;
                    const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: 1.6, bias: 0.2 });
                    return `l ${-dx} ${-dy} q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
                }).apply();
                const path2 = (() => {
                    const origin = commonTarget;
                    const target = { x: commonOrigin.x + dx, y: commonOrigin.y + dy };
                    const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: -0.6, bias: 0.8 });
                    return `q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
                }).apply();
                path.setAttribute('d', `M ${commonOrigin.x} ${commonOrigin.y} ${path1} ${path2} L ${commonOrigin.x} ${commonOrigin.y}`);

                const other = document.elementsFromPoint(e.clientX, e.clientY)
                    .find(x => x.matches(`tr.${MAGIC} :scope`));

                if (other) {
                    const otherAncestor = Element.ancestors(other).find(x => x.matches(`tr.${MAGIC}`));
                    document.querySelectorAll('.visual-linker-over').toArray().forEach(x => x.classList.remove('visual-linker-over'));
                    otherAncestor.classList.add('visual-linker-over');
                }
            });
        });
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
        this.tr.querySelector('.toolbar').style.display = null;
        setTimeout(() => this.textarea.focus()); // no idea why timeout
    }

    async onPreviewClick() {
        this.tr.querySelector('.toolbar').style.display = 'none';

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

class TopToolbarUI {
    constructor() {
        const toolbar = this.toolbar = Util.createElement(`
            <div class="${MAGIC} top-toolbar">
                <div class="context"></div>
                <button name="prev" class="btn-octicon">⇠</button>
                <button name="next" class="btn-octicon">⇢</button>
                <button name="linkTo" class="btn-octicon">🔗</button>

            </div>
        `);
        this.prevButton = toolbar.querySelector('button[name="prev"]');
        this.nextButton = toolbar.querySelector('button[name="next"]');
        this.linkButton = toolbar.querySelector('button[name="linkTo"]');
        this.events = Util.createEventTarget();

        this.prevButton.addEventListener('prev', e => this.events.dispatchEvent(e));
        this.prevButton.addEventListener('next', e => this.events.dispatchEvent(e));
    }
}
class SidebarUI {
    constructor() {
        const sidebar = this.sidebar = Util.createElement(`
            <div class="${MAGIC} sidebar">
                <ol>
                    <li>
                        <div class="marker marker-rail">⭥</div>
                        <div></div>
                    </li>
                </ol>
            </div>
        `);
        const list = this.list = sidebar.querySelector('ol');
        this.events = Util.createEventTarget();
    }

    add(visual, index) {
        const item = Util.createElement(`
            <li>
                <div class="marker">⭥</div>
                <div class="content">
                    <div class="context">
                        <svg class="color-fg-muted" width="16" height="16"><use href="#octicon_file_16"></use></svg>
                        <span>${visual.context.file.filename}: ${visual.context.lineNo}</span>
                    </div>
                    <div class="label">${visual.text}</div>
                </div>
                <div class="toolbar">
                    <button name="navTo" class="btn-octicon">⊛</button>
                    <button class="btn-octicon">?</button>
                </div>
            </li>
        `);
        const navToButton = item.querySelector('button[name="navTo"]');
        navToButton.addEventListener('click', e => {
            this.events.dispatchEvent(new CustomEvent('navTo', { detail: { id: item.data.id } }));
        });
        item.data = {
            id: visual.id,
            navToButton
        };
        const itemToInsertBefore = this.list.querySelector(`li:nth-of-type(${index + 1})`);
        if (itemToInsertBefore) itemToInsertBefore.before(item); else this.list.append(item);
    }

    remove(id) {
        const item = this.list.querySelectorAll('li').find(x => x.data?.id === id);
        item.remove();
    }

    select(id) {
        this.list.querySelectorAll('li.selected').forEach(x => x.classList.remove('selected'));
        this.list.querySelectorAll('li').find(x => x.data?.id === id)?.classList.add('selected');
    }
}

class App {
    constructor({ github, prPage }) {
        this.github = github;
        this.prPage = prPage;
        this.events = Util.createEventTarget();
        this.presentation = new Presentation();
        this.presentation.events.addEventListener('change', e => this.onPresentationChange(e));

        this.events.addEventListener('select', e => this.onSelect(e));
    }

    async init(document) {
        const fileElem = document.querySelectorAll('div[data-tagsearch-path].file').first();
        const file = this.file = this.createFile(fileElem);

        const issueForm = await this.github.issue.fetchIssueEditForm(this.prPage.getPullId());
        const currentValue = issueForm.editForm.querySelector('textarea').value;
        const parsed = parseComment(currentValue);
        const getAllIds = (o) => {
            if (o?.id) return o?.id;
            return Object.values(o).map(v => {
                if (Array.isArray(v))
                    return v.map(getAllIds);
                if (typeof (v) === 'object')
                    return getAllIds(v);
                return [];
            });
        };

        const sidebar = this.sidebar = new SidebarUI();
        document.querySelector('[data-target="diff-layout.mainContainer"].Layout-main').after(sidebar.sidebar);
        sidebar.events.addEventListener('navTo', e => this.onSidebarNav(e));

        const maxId = getAllIds(parsed).map(x => parseInt(x)).toArray().sort((a, b) => b - a).first();
        Ids.initId(maxId);
        this.presentation.import(parsed.data);

        this.presentation.visuals.forEach(v => {
            const lineNo = v.context.lineNo;
            const context = new FileContext({ file, lineNo });
            const commentUI = this.createCommentUI({ fileElem, context, value: v });
            document.querySelector(`[data-tagsearch-path] [data-line-number="${lineNo}"]`)
                .ancestors(x => x.tagName === 'TR')
                .first()
                .after(commentUI.tr);
            commentUI.writeButton.click();
        });
        // document.body.addEventListener('focusin', e => {
        //     if (e.currentTarget.tagName !== 'TR' || e.currentTarget.classList.contains(MAGIC)) return;
        // });
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
        return commentUI;
    }

    createFile(fileElem) {
        const file = new File(fileElem.getAttribute('data-tagsearch-path'));

        const createButton = (originalButton) => {
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
                const commentUI = this.createCommentUI({ fileElem, context });

                originalButton.ancestors().filter(x => x.tagName === 'TR').first()
                    .after(commentUI.tr);
                commentUI.writeButton.click();
            });
            return addButton;
        };

        fileElem.querySelectorAll('button.add-line-comment')
            .forEach(originalButton => createButton(originalButton));

        return file;
    }

    findVisualUI(id) {
        return document.querySelector(`[data-visual-id="${id}"]`)?.data.visualUI;
    }

    onPresentationChange(e) {
        const { added, removed } = e.detail;
        // add before remove to preserve validity of incides
        added.forEach(x => this.sidebar.add(x, this.presentation.indexOf({ id: x.id })));
        removed.forEach(x => this.sidebar.remove(x.id));
    }

    onSidebarNav(e) {
        const { id } = e.detail;
        this.findVisualUI(id).rootElem.scrollIntoView({ behavior: 'smooth' });
    }

    onSelect(e) {
        const { id } = e.detail;
        this.sidebar.select(id);
    }

    selectVisual(id) {
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
