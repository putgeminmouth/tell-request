'use strict';

import { GithubApi, PullRequestPage } from '../src/github.js';
import { MAGIC, Opt, Promises, Try, Util, Element } from '../src/common.js';
import { Comment, File, FileContext, Ids, Presentation } from '../src/model/model.js';
import { CommentUI } from '../src/ui/CommentUI.js';
import { SidebarUI } from '../src/ui/SidebarUI.js';
import { DividerUI } from '../src/ui/DividerUI.js';
import { SettingsUI } from '../src/ui/SettingsUI.js';
import { GithubFileTree } from '../src/ui/GithubFileTree.js';
import { Shortcut } from '../src/ui/Shortcut.js';
import { l10n } from '../src/l10n.js';
import { getConfig, setConfig } from '../src/config.js';
import { DefaultApp } from './DefaultApp.js';
import { LightApp } from './LightApp.js';

export const parseComment = c => {
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

export const renderComment = c => {
    return c.comment + ((!c.comment.length || /\s$/.test(c.comment)) ? '' : '\n') + '<!-- ' + MAGIC + JSON.stringify(c.data, null, 2) + MAGIC + ' -->';
};

export class Metadata {
    constructor(data) {
        this.version = data?.version || 0;
        this.lastModifiedDate = data?.lastModifiedDate;
    }
}

export class KeyboardShortcutHandler {
    static load = async (app) => {
        const arr = Object.entries(await getConfig('shortcuts'))
            .filter(([_, v]) => v.enabled)
            .map(([k, v]) => [k, new Shortcut(v.shortcut)]);
        const obj = Object.fromEntries(arr);
        return new KeyboardShortcutHandler(app, obj);
    }

    constructor(app, shortcuts) {
        this.app = app;
        this.shortcuts = shortcuts;
    }

    actionNavigatePrevious() {
        const selected = this.app.getSelectedVisualUI();
        let index;
        if (selected) {
            const id = selected.model.id;
            index = this.app.presentation.indexOf({ id });
        } else {
            index = this.app.presentation.length;
        }
        if (index > 0)
            this.app.selectVisual({ index: index - 1 });
    }
    actionNavigateNext() {
        const selected = this.app.getSelectedVisualUI();
        let index;
        if (selected) {
            const id = selected.model.id;
            index = this.app.presentation.indexOf({ id });
        } else {
            index = -1;
        }
        if (index < this.app.presentation.length - 1)
            this.app.selectVisual({ index: index + 1 });
    }

    maybeShortcut(e) {
        const [name, shortcut] = Object.entries(this.shortcuts).find(([_, v]) => v.testEvent(e)) || [];
        if (!shortcut) return [];
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return [name, shortcut];
    }

    handle(e) {
        const [name, shortcut] = this.maybeShortcut(e);
        if (!shortcut) return;
        switch (name) {
            case 'navPrev': return this.actionNavigatePrevious();
            case 'navNext': return this.actionNavigateNext();
        }
    }
}

export const authorize = async ({ owner, repository, wouldAutoLoad }) => {
    if (!(await getConfig('security.enableRepositoryWhitelist'))) return true;
    const allowedRepositories = await getConfig('security.repositories.allowed');
    const allowedOwners = await getConfig('security.owners.allowed');

    if (allowedOwners.includes(owner)) return true;
    if (allowedRepositories.includes(`${owner}/${repository}`)) return true;

    switch (await getConfig('security.promptUnknownRepository')) {
        case 'never':
            return false;
        case 'always':
            break;
        default:
        case 'detect':
            if (!wouldAutoLoad) return false;
            break;
    }

    const dialog = Util.createElement(`
        <dialog style="display: flex; flex-direction: column; max-width: 50%">
            <div style="font-weight: bold; font-size: 2em; border-bottom: solid 1px;">Tell Request</div>
            <div>
            <p>The Tell Request extension is set to auto-load and has detected content on this page. Because this is the first time loading content for this repository you are being asked to confirm.
            You can choose to enable only for this specific repository, all repositories from this owner, or not to enable for this repository at all.</p>
            <p>This behaviour can be customized, and even disabled, in the <a style="cursor: pointer">settings</a>.</p>
            </div>
            <div>Enable?</div>
            <div style="display: flex; flex-direction:column; width: fit-content">
                <button name="close">Do not enable</button>
                <br>
                <button name="repository">Only '${owner}/${repository}'</button>
                <br>
                <button name="owner">All in '${owner}'</button>
            </div>
        </dialog>
    `);

    const promise = Promises.create();
    dialog.querySelector('a').addEventListener('click', _ => {
        chrome.runtime.sendMessage({
            type: 'tellrequest.showOptionsPage'
        });
    });
    dialog.addEventListener('close', _ => {
        dialog.remove();
        promise.resolve();
    });
    dialog.querySelector('button[name="close"]').addEventListener('click', _ => {
        dialog.close();
    });
    dialog.querySelector('button[name="repository"]').addEventListener('click', _ => {
        promise.resolve('repository');
        dialog.close();
    });
    dialog.querySelector('button[name="owner"]').addEventListener('click', _ => {
        promise.resolve('owner');
        dialog.close();
    });
    document.body.append(dialog);
    dialog.showModal();

    switch (await promise) {
        case 'repository':
            await setConfig('security.repositories.allowed', allowedRepositories.concat([`${owner}/${repository}`]));
            return true;
        case 'owner':
            await setConfig('security.owners.allowed', allowedOwners.concat([owner]));
            return true;
        default:
            return false;
    }
};
