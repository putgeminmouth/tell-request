'use strict';

/*
    const tpl = stringTemplate('Error: ${value} must be less than ${max}!')

    * tpl({value: 100, max: 10}) === 'Error: 100 must be less than 10!'
    * tpl([100, 10]) === 'Error: 100 must be less than 10!'
    * tpl() === 'Error: ${value} must be less than ${max}!'
    * tpl.isStringTemplate === true
*/
export function stringTemplate(s) {
    let parts = [];
    let pos = 0;
    Array.from(s.matchAll(/\$\{([a-zA-Z0-9]+)\}/g)).forEach((m, i) => {
        const { 0: token, 1: name, index } = m;
        parts.push(s.slice(pos, index));
        parts.push({
            name, token, arrayIndex: i
        });
        pos = index + token.length;
    });
    parts.push(s.slice(pos));

    const tpl = function (args) {
        args = args || {};
        const builder = [];
        parts.forEach(t => {
            if (typeof (t) === 'string') {
                builder.push(t);
            }
            else if (t.name in args) {
                builder.push(args[t.name]);
            } else if (t.arrayIndex in args) {
                builder.push(args[t.arrayIndex]);
            } else {
                builder.push(t.token);
            }
        });
        return builder.join('');
    };
    Object.defineProperty(tpl, 'isStringTemplate', {
        enumerable: false,
        writable: false,
        value: true
    });
    return tpl;
}
