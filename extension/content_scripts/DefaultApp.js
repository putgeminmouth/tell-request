'use strict';

import { MAGIC, Util } from '../src/common.js';
import { Comment, File, FileContext, Ids, Presentation } from '../src/model/model.js';
import { CommentUI } from '../src/ui/CommentUI.js';
import { SidebarUI } from '../src/ui/SidebarUI.js';
import { DividerUI } from '../src/ui/DividerUI.js';
import { SettingsUI } from '../src/ui/SettingsUI.js';
import { GithubFileTree } from '../src/ui/GithubFileTree.js';
import { getConfig } from '../src/config.js';
import { authorize, KeyboardShortcutHandler, Metadata, parseComment, renderComment } from './app.js';

export class DefaultApp {
    constructor({ github, prPage }) {
        // <hack>
        this.maybePersistOnPresentationChange = this.maybePersistOnPresentationChange.bind(this);
        // </hack>
        this.github = github;
        this.prPage = prPage;
        this.masterAbortController = new AbortController();
        this.masterAbortSignal = this.masterAbortController.signal;
        this.events = Util.createEventTarget();
        this.metadata = new Metadata();
        this.presentation = new Presentation();
        this.presentation.events.addEventListener('change', this.maybePersistOnPresentationChange, { signal: this.masterAbortSignal });

        this.events.addEventListener('select', e => this.onSelect(e), { signal: this.masterAbortSignal });
    }

    dispose() {
        this.masterAbortController.abort();
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
        divider.events.addEventListener('resize', e => this.onDividerResize(e), { signal: this.masterAbortSignal });
        divider.events.addEventListener('collapse', e => this.onDividerCollapse(e), { signal: this.masterAbortSignal });
        sidebar.rootElem.before(divider.rootElem);

        sidebar.events.addEventListener('navTo', e => this.onSidebarNav(e), { signal: this.masterAbortSignal });
        sidebar.events.addEventListener('delete', e => this.onSidebarDelete(e)), { signal: this.masterAbortSignal };
        sidebar.events.addEventListener('reorder', e => this.onSidebarReorder(e)), { signal: this.masterAbortSignal };

        const settings = this.settings = new SettingsUI();
        settings.events.addEventListener('load', e => this.onSettingsLoad(e), { signal: this.masterAbortSignal });
        settings.events.addEventListener('save', e => this.onSettingsSave(e), { signal: this.masterAbortSignal });
        settings.events.addEventListener('import', e => this.onSettingsImport(e), { signal: this.masterAbortSignal });
        settings.events.addEventListener('export', e => this.onSettingsExport(e), { signal: this.masterAbortSignal });
        settings.events.addEventListener('toggleEditMode', e => this.onSettingsToggleEditMode(e), { signal: this.masterAbortSignal });
        document.querySelector('.diffbar > :last-child').before(settings.rootElem);

        if (false)
            if (!this.prPage.fileTreeHasDirectories()) {
                let githubFileTree = document.querySelector('file-tree');
                if (githubFileTree) {
                    githubFileTree = this.githubFileTree = new GithubFileTree(githubFileTree);
                    githubFileTree.events.addEventListener('reorder', e => this.onGithubFileTreeReorder(e), { signal: this.masterAbortSignal });
                }
            }

        this.initAddVisualButtons();

        this.keyboardShortcuts = await KeyboardShortcutHandler.load(this);

        const contentData = (await this.getContentData())?.data;
        const isAutoLoad = await getConfig('openFrequency') === 'auto';
        const { owner, repository } = this.prPage.parseUrl();
        const authorized = await authorize({ owner, repository, wouldAutoLoad: isAutoLoad && contentData });

        if (isAutoLoad && contentData && authorized) {
            await this.import(contentData);
        }
        if (await getConfig('editFrequency') === 'auto' && this.prPage.getAuthorGibhubId() === this.prPage.getCurrentUserGithubId()) {
            await settings.setEditMode();
        }
        if (await getConfig('editOnlyOwn') && this.prPage.getAuthorGibhubId() === this.prPage.getCurrentUserGithubId()) {
            document.body.classList.add('edit-mode-possible');
        }

        {
            this.settings.shortcutsElement.addEventListener('keydown', e => {
                this.keyboardShortcuts.handle(e);
            }, { signal: this.masterAbortSignal });
            if (await getConfig('enableGlobalKeyboardShortcuts')) {
                document.addEventListener('keydown', e => {
                    this.keyboardShortcuts.handle(e);
                }, { signal: this.masterAbortSignal });
            }
        }
    }

