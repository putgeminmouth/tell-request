// https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension
(async () => {
    const src = chrome.runtime.getURL("pull.js");
    await import(src);
})();