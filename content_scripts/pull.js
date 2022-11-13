'use strict';

import { GithubApi, PullRequestPage } from '../src/github.js';
import { MAGIC, Opt, Promises, Try, Util, Element } from '../src/common.js';
import { Comment, File, FileContext, Ids, Presentation } from '../src/model/model.js';
import { CommentUI, DividerUI, SettingsUI, SidebarUI, GithubFileTree } from '../src/ui/ui.js';
import { l10n } from '../src/l10n.js';
import { getConfig } from '../src/config.js';

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

export class Metadata {
    constructor(data) {
        this.version = data?.version || 0;
        this.lastModifiedDate = data?.lastModifiedDate;
    }
}

class KeyboardShortcutHandler {
    constructor(app) {
        this.app = app;
    }

    actionNavigatePrevious() {
        const selected = app.getSelectedVisualUI();
        let index;
        if (selected) {
            const id = selected.model.id;
            index = app.presentation.indexOf({ id });
        } else {
            index = app.presentation.length;
        }
        if (index > 0)
            app.selectVisual({ index: index - 1 });
    }
    actionNavigateNext() {
        const selected = app.getSelectedVisualUI();
        let index;
        if (selected) {
            const id = selected.model.id;
            index = app.presentation.indexOf({ id });
        } else {
            index = -1;
        }
        if (index < app.presentation.length - 1)
            app.selectVisual({ index: index + 1 });
    }

    handle(e) {
        if (e.key === 'ArrowLeft') return this.actionNavigatePrevious();
        if (e.key === 'ArrowRight') return this.actionNavigateNext();
    }
}

class App {
    constructor({ github, prPage }) {
        // <hack>
        this.maybePersistOnPresentationChange = this.maybePersistOnPresentationChange.bind(this);
        // </hack>
        this.github = github;
        this.prPage = prPage;
        this.events = Util.createEventTarget();
        this.metadata = new Metadata();
        this.presentation = new Presentation();
        this.presentation.events.addEventListener('change', e => this.onPresentationChange(e));
        this.presentation.events.addEventListener('change', this.maybePersistOnPresentationChange);

        this.keyboardShortcuts = new KeyboardShortcutHandler();

        this.events.addEventListener('select', e => this.onSelect(e));
    }

    async init(document) {
        {
            const previewAuthenticityToken = this.prPage.getPreviewAuthenticityToken();
            this.github.previewAuthenticityToken = previewAuthenticityToken;
        }

        const sidebar = this.sidebar = new SidebarUI();
        if (document.querySelector('[data-target="diff-layout.mainContainer"].Layout-main')) {
            document.querySelector('[data-target="diff-layout.mainContainer"].Layout-main').after(sidebar.rootElem);
        } else {
            // pretty hackish...
            const e = Util.createElement('<div side="left" responsive="true" data-target="diff-layout.layoutContainer" data-view-component="true" class="Layout Layout--flowRow-until-lg Layout--gutter-condensed  hx_Layout wants-full-width-container Layout--sidebarPosition-start Layout--sidebarPosition-flowRow-none"></div>');
            const diffView = document.querySelector('.diff-view');
            diffView.style.gridColumn = '1 / span 3';
            diffView.replaceWith(e);
            e.append(diffView);
            e.append(sidebar.rootElem);
        }

        const divider = this.divider = new DividerUI();
        divider.events.addEventListener('resize', e => this.onDividerResize(e));
        divider.events.addEventListener('collapse', e => this.onDividerCollapse(e));
        sidebar.rootElem.before(divider.rootElem);

        sidebar.events.addEventListener('navTo', e => this.onSidebarNav(e));
        sidebar.events.addEventListener('delete', e => this.onSidebarDelete(e));
        sidebar.events.addEventListener('reorder', e => this.onSidebarReorder(e));

        const settings = this.settings = new SettingsUI();
        settings.events.addEventListener('load', e => this.onSettingsLoad(e));
        settings.events.addEventListener('save', e => this.onSettingsSave(e));
        settings.events.addEventListener('import', e => this.onSettingsImport(e));
        settings.events.addEventListener('export', e => this.onSettingsExport(e));
        settings.events.addEventListener('toggleEditMode', e => this.onSettingsToggleEditMode(e));
        document.querySelector('.diffbar > :last-child').before(settings.rootElem);

        let githubFileTree = document.querySelector('file-tree');
        if (githubFileTree) {
            githubFileTree = this.githubFileTree = new GithubFileTree(githubFileTree);
            githubFileTree.events.addEventListener('reorder', e => this.onGithubFileTreeReorder(e));
        }

        this.initAddVisualButtons();

        if (await getConfig('openFrequency') === 'auto') {
            await this.onSettingsLoad();
        }
        if (await getConfig('editFrequency') === 'auto' && this.prPage.getAuthorGibhubId() === this.prPage.getCurrentUserGithubId()) {
            await settings.setEditMode();
        }
        if (await getConfig('editOnlyOwn') && this.prPage.getAuthorGibhubId() === this.prPage.getCurrentUserGithubId()) {
            document.body.classList.add('edit-mode-possible');
        }
        if (await getConfig('enableGlobalKeyboardShortcuts')) {
            document.addEventListener('keydown', e => {
                this.keyboardShortcuts.handle(e);
            });
        }
    }