    async clear() {
        if (this.presentation.length) {
            this.presentation.events.removeEventListener('change', this.maybePersistOnPresentationChange);

            const cleanupDone = Util.waitEvent(this.presentation.events, 'change');
            this.presentation.removeAllVisuals();
            await cleanupDone;

            this.presentation.events.addEventListener('change', this.maybePersistOnPresentationChange, { signal: this.masterAbortSignal });
        }
    }

    async import(data) {
        // this.sidebar.reset();
        // this.divider.reset();
        // this.settings.reset();
        await this.clear();

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
        presentation.events.addEventListener('change', e => this.onPresentationChange(e), { signal: this.masterAbortSignal });
        presentation.import(data.presentation);
        this.metadata = new Metadata(data.metadata || {});
        presentation.events.addEventListener('change', this.maybePersistOnPresentationChange, { signal: this.masterAbortSignal });
        this.presentation = presentation;
        this.mostRecentImportData = data;

        const warnings = [];

        if (this.githubFileTree) {
            if (data.files?.length === this.prPage.getFiles().elements.length) {
                data.files?.forEach((filename, i) => {
                    this.githubFileTree.move({ filename, position: i });
                    this.prPage.moveFileToPosition(filename, i);
                });
            } else {
                warnings.push('Data had a different number of files than the page, file ordering is lost.');
            }
        }

        if (warnings.length) {
            window.alert(`Imported with warnings:\n${warnings.join('\n')}`);
        }
    }

    export() {
        return {
            metadata: this.metadata,
            files: this.githubFileTree ? Array.from(this.prPage.getFiles().getFilenames()) : undefined,
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
        }, { signal: this.masterAbortSignal });
        commentUI.events.addEventListener('cancel', async e => {
            const { comment } = e.detail;
            if (!this.presentation.findById(comment.id)) {
                document.querySelector(`[data-visual-id="${comment.id}"].visual-root`)?.remove();
            }
        }, { signal: this.masterAbortSignal });

        commentUI.events.addEventListener('navPrev', async e => {
            const { id } = e.detail;
            const index = this.presentation.indexOf({ id });
            if (index > 0)
                this.selectVisual({ index: index - 1 });
        }, { signal: this.masterAbortSignal });
        commentUI.events.addEventListener('navNext', async e => {
            const { id } = e.detail;
            const index = this.presentation.indexOf({ id });
            if (index < this.presentation.length - 1)
                this.selectVisual({ index: index + 1 });
        }, { signal: this.masterAbortSignal });

        commentUI.rootElem.addEventListener('focusin', _ => {
            if (this.presentation.findById(value.id))
                this.selectVisual({ id: value.id });
        }, { signal: this.masterAbortSignal });
        commentUI.rootElem.addEventListener('click', _ => {
            if (this.presentation.findById(value.id))
                this.selectVisual({ id: value.id });
        }, { signal: this.masterAbortSignal });
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
            }, { signal: this.masterAbortSignal });
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

        const priorIndexes = added.reduce((acc, next) => (acc[next.id] = presentation.indexOf({ id: next.id }), acc), {});

        removed.forEach(x => this.sidebar.remove(x.id));
        removed.forEach(x => document.querySelector(`[data-visual-id="${x.id}"].visual-root`)?.remove());

        added.forEach(x => this.sidebar.add(x, priorIndexes[x.id]));
        added.forEach(x => {
            const existingUI = this.findVisualUI({ id: x.id });
            if (existingUI) {
                existingUI.setText(x.text);
            } else {
                const fileElem = this.prPage.getFileElementForFile(x.context.file.filename);
                const tr = fileElem.querySelector(`.diff-table tr td[data-line-number="${x.context.lineNo}"]`).ancestors(x => x.tagName === 'TR').first();
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
        if (!this.findVisualUI({ id })) return;
        this.sidebar.select(id);
        // as usual, timeout resolves various issues. here something about being inside an onclick handler :shrug:
        setTimeout(_ => this.findVisualUI({ id })?.rootElem.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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

    async getContentData() {
        const issueForm = await this.github.issue.fetchIssueEditForm(this.prPage.getPullId());
        const currentValue = issueForm.editForm.querySelector('textarea').value;
        const parsed = parseComment(currentValue);
        return parsed;
    }
    async onSettingsLoad(e) {
        const parsed = await this.getContentData();
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

