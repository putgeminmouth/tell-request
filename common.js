'use strict';

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
Extend(document.querySelectorAll(':scope > were_extending_nodelist_here'), Iterator, ['filter', 'find', 'toArray', 'distinct']);

const Element = {
    ancestors: (() => {
        const f = function* (node) {
            if (!node.parentElement) return;
            yield node.parentElement;
            yield* f(node.parentElement);
        }
        return f;
    }).apply()
};
['div', 'button'].forEach(x => Extend(document.createElement(x), Element, ['ancestors']));

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
    createElement: opts => {
        let template;
        let parent;
        if (typeof opts === 'object') {
            ({ template, parent } = opts);
        } else {
            template = opts;
        }
        parent = parent || 'div';

        const tpl = document.createElement(parent);
        tpl.innerHTML = template;
        return tpl.firstElementChild;
    }
};
