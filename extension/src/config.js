'use strict';

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
    licenseType: 'basic'
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

export const updateConfig = async (name, updator) => {
    const currentValue = await getConfig(name);
    const newValue = await updator(currentValue) ?? currentValue;
    return await setConfig(name, newValue);
};

export const clearConfig = async () => await chrome.storage.sync.clear();

export const getConfigBytesInUse = async () => await chrome.storage.sync.getBytesInUse();