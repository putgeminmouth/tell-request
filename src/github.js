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
    }
    async renderMarkdown({ authenticityToken, text }) {
        if (!text) return '';
        // ?markdown_unsupported=false
        // ?pull_request=1076559894
        // ?repository=545729983
        // form: comment_id=991686173
        const params = [
            ['authenticity_token', authenticityToken],
            ['text', text]
        ];
        const response = await fetch(`/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString()
        });
        return await response.text();
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
        return Util.randomItem(document.body.querySelectorAll('.timeline-comment-group')).id.slice(1);
    }
}
