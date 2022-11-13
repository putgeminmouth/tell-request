"use strict";

import '../src/ui/svg.js';

document.querySelector('button').addEventListener('click', _ => {
    chrome.runtime.openOptionsPage();
});
