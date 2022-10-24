'use strict';

const APP_UUID = 'cc91a745-d35c-466f-9047-3f20031fb4ae';
export const MAGIC = `----${APP_UUID}----`;

const Extend = (to, from, props) => {
    const proto = to.constructor.prototype;
    props.forEach(prop => {
        Object.defineProperty(proto, prop, {
            writable: false,
            enumerable: false,
            value: function () { return from[prop].apply(null, [this].concat(Array.from(arguments))); }
        });
    });
};

const Iterator = {
    filter: function* (it, f) {
        for (const i of it)
            if (f(i))
                yield i;
    },
    first: it => it.next ? it.next()?.value : it[0],
    find: (it, f) => it.filter(f).first(),
    map: function* (it, f) {
        for (const i of it)
            yield f(i);
    },
    // from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
    flatten: function* (it, depth) {
        if (depth === undefined) {
            depth = 1;
        }

        for (const item of it) {
            if ((typeof item?.length === 'number' || typeof item?.next === 'function') && depth > 0) {
                yield* item.flatten(depth - 1);
            } else {
                yield item;
            }
        }
    },
    flatMap: function* (it, f) {
        yield* it.map(f).flatten();
    },
    toArray: it => Array.from(it),
    distinct: it => new Set(it).values()
};
Extend([].values(), Iterator, ['filter', 'first', 'find', 'toArray', 'map', 'flatMap', 'flatten', 'distinct']);
// Extend(new Set().values(), Iterator, ['filter', 'first', 'find', 'toArray', 'map', 'flatMap', 'flatten', 'distinct']);
Extend(document.querySelectorAll(':scope > were_extending_nodelist_here_but_dont_want_to_match_anything'), Iterator, ['filter', 'find', 'toArray', 'distinct']);

export const Element = {
    ancestors: (() => {
        const f = function* (node) {
            if (!node.parentElement) return;
            yield node.parentElement;
            yield* f(node.parentElement);
        }
        return f;
    }).apply()
};
['div', 'span', 'button', 'a', 'p', 'td', 'tr'].forEach(x => Extend(document.createElement(x), Element, ['ancestors']));
Object.defineProperty(HTMLElement, 'ancestors', {
    writable: false,
    enumerable: false,
    value: function () { return Element['ancestors'].apply(null, [this].concat(Array.from(arguments))); }
});

export const Promises = {
    create: () => {
        let resolve, reject;
        const p = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });
        p.resolve = resolve;
        p.reject = reject;
        return p;
    },
    delay: millis => {
        const p = Promises.create();
        setTimeout(() => p.resolve(), millis);
        return p;
    }
};

export const Try = f => {
    try {
        return f();
    } catch (e) {
        console.log(e);
    }
};

export const Opt = x => x === undefined || x === null ? [] : [x];

export const Util = {
    awaitMutation: (elem, config, find) => {
        const p = Promises.create();
        const observer = new MutationObserver(mutations => {
            const found = find(mutations);
            if (found !== null && found !== undefined) p.resolve(found);
        });
        observer.observe(elem, config);
        elem[`observer_counter`] = elem[`observer_counter`] || 1;
        elem[`observer_${elem[`observer_counter`]++}`] = observer;
        return p;
    },
    randomItem: it => {
        const arrayLike = it.length ? it : Array.from(it);
        return arrayLike[Math.floor(Math.random() * arrayLike.length)];
    },
    createElement: template => {
        const tpl = document.createElement('template');
        tpl.innerHTML = template;
        return tpl.content.firstElementChild;
    },
    createEventTarget: () => {
        const underlying = document.createElement('div');
        const eventMethods = ['addEventListener', 'removeEventListener', 'dispatchEvent'];
        const handler = {};
        handler.attach = target => eventMethods.forEach(x => target[x] = function () { return handler[x].apply(handler, arguments) });
        eventMethods.forEach(x => handler[x] = underlying[x].bind(underlying));
        return handler;
    },
    addPromisesToEventDetail: detail => {
        detail = detail || {};
        detail._promises = [];
        detail.promise = () => {
            const p = Promises.create();
            detail._promises.push(p);
            return p;
        };
        detail.awaitPromises = async () => await Promise.all(detail._promises);
        return detail;
    },
};