    async import(data) {
        // this.sidebar.reset();
        // this.divider.reset();
        // this.settings.reset();
        this.presentation.events.removeEventListener('change', this.maybePersistOnPresentationChange);

        if (this.presentation.length) {
            const cleanupDone = Util.waitEvent(this.presentation.events, 'change');
            this.presentation.removeAllVisuals();
            await cleanupDone;
        }

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

        const maxId = getAllIds(data).map(x => parseInt(x)).toArray().sort((a, b) => b - a).first() || 1;
        Ids.initId(maxId);

        const presentation = new Presentation();
        presentation.events.addEventListener('change', e => this.onPresentationChange(e));
        presentation.import(data.presentation);
        this.metadata = new Metadata(data.metadata || {});
        presentation.events.addEventListener('change', this.maybePersistOnPresentationChange);
        this.presentation = presentation;
        this.mostRecentImportData = data;

        const warnings = [];

        if (data.files?.length === this.prPage.getFiles().elements.length) {
            data.files?.forEach((filename, i) => {
                this.githubFileTree.move({ filename, position: i });
                this.prPage.moveFileToPosition(filename, i);
            });
        } else {
            warnings.push('Data had a different number of files than the page, file ordering is lost.');
        }

        if (warnings.length) {
            window.alert(`Imported with warnings:\n${warnings.join('\n')}`);
        }
    }

    export() {
        return {
            metadata: this.metadata,
            files: Array.from(this.prPage.getFiles().getFilenames()),
            presentation: this.presentation.export(),
        };
    }

    async persist() {
        const currentValue = (await this.github.issue.fetchIssueEditForm(this.prPage.getPullId())).editForm.querySelector('textarea').value;
        const currentParsed = parseComment(currentValue) || { comment: currentValue, data: {} };

        this.metadata.version = (this.metadata.version || 0) + 1;
        this.metadata.lastModifiedDate = new Date();

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
            this.selectVisual({ id: value.id });
        });
        commentUI.rootElem.addEventListener('click', _ => {
            this.selectVisual({ id: value.id });
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

    findVisualUI({ id, index }) {
        if (index >= 0)
            id = this.presentation.findByIndex(index).id;
        if (id)
            return document.querySelector(`[data-visual-id="${id}"].visual-root`)?.data.visualUI;
    }

    async onPresentationChange(e) {
        const { presentation, added, removed } = e.detail;
        removed.forEach(x => this.sidebar.remove(x.id));
        removed.forEach(x => document.querySelector(`[data-visual-id="${x.id}"].visual-root`)?.remove());

        added.forEach(x => this.sidebar.add(x, presentation.indexOf({ id: x.id })));
        added.forEach(x => {
            const existingUI = this.findVisualUI({ id: x.id });
            if (existingUI) {
                existingUI.setText(x.text);
            } else {
                const tr = document.querySelector(`div.file .diff-table tr:has(td[data-line-number="${x.context.lineNo}"])`);
                const fileElem = tr.ancestors().find(x => x.classList.contains('file')).first();
                const commentUI = this.createCommentUI({ fileElem, value: x })
                tr.after(commentUI.rootElem);
                commentUI.setPreviewTab(); // no need to await
            }
        });
    }

    async maybePersistOnPresentationChange(e) {
        if (await getConfig('saveFrequency') === 'auto')
            await this.persist();
    }

    onSidebarNav(e) {
        const { id } = e.detail;
        this.selectVisual({ id });
    }

    onSidebarDelete(e) {
        const { id } = e.detail;
        this.presentation.removeVisual({ id });
    }

    async onSidebarReorder(e) {
        const { id, newPosition } = e.detail;
        this.presentation.moveVisual({ id, position: newPosition });
        this.sidebar.move(id, newPosition);
    }

    async onGithubFileTreeReorder(e) {
        const { id, newPosition, filename } = e.detail;
        this.githubFileTree.move({ id, position: newPosition });

        this.prPage.moveFileToPosition(filename, newPosition);
    }

    onSelect(e) {
        const { id } = e.detail;
        this.sidebar.select(id);
        // as usual, timeout resolves various issues. here something about being inside an onclick handler :shrug:
        setTimeout(_ => this.findVisualUI({ id }).rootElem.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }

    getSelectedVisualUI() {
        return document.querySelector(`.${MAGIC}.visual-root.selected`)?.data.visualUI;
    }

    selectVisual({ id, index }) {
        let visual = this.findVisualUI({ id, index });
        if (visual?.rootElem.classList.contains('selected')) return;
        document.querySelectorAll(`.${MAGIC}.visual-root.selected`).forEach(x => x.classList.remove('selected'));
        visual?.rootElem.classList.add('selected');
        id = id || visual.model.id;
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

    async onSettingsSave(e) {
        await this.persist();
    }

    async onSettingsLoad(e) {
        const issueForm = await this.github.issue.fetchIssueEditForm(this.prPage.getPullId());
        const currentValue = issueForm.editForm.querySelector('textarea').value;
        const parsed = parseComment(currentValue);
        if (parsed)
            this.import(parsed.data);
    }

    async onSettingsExport(e) {
        const data = this.export();
        e.detail.setExportData(data);
    }

    async onSettingsImport(e) {
        try {
            await this.import(e.detail.data);
            e.detail.promise.resolve();
        } catch (err) {
            // our only validation is in the execution so at best we can restore like this
            await this.import(this.mostRecentImportData);
            e.detail.promise.reject(err);
        }
    }

    onSettingsToggleEditMode(e) {
        this.toggleEditMode();
    }

    toggleEditMode(e) {
        const className = `${MAGIC}_edit-mode`;
        if (document.body.classList.contains(className)) {
            document.body.classList.remove(`${MAGIC}_edit-mode`);
        } else {
            if (this.prPage.getAuthorGibhubId() === this.prPage.getCurrentUserGithubId())
                document.body.classList.add(`${MAGIC}_edit-mode`);
        }
    }
}

let app;

const onDocumentLoad = async _ => {
    l10n.setLocale(await getConfig('language'));
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
};

if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', _ => {
        if (document.readyState !== 'complete') return;
        onDocumentLoad();
    });
else
    onDocumentLoad();
