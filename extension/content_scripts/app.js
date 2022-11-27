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
import { getConfig } from '../src/config.js';
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
