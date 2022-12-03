'use strict';

import { MAGIC, Util } from '../src/common.js';
import { Comment, File, FileContext, Presentation } from '../src/model/model.js';
import { SidebarUI } from '../src/ui/SidebarUI.js';
import { DividerUI } from '../src/ui/DividerUI.js';
import { SettingsUI } from '../src/ui/SettingsUI.js';
import { getConfig } from '../src/config.js';
import { authorize, KeyboardShortcutHandler, Metadata, parseComment, renderComment } from './app.js';

export const getCommentOrderRegex = async () => {
    if (getCommentOrderRegex.memo) return getCommentOrderRegex.memo;
    getCommentOrderRegex.memo = new RegExp(await getConfig('inlineModePattern'));
    return getCommentOrderRegex.memo;
};

export class LightApp {
    constructor({ github, prPage }) {
        this.github = github;
        this.prPage = prPage;
        this.masterAbortController = new AbortController();
        this.masterAbortSignal = this.masterAbortController.signal;
        this.events = Util.createEventTarget();
        this.metadata = new Metadata();
        this.presentation = new Presentation();
        this.presentation.events.addEventListener('change', e => this.onPresentationChange(e), { signal: this.masterAbortSignal });

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

        const settings = this.settings = new SettingsUI();
        settings.events.addEventListener('load', e => this.onSettingsLoad(e), { signal: this.masterAbortSignal });
        settings.events.addEventListener('export', e => this.onSettingsExport(e), { signal: this.masterAbortSignal });
        settings.saveItem.style.display = 'none';
        settings.importItem.style.display = 'none';
        document.querySelector('.diffbar > :last-child').before(settings.rootElem);

        this.keyboardShortcuts = await KeyboardShortcutHandler.load(this);

        const contentData = await LightApp.getCommentBodies(this.prPage);
        const isAutoLoad = await getConfig('openFrequency') === 'auto';
        const { owner, repository } = this.prPage.parseUrl();
        const authorized = await authorize({ owner, repository, wouldAutoLoad: isAutoLoad && contentData });

        if (isAutoLoad && contentData && authorized) {
            this.load(contentData);
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
            const cleanupDone = Util.waitEvent(this.presentation.events, 'change');
            this.presentation.removeAllVisuals();
            await cleanupDone;
        }
        this.sidebar.clear();
    }

    export() {
        return {
            metadata: this.metadata,
            files: this.githubFileTree ? Array.from(this.prPage.getFiles().getFilenames()) : undefined,
            presentation: this.presentation.export(),
        };
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
        added.forEach(x => this.sidebar.add(x, priorIndexes[x.id]));

    }

    onSidebarNav(e) {
        const { id } = e.detail;
        this.selectVisual({ id });
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

    static async getCommentBodies(prPage) {
        const regex = await getCommentOrderRegex();
        return prPage.getCommentBodies()
            .filter(x => regex.test(x.innerText));
    }
    async onSettingsLoad() {
        await this.clear();
        const commentBodies = await LightApp.getCommentBodies(this.prPage);
        return this.load(commentBodies);
    }
    async load(commentBodies) {
        const regex = await getCommentOrderRegex();
        commentBodies
            .toArray()
            .sort((a, b) => {
                const orderA = Number.parseInt(a.innerText.replace(regex, '$1'));
                const orderB = Number.parseInt(b.innerText.replace(regex, '$1'));
                return orderA - orderB;
            })
            .forEach(commentBodyElem => {
                const text = commentBodyElem.innerText.replace(regex, '$2');

                const tableCell = commentBodyElem.ancestors().find(x => x.matches('td'));

                const lineNo = tableCell.ancestors().find(x => x.matches('tr')).previousElementSibling.querySelector('[data-line-number]').getAttribute('data-line-number');
                const fileElem = tableCell.ancestors().find(x => x.matches('div[data-tagsearch-path].file'));
                const file = new File(fileElem.getAttribute('data-tagsearch-path'));
                const context = new FileContext({ file, lineNo });
                const comment = new Comment({ context, text });

                // hackishly make github elements look like our own
                commentBodyElem.setAttribute('data-visual-id', comment.id);
                commentBodyElem.classList.add(MAGIC); // this is especially wrong
                commentBodyElem.classList.add('visual-root');
                commentBodyElem.rootElem = commentBodyElem;
                commentBodyElem.data = { visualUI: commentBodyElem };
                commentBodyElem.model = { id: comment.id };

                this.presentation.addOrReplaceVisual({ visual: comment });
            });
    }

    async onSettingsExport(e) {
        const data = this.export();
        e.detail.setExportData(data);
    }
}
