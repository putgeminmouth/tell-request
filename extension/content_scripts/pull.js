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

        if (LightApp.getCommentBodies(prPage).first()) {
            app = new LightApp({ document, github, prPage });
        } else {
            app = new DefaultApp({ document, github, prPage });
        }
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
