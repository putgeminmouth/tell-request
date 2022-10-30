'use strict';

const defaults = {
    saveFrequency: 'auto',
    openFrequency: 'auto',
    editFrequency: 'auto',
    editOnlyOwn: true,
    language: 'en-US',
};

export const getConfig = async (name) => {
    try {
        let value = (await chrome.storage.sync.get(`options.${name}`))[`options.${name}`];
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

export const clearConfig = async () => await chrome.storage.sync.clear();

export const getConfigBytesInUse = async () => await chrome.storage.sync.getBytesInUse();