'use strict';

import { Promises } from "./common.js";

const defaults = {
    saveFrequency: 'auto',
    openFrequency: 'auto',
    editFrequency: 'auto',
    editOnlyOwn: true,
    language: 'en-US',
    shortcuts: {
        navPrev: {
            enabled: true,
            shortcut: { key: 'ArrowLeft' }

        },
        navNext: {
            enabled: true,
            shortcut: { key: 'ArrowRight' }
        }

    },
    inlineModePattern: '^tr#(\\d+)\\s+(.*)',
    licenseType: 'basic',
    'security.enableRepositoryWhitelist': true,
    'security.promptUnknownRepository': 'detect',
    'security.repositories.allowed': [],
    'security.owners.allowed': [],
};

export const getConfig = async (name) => {
    const promise = Promises.create();
    try {
        // MDN claims this returns a promise but FF 107.0.1 doesn't...
        chrome.storage.sync.get(`options.${name}`, x => promise.resolve(x));
        const storageValue = await promise;
        if (storageValue === undefined) {
            console.warn(`chrome.storage.sync unavailable on get '${name}'`);
            storageValue = {};
        }

        let value = storageValue[`options.${name}`];
        if (value === undefined)
            value = defaults[name];
        return value;
    } catch (e) {
        console.error(`Could not fetch config: '${name}`, e);
        return defaults[name];
    }
};

export const setConfig = async (name, value) => {
    return await chrome.storage.sync.set({ [`options.${name}`]: value });
};

export const updateConfig = async (name, updator) => {
    const currentValue = await getConfig(name);
    const newValue = await updator(currentValue) ?? currentValue;
    return await setConfig(name, newValue);
};

export const clearConfig = async () => await chrome.storage.sync.clear();

export const getConfigBytesInUse = async () => await chrome.storage.sync.getBytesInUse();
