'use strict';

import { GithubApi, PullRequestPage } from './github.js';
import { MAGIC, Opt, Promises, Try, Util, Element } from './common.js';
import { Comment, File, FileContext, Ids, Presentation } from './model/model.js';
import { CommentUI, DividerUI, SidebarUI } from './ui/ui.js';

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
        document.querySelector('[data-target="diff-layout.mainContainer"].Layout-main').after(sidebar.rootElem);

        const divider = this.divider = new DividerUI();
        divider.events.addEventListener('resize', e => this.onDividerResize(e));
        divider.events.addEventListener('collapse', e => this.onDividerCollapse(e));
        sidebar.rootElem.before(divider.rootElem);

        sidebar.events.addEventListener('navTo', e => this.onSidebarNav(e));
        sidebar.events.addEventListener('delete', e => this.onSidebarDelete(e));
        sidebar.events.addEventListener('reorder', e => this.onSidebarReorder(e));
        sidebar.events.addEventListener('save', e => this.onSidebarSave(e));

        const settings = Util.createElement(`
            <div class="${MAGIC} top-toolbar">
                <button name="edit" class="btn-octicon">📝</button>
                <button name="view" class="btn-octicon">👁</button>
                <button name="settings" class="btn-octicon">⚙</button>
            </div>
        `);
        settings.querySelectorAll('button[name="edit"],button[name="view"]').forEach(x => x.addEventListener('click', _ => {
            document.body.classList.toggle(`${MAGIC}_edit-mode`);
        }));
        document.querySelector('.diffbar > :last-child').before(settings);

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

    createCommentUI({ fileElem, value }) {
        const commentUI = new CommentUI({ github: this.github, prPage: this.prPage, fileElem, value });
        commentUI.events.addEventListener('accept', async e => {
            const { comment } = e.detail;
            this.presentation.addOrReplaceVisual({ visual: comment });
        });

        commentUI.rootElem.addEventListener('focusin', _ => {
            this.selectVisual(value.id);
        });
        commentUI.rootElem.addEventListener('click', _ => {
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
                const commentUI = this.createCommentUI({ fileElem, value: new Comment({ context }) });

                originalButton.ancestors().filter(x => x.tagName === 'TR').first()
                    .after(commentUI.rootElem);
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
        removed.forEach(x => document.querySelector(`[data-visual-id="${x.id}"].visual-root`)?.remove());

        added.forEach(x => this.sidebar.add(x, this.presentation.indexOf({ id: x.id })));
        added.forEach(x => {
            const tr = document.querySelector(`div.file .diff-table tr:has(td[data-line-number="${x.context.lineNo}"])`);
            const fileElem = tr.ancestors().find(x => x.classList.contains('file')).first();
            const commentUI = this.createCommentUI({ fileElem, value: x })
            tr.after(commentUI.rootElem);
            commentUI.setPreviewTab(); // no need to await
        });
    }

    onSidebarNav(e) {
        const { id } = e.detail;
        this.findVisualUI(id).rootElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.selectVisual(id);
    }

    onSidebarDelete(e) {
        const { id } = e.detail;
        this.presentation.removeVisual({ id });
    }

    async onSidebarReorder(e) {
        const { id, newPosition } = e.detail;
        this.presentation.moveVisual({ id, position: newPosition });
        this.sidebar.move(id, newPosition);
        await this.persist();
    }

    async onSidebarSave(e) {
        const promise = e.detail.promise();
        try {
            await this.persist();
        } finally {
            promise.resolve();
        }
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

    onDividerResize(e) {
        const { pageX } = e.detail;
        this.sidebar.rootElem.style.width = `${this.sidebar.rootElem.getBoundingClientRect().right - pageX}px`;
    }

    onDividerCollapse(e) {
        const { collapsed } = e.detail;
        this.sidebar.rootElem.classList.toggle('collapsed', collapsed);
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
