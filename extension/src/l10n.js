'use strict';

import { strings as enUS } from './l10n/en-US.js';
import { strings as frCA } from './l10n/fr-CA.js';

const localeStrings = [enUS, frCA];

const Failure = ({ path }) => ({
    isFailure: true,
    path,
    toString: () => `${path}`
});

export const l10n = {
    default: enUS, // set to null to display missings paths for debugging
    current: enUS,

    getLocales: () => localeStrings.map(x => x._code),
    getLocale: () => l10n.current._code,
    setLocale: l => {
        const strings = localeStrings.find(x => x._code === l);
        if (!strings) {
            console.warn(`No localization found for: '${l}'`);
            return;
        }
        l10n.current = strings;
    },

    getFrom: (strings, path, args) => {
        const parts = path.split('.')
        let node = strings;
        for (const p of parts) {
            if (!(node && p in node)) {
                console.warn(`Missing localization string: '${path}'`);
                return Failure({ path });
            }
            node = node[p];
        }
        if (node?.isStringTemplate)
            return node(args);
        else
            return node;
    },
    get: (path, args) => {
        let value = l10n.getFrom(l10n.current, path, args);
        if (value?.isFailure && l10n.default)
            value = l10n.getFrom(l10n.default, path, args);
        return value;
    }
};
