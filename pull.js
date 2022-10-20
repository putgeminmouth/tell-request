'use strict';

import { GithubApi, PullRequestPage } from './github.js';
import { Opt, Promises, Try, Util, Element } from './common.js';

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

class Ids {
    static _idGen = 0;
    static nextId() { return `${++Ids._idGen}`; }
}

class Visual {
    constructor(file) {
        this.id = Ids.nextId();
        this.file = file;
        this.lineNo = null;
    }
}

class Comment extends Visual {
    constructor({ file, lineNo, text }) {
        super(file);
        this.lineNo = lineNo;
        this.text = text;
    }

    export() {
        return {
            comment: {
                context: this.file.export(),
                id: this.id,
                lineNo: this.lineNo,
                text: this.text
            }
        };
    }
}

class File {

    constructor(filename) {
        this.filename = filename;
    }

    export() {
        return { file: { filename: this.filename } };
    }
}

class Link {
    constructor({ prev, next, data }) {
        this.prev = prev;
        this.next = next;
        this.data = data;
    }
}
class Presentation {
    constructor() {
        this.visuals = [];
    }

    addOrReplaceVisual({ visual, position }) {
        const existing = this.visuals.findIndex(x => x.lineNo === visual.lineNo);
        if (existing !== -1) {
            this.visuals.splice(existing, 1);
        } else {
        }
        this.visuals.splice(isNaN(position) ? -1 : position, 0, visual);
    }

    findByLineNo(filename, lineNo) {
        return this.visuals.find(x => x.file.filename === filename && x.lineNo === lineNo);
    }

    indexOf({ id }) {
        if (id) return this.visuals.indexOf(x => x.id === id);
        return -1;
    }

    export() {
        return { visuals: this.visuals.map(x => x.export()) };
    }
}

class App {
    constructor({ github, prPage }) {
        this.github = github;
        this.prPage = prPage;
        this.presentation = new Presentation();
    }

    init(document) {
        const fileElem = document.querySelectorAll('div[data-tagsearch-path].file').first();
        this.file = this.createFile(fileElem);
    }

    export() {
        return this.presentation.export();
    }

    createFile(fileElem) {
        const file = new File(fileElem.getAttribute('data-tagsearch-path'));

        const createButton = (originalButton) => {
            const lineNo = originalButton.ancestors('td').first().previousElementSibling.getAttribute('data-line-number');

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
                            </div>
                            <div name="write" class="tabnav-content">
                                <div class="toolbar">
                                    <button name="linkTo" class="toolbar-item btn-octicon">🔗⇢</button>
                                </div>
                                <textarea class="form-control input-contrast comment-form-textarea"></textarea>
                            </div>
                            <div name="preview" class="tabnav-content">
                                <div class="toolbar">
                                    <div name="position" class="toolbar-item btn-octicon"></div>
                                </div>
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
                tr.querySelector('button[name="linkTo"]').addEventListener('click', _ => {
                    const svg = Util.createElement(`
                        <svg style="position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible">
                            <!--
                            <circle class="debug1" fill="blue" cx="0" cy="0" r="5"></circle>
                            <circle class="debug2" fill="yellow" cx="0" cy="0" r="5"></circle>
                            -->
                            <path stroke="red" stroke-width="2" fill="yellow" fill-opacity="0.5"></path>
                        </svg>
                    `);
                    const path = svg.querySelector('path');
                    // tr.querySelector('button[name="linkTo"]').after(svg);
                    document.body.append(svg);
                    document.addEventListener('mousemove', e => {
                        const getDocumentOffset = e => {
                            const r = e.getBoundingClientRect();
                            return { x: r.x + window.scrollX, y: r.y + window.scrollY };
                        };
                        const commonOrigin = getDocumentOffset(tr.querySelector('button[name="linkTo"]'));
                        const commonTarget = { x: e.pageX, y: e.pageY };
                        const calcControlPoint = ({ origin, target, focalMultiplier, bias }) => {
                            const segment = { x: target.x - origin.x, y: target.y - origin.y };
                            const ctrl = (() => {
                                const mid = { x: segment.x * bias, y: segment.y * bias };
                                // svg.querySelector('circle.debug1').setAttribute('cx', origin.x + mid.x);
                                // svg.querySelector('circle.debug1').setAttribute('cy', origin.y + mid.y);
                                const midAngle = Math.atan2(segment.y, segment.x);
                                const orthY = Math.sin(midAngle - Math.PI / 2);
                                const orthX = Math.cos(midAngle - Math.PI / 2);
                                const focalLength = focalMultiplier * Math.sqrt(mid.x * mid.x + mid.y * mid.y);
                                const focus = { x: mid.x + orthX * focalLength, y: mid.y + orthY * focalLength };
                                // svg.querySelector('circle.debug2').setAttribute('cx', origin.x + focus.x);
                                // svg.querySelector('circle.debug2').setAttribute('cy', origin.y + focus.y);
                                return focus;
                            }).apply();
                            return { segment, ctrl };
                        };
                        const commonSegment = { x: Math.abs(commonTarget.x - commonOrigin.x), y: Math.abs(commonTarget.y - commonOrigin.y) };
                        const d = commonSegment.x > commonSegment.y;
                        const dx = d ? 0 : 5;
                        const dy = d ? -5 : 0;
                        const path1 = (() => {
                            const origin = { x: commonOrigin.x - dx, y: commonOrigin.y - dy };
                            const target = commonTarget;
                            const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: 1.6, bias: 0.2 });
                            return `l ${-dx} ${-dy} q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
                        }).apply();
                        const path2 = (() => {
                            const origin = commonTarget;
                            const target = { x: commonOrigin.x + dx, y: commonOrigin.y + dy };
                            const { segment, ctrl } = calcControlPoint({ origin, target, focalMultiplier: -0.6, bias: 0.8 });
                            return `q ${ctrl.x} ${ctrl.y} ${segment.x} ${segment.y}`;
                        }).apply();
                        path.setAttribute('d', `M ${commonOrigin.x} ${commonOrigin.y} ${path1} ${path2} L ${commonOrigin.x} ${commonOrigin.y}`);

                        const other = document.elementsFromPoint(e.clientX, e.clientY)
                            .find(x => x.matches(`tr.${MAGIC} :scope`));

                        if (other) {
                            const otherAncestor = Element.ancestors(other).find(x => x.matches(`tr.${MAGIC}`));
                            document.querySelectorAll('.visual-linker-over').toArray().forEach(x => x.classList.remove('visual-linker-over'));
                            otherAncestor.classList.add('visual-linker-over');
                        }
                    });
                });

                let currentVisual = new Comment({ file, lineNo, text: '' });
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
                    textarea.value = currentVisual.text || '';
                    tr.querySelector('button[name="preview"]').click();
                });
                tr.querySelector('button[name="save"]').addEventListener('click', async e => {
                    const text = textarea.value;
                    currentVisual.text = text;
                    this.presentation.addOrReplaceVisual({ visual: currentVisual });
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
