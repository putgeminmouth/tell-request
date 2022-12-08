'use strict';

import { Promises, Util } from './common.js';

// many params seem optional but we should play nice and send them where possible

export class PullFilesApi {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetchCommentEditForm(commentId) {
        // ?textarea_id=discussion_r991686173-body
        // ?comment_context=diff

        const response = await fetch(`${this.baseUrl}/review_comment/${commentId}/edit_form`, {
            headers: {
                accept: 'text/html',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        const text = await response.text();
        const container = document.createElement('div');
        container.innerHTML = text;
        const editForm = container.querySelector('form');
        const csrfToken = container.querySelector('input[data-csrf]')?.value;
        return {
            editForm,
            csrfToken
        };
    }
    async fetchCommentCsrfToken(commentId) {
        const { csrfToken } = await this.fetchCommentEditForm(commentId);
        return csrfToken;
    }
    async editComment({ commentId, text }) {
        const { editForm } = await this.fetchCommentEditForm(commentId);
        editForm.querySelector('textarea').value = text;
        editForm.querySelector('button[type="submit"]').click();
        // can't really actually await the xhr unless we wanna do it ourselves
    }
}

export class IssueApi {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetchIssueEditForm(issueId) {
        // ?textarea_id=issuecomment-1279761763-body
        // ?comment_context=diff

        const response = await fetch(`${this.baseUrl}/issues/${issueId}/edit_form`, {
            headers: {
                // this request in particular is picky about these headers
                // added to others for uniformity
                accept: 'text/html',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        const text = await response.text();
        const editForm = Util.createElement(`
        <form class="mt-2 js-comment-update" data-type="json" data-turbo="false" action="/putgeminmouth/testingstuff/issues/1/" accept-charset="UTF-8" method="post">
        ${text}
        </form>
    `);
        // form data-type="json" data-turbo="false" action="/putgeminmouth/testingstuff/pull/1/review_comment/996306054" accept-charset="UTF-8" method="post"
        // editForm.innerHTML = text;
        const csrfToken = editForm.querySelector('input[data-csrf]')?.value;
        return {
            editForm,
            csrfToken
        };
    }
    async fetchCommentEditForm(commentId) {
        // ?textarea_id=issuecomment-1279761763-body
        // ?comment_context=diff

        const response = await fetch(`issue_comments/${commentId}/edit_form`, {
            headers: {
                accept: 'text/html',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        const text = await response.text();
        const editForm = document.createElement('div');
        editForm.innerHTML = text;
        const csrfToken = editForm.querySelector('input[data-csrf]')?.value;
        return {
            editForm,
            csrfToken
        };
    }
    async editComment({ commentId, text }) {
        const { editForm, csrfToken } = await this.fetchCommentEditForm(commentId);
        editForm.querySelector('textarea').value = text;
        editForm.querySelector('button[type="submit"]').click();
        // can't really actually await the xhr unless we wanna do it ourselves
    }
    async updateIssuePart({ part, text }) {
        const editForm = document.querySelector('.gh-header-edit form');

        const url = editForm.getAttribute('action');
        const formEntries = editForm.querySelectorAll('input').filter(x => !!x.name).map(x => [x.name, x.value]).toArray();
        const target = formEntries.find(x => x[0] === 'issue[title]');
        target[0] = `issue[${part}]`;
        target[1] = text;
        await fetch(url, {
            method: editForm.getAttribute('method'),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formEntries).toString()
        });
    }
}

export class GithubApi {

    constructor({ repositoryUrl, pullUrl }) {
        this.repositoryUrl = repositoryUrl;
        this.pullUrl = pullUrl;
        this.pullFiles = new PullFilesApi(pullUrl);
        this.issue = new IssueApi(repositoryUrl);
        this.previewAuthenticityToken = null;
    }
    async renderMarkdown({ authenticityToken, text }) {
        if (!text) return '';
        // ?markdown_unsupported=false
        // ?pull_request=1076559894
        // ?repository=545729983
        // form: comment_id=991686173
        const params = [
            ['authenticity_token', authenticityToken || this.previewAuthenticityToken],
            ['text', text]
        ];
        const response = await fetch(`/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString()
        });
        if (response.status === 200)
            return await response.text();
        else
            return text;
    }
}

export class PullRequestPage {
    parseUrl() {
        const m = /https:\/\/.*\/(?<owner>[^/]+)\/(?<repo>[^/]+)\/pull\/(?<pull>[^/]+)/.exec(window.location.toString());
        return {
            owner: m.groups.owner,
            repository: m.groups.repo,
            pull: m.groups.pull,
        };
    }
    getPullId() {
        return window.location.toString().replace(/.*\/pull\/([^\/]+)\/.*/, '$1');
    }

    getRandomCommentId() {
        return Util.randomItem(document.body.querySelectorAll('.timeline-comment-group'))?.id.slice(1) || Math.random().toString();
    }

    getAuthorGibhubId() {
        return document.querySelector('a.author')?.getAttribute('href').replace(/[^/]*\//, '');
    }

    getCurrentUserGithubId() {
        return document.querySelector('meta[name="user-login"]')?.getAttribute('content');
    }

    getCommentBodies() {
        return document.querySelectorAll('.comment-body');

    }
    getCommentHolders() {
        return document.querySelectorAll('.comment-holder');
    }

    getPreviewAuthenticityToken() {
        const button = document.querySelector('button.add-line-comment');
        if (!button) return; // not logged in
        const buttonTR = button.ancestors().find(x => x.tagName === 'TR');
        document.querySelector('button.add-line-comment').click();

        const nextTR = buttonTR.nextElementSibling;
        const authenticityToken = nextTR.querySelector('form[action$="/create"] input.js-data-preview-url-csrf').value;
        nextTR.querySelectorAll('[data-confirm-cancel-text]').forEach(x => x.click());
        return authenticityToken;
    }

    getFileElementForFile(filename) {
        return document.querySelector(`#files .file .file-header[data-path="${filename}"]`).ancestors(x => x.classList.contains('file')).first();
    }
    getFileElementAtPosition(position) {
        return Array.from(document.querySelectorAll(`#files .file`)).slice(position, position + 1).first();
    }
    moveFileToPosition(filename, position) {
        const toMove = this.getFileElementForFile(filename);
        if (position === Array.from(this.getFiles().elements).length)
            toMove.parentElement.append(toMove);
        else {
            const dest = this.getFileElementAtPosition(position);
            dest.before(toMove);
        }
    }
    getFiles() {
        const elements = document.querySelectorAll('#files .file');
        return {
            elements,
            getFilenames: () => elements.map(x => x.querySelector('.file-header')).map(x => x.getAttribute('data-path'))
        };
    }

    fileTreeHasDirectories() {
        return !!document.querySelector('[data-tree-entry-type="directory"]');
    }
}

