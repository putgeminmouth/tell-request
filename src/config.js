'use strict';

export const getConfig = async (name, defaultValue) => {
    return (await chrome.storage.sync.get(`options.${name}`))[`options.${name}`];
};
export const setConfig = async (name, value) => {
    return await chrome.storage.sync.set({ [`options.${name}`]: value });
};
