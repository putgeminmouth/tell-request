'use strict';

import { MAGIC, Util, Promises } from '../common.js';
import { l10n } from '../l10n.js';
import { SVG } from './svg.js';
import { UI } from './ui.js';

export class SettingsUI extends UI {
    constructor() {
        super(Util.createElement(`<div class="${MAGIC} top-toolbar">`));
        this.events = Util.createEventTarget();

        this.rootElem.innerHTML = `
            <button name="shortcuts" class="btn-octicon" tabindex="-1" title="${l10n.get('settings.shortcutsButton.title')}">
                ${SVG.Keyboard}
            </button>
            <div style="position:relative">
                <button name="settings" class="btn-octicon" title=${l10n.get('settings.settingsButton.title')}>
                    ${SVG.Settings}
                </button>
                <ol class="menu">
                    <li><button name="load" class="btn-octicon">${l10n.get('settings.loadButton.text')}</button></li>
                    <li class="edit-mode-enabled-only"><button name="save" class="btn-octicon">${l10n.get('settings.saveButton.text')}</button></li>
                    <li class="divider">
                    <li><button name="import" class="btn-octicon">${l10n.get('settings.importButton.text')}</button></li>
                    <li><button name="export" class="btn-octicon">${l10n.get('settings.exportButton.text')}</button></li>
                    <li class="divider edit-mode-possible-visible-only">
                    <li class="edit-mode-possible-visible-only"><button name="edit" class="btn-octicon" title="${l10n.get('settings.editButton.title')}">${l10n.get('settings.editButton.text')}</button>
                        <button name="view" class="btn-octicon" title="${l10n.get('settings.viewButton.title')}">${l10n.get('settings.viewButton.text')}</button></li>
                </ol>
            </div>
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

        this.loadItem = this.rootElem.querySelector('button[name="load"').ancestors().find(x => x.matches('li'));
        this.saveItem = this.rootElem.querySelector('button[name="save"').ancestors().find(x => x.matches('li'));
        this.importItem = this.rootElem.querySelector('button[name="import"').ancestors().find(x => x.matches('li'));
        this.exportItem = this.rootElem.querySelector('button[name="export"').ancestors().find(x => x.matches('li'));

        this.rootElem.querySelector('button[name="settings"]').addEventListener('click', e => {
            e.stopPropagation();
            this.rootElem.querySelector('button[name="settings"]+ol').classList.toggle('visible');
        });
        this.rootElem.addEventListener('click', _ => {
            this.rootElem.querySelector('button[name="settings"]+ol').classList.remove('visible');
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
            dialog.querySelector('button[name="accept"]').addEventListener('click', async (_) => {
                error.innerText = '';

                let json;
                try {
                    json = JSON.parse(textarea.value);
                } catch (e) {
                    error.innerText = `${l10n.get('settings.importDialog.errors.invalidJson.text', [e])}`;
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
                    error.innerText = `${l10n.get('settings.importDialog.errors.importFailed.text', [e])}`;
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

    get shortcutsElement() { return this.rootElem.querySelector('button[name="shortcuts"]'); }

    setEditMode(e) {
        this.rootElem.querySelector('button[name="edit"]').click();
    }
}
