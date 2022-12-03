'use strict';

chrome.runtime.onMessage.addListener(({ type }) => {
    if (type === "tellrequest.showOptionsPage") {
        chrome.runtime.openOptionsPage();
    }
});
