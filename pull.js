'use strict';

import { GithubApi, PullRequestPage } from './github.js';
import { Opt, Promises, Try, Util } from './common.js';

const APP_UUID = 'cc91a745-d35c-466f-9047-3f20031fb4ae';
const MAGIC = `----${APP_UUID}----`;
//----cc91a745-d35c-466f-9047-3f20031fb4ae----
//{"navigationOrder": 1}

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
    return c.comment + ((!c.comment.length || /\s$/.test(c.commenttext)) ? '' : '\n') + '<!-- ' + MAGIC + JSON.stringify(c.data) + MAGIC + ' -->';
};

class Visual {
    constructor() {
        this.lineNo = null;
    }
}

class Comment extends Visual {
    constructor({ text }) {
        super();
        this.lineNo = null;
        this.text = text;
    }

    export() {
        return {
            comment: {
                lineNo: this.lineNo,
                text: this.text
            }
        };
    }
}

class File {
    _idGen = 0;
    nextId() { return `${++_idgen}`; }

    constructor(filename) {
        this.visuals = [];
        this.visualsById = {};

        this.filename = filename;
    }

    addOrReplaceVisual(lineNo, v) {
        if (this.visualsById[lineNo]) {
            v.lineNo = lineNo;
            const index = this.visuals.findIndex(x => x.lineNo === lineNo);
            this.visuals.splice(index, 1, v);
            this.visualsById[lineNo] = v;
        } else {
            v.lineNo = lineNo;
            this.visuals.push(v);
            this.visualsById[lineNo] = v;
        }
    }

    findByLineNo(lineNo) {
        return this.visualsById[lineNo];
    }

    export() {
        return { file: { filename: this.filename, comments: this.visuals.map(x => x.export()) } };
    }
}

class App {
    constructor({ github, prPage }) {
        this.github = github;
        this.prPage = prPage;
    }

    init(document) {
        const fileElem = document.querySelectorAll('div[data-tagsearch-path].file').first();
        this.file = this.createFile(fileElem);
    }

    export() {
        return this.file.export();
    }

    createFile(fileElem) {

        const file = new File(fileElem.getAttribute('data-tagsearch-path'));

        const createButton = (originalButton) => {
            const lineNo = originalButton.ancestors('td').first().previousElementSibling.getAttribute('data-line-number');
            let originalValue = file.findByLineNo(lineNo) || new Comment({ text: '' });

            const addButton = document.createElement('button');
            addButton.classList.add('add-line-comment');
            addButton.classList.add('btn-link');
            addButton.innerHTML = originalButton.innerHTML;
            addButton.style.backgroundColor = 'red';
            addButton.style.left = '20px';
            originalButton.parentElement.prepend(addButton)

            addButton.addEventListener('click', e => {
                const tr = Util.createElement({
                    parent: 'tbody', template: `
                    <tr class="${MAGIC} inline-comments">
                        <td class="line-comments" colspan="4">
                            <div class="comment-form-head tabnav d-flex flex-justify-between mb-2">
                                <nav class="tabnav-tabs">
                                    <button type="button" name="write" class="btn-link tabnav-tab write-tab">Write</button>
                                    <button type="button" name="preview" class="btn-link tabnav-tab write-tab">Preview</button>
                                </nav>
                            <div class="toolbar">
                            </div>
                            </div>
                            <div name="write" class="tabnav-content">
                                <textarea class="form-control input-contrast comment-form-textarea"></textarea>
                            </div>
                            <div name="preview" class="tabnav-content">
                                <div class="comment-body markdown-body"></div>
                            </div>
                            <div class="form-actions">
                                <button type="button" name="save" class="btn btn-primary">Save</button>
                                <button type="button" name="cancel" class="btn">Cancel</button>
                            </div>
                        </td>
                    </tr>
                `});
                const textarea = tr.querySelector('textarea');

                tr.querySelectorAll('.tabnav-tabs>button').forEach(button => {
                    const name = button.name;
                    button.addEventListener('click', e => {
                        tr.querySelectorAll(`.tabnav-tabs>button,.tabnav-tabs,.tabnav-content`).forEach(x => {
                            x.classList.remove('selected');
                        });
                        tr.querySelectorAll(`.tabnav-tabs>button[name="${name}"],.tabnav-content[name="${name}"]`).forEach(x => {
                            x.classList.add('selected');
                        });
                    });
                });
                tr.querySelector('button[name="write"]').addEventListener('click', e => {
                    tr.querySelector('.toolbar').style.display = null;
                    textarea.focus();
                });
                let previousPreviewValue;
                tr.querySelector('button[name="preview"]').addEventListener('click', async e => {
                    tr.querySelector('.toolbar').style.display = 'none';

                    if (textarea.value === previousPreviewValue) return; // avoid api calls
                    const text = textarea.value;
                    const commentId = Util.randomItem(fileElem.querySelectorAll('.timeline-comment-group')).id.slice(1);
                    const rendered = await this.github.renderMarkdown({ authenticityToken: await this.github.pullFiles.fetchCommentCsrfToken(commentId), text });
                    tr.querySelector('.comment-body').innerHTML = rendered;
                    previousPreviewValue = text;
                });

                tr.querySelector('button[name="cancel"]').addEventListener('click', e => {
                    textarea.value = originalValue.text;
                    tr.querySelector('button[name="preview"]').click();
                });
                tr.querySelector('button[name="save"]').addEventListener('click', async e => {
                    const text = textarea.value;
                    const comment = new Comment({ text });
                    originalValue = comment;
                    file.addOrReplaceVisual(lineNo, comment);
                    const currentValue = (await this.github.issue.fetchIssueEditForm(this.prPage.getPullId())).editForm.querySelector('textarea').value;
                    const currentParsed = parseComment(currentValue) || { comment: currentValue, data: {} };
                    currentParsed.data = this.export();
                    await this.github.issue.updateIssuePart({ part: 'body', text: renderComment(currentParsed) });
                    tr.querySelector('button[name="preview"]').click();
                });

                originalButton.ancestors().filter(x => x.tagName === 'TR').first()
                    .after(tr);
                tr.querySelector('button[name="write"]').click();
            });
            return addButton;
        };

        fileElem.querySelectorAll('button.add-line-comment')
            .forEach(originalButton => createButton(originalButton));

        return file;
    }
}

let app;

document.addEventListener('readystatechange', async e => {
    if (document.readyState !== 'complete') return;
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
        app.init(document);
    }

    (() => {
        const debug = document.createElement('button');
        debug.innerHTML = 'Debug';
        debug.addEventListener('click', e => {
            const exported = JSON.stringify(app.export());
            navigator.clipboard.writeText(exported);
            console.log(exported);
        });
        document.body.prepend(debug);
    }).apply();
});
