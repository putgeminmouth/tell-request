'use strict';

import { stringTemplate as tpl } from '../stringTemplate.js';

export const strings = {
    _code: 'en-US',

    sidebar: {
        deleteButton: {
            title: 'Delete item'
        },
        navPrevButton: {
            title: 'Navigate to previous item'
        },
        navNextButton: {
            title: 'Navigate to next item'
        },
        markerHandle: {
            title: 'Drag to reorder items'
        },
        context: {
            text: tpl('${filename}: ${lineNo}')
        }
    },
    divider: {
        collapseButton: {
            title: 'Expand or collapse the sidebar'
        },
    },
    visual: {
        comment: {
            writeTab: {
                text: 'Write'
            },
            previewTab: {
                text: 'Preview'
            },
            acceptButton: {
                text: 'OK'
            },
            cancelButton: {
                text: 'Cancel'
            }
        }
    },
    settings: {
        settingsButton: {
            title: 'Click to sticky the menu'
        },
        editButton: {
            title: 'Enter Edit-Mode',
            text: 'Edit'
        },
        viewButton: {
            title: 'Enter View-Mode',
            text: 'View'
        },
        loadButton: {
            text: 'Load'
        },
        saveButton: {
            text: 'Save'
        },
        importButton: {
            text: 'Import'
        },
        exportButton: {
            text: 'Export'
        },
        importDialog: {
            title: {
                text: 'Import'
            },
            textarea: {
                placeholder: 'Enter JSON from an export'
            },
            acceptButton: {
                text: 'Import'
            },
            cancelButton: {
                text: 'Cancel'
            },
            errors: {
                invalidJson: { text: tpl('Invalid JSON: ${error}') },
                importFailed: { text: tpl('Import failed: ${error}') },
            }
        },
        exportDialog: {
            title: {
                text: 'Export'
            },
            closeButton: {
                text: 'Close'
            }
        },
        shortcutsButton: {
            title: 'Enable keyboard shortcuts while this is active'
        }
    }
};
