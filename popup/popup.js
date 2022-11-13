"use strict";

document.querySelector('button').addEventListener('click', _ => {
    chrome.runtime.openOptionsPage();
});
