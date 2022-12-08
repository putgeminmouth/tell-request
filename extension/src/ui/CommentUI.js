'use strict';

import { MAGIC, Util } from '../common.js';
import { l10n } from '../l10n.js';
import { VisualUI } from './ui.js';

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
                    <div class="toolbar navbar" style="align-self: center">
                        <button name="prev" class="toolbar-item btn-octicon" title="${l10n.get('sidebar.navPrevButton.title')}">◀</button>
                        <button name="next" class="toolbar-item btn-octicon" title="${l10n.get('sidebar.navNextButton.title')}">▶</button>
                    </div>
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

        tr.querySelector('.navbar button[name="prev"]').addEventListener('click', e => {
            const id = this.currentValue.id;
            if (!id)
                return;
            // hackish we do it here but it prevents a click handler set elsewhere on the root elemen to select on click
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.events.dispatchEvent(new CustomEvent('navPrev', { detail: { id } }));
        });
        tr.querySelector('.navbar button[name="next"]').addEventListener('click', e => {
            const id = this.currentValue.id;
            if (!id)
                return;
            // hackish we do it here but it prevents a click handler set elsewhere on the root elemen to select on click
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.events.dispatchEvent(new CustomEvent('navNext', { detail: { id } }));
        });
    }

    onCancelClick() {
        this.textarea.value = this.currentValue.text || '';

        const detail = {
            comment: this.currentValue,
        };
        this.disable();
        this.events.dispatchEvent(new CustomEvent('cancel', { detail }));
        this.enable();

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
        if (this.textarea.value === this.previousPreviewValue)
            return; // avoid api calls
        const text = this.textarea.value;
        const commentId = this.prPage.getRandomCommentId();
        const rendered = await this.github.renderMarkdown({ text });
        this.rootElem.querySelector('.comment-body').innerHTML = rendered;
        this.previousPreviewValue = text;
    }
}
