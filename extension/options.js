'use strict';

import { l10n } from './src/l10n.js';
import { getConfig, setConfig, updateConfig, clearConfig, getConfigBytesInUse } from './src/config.js';
import './src/ui/svg.js';
import { Shortcut } from './src/ui/Shortcut.js';
import './src/template.js';

const init = async () => {
    document.querySelector('button[name="openInNewTab"]').addEventListener('click', _ => {
        window.open(chrome.runtime.getURL("options.html"));
        window.close();
    });

    {
        document.querySelectorAll('input[name="saveFrequency"]').forEach(x => x.addEventListener('change', async e => {
            setConfig('saveFrequency', e.currentTarget.value);
        }));
        document.querySelector(`input[name="saveFrequency"][value="${await getConfig('saveFrequency')}"]`).checked = true;
    }

    {
        const initialLanguage = await getConfig('language');
        l10n.getLocales().forEach(async l => {
            const option = document.createElement('option');
            option.setAttribute('value', l);
            option.innerHTML = l;
            if (l === initialLanguage)
                option.setAttribute('selected', 'selected');
            document.querySelector('select[name=language]').append(option);
        });
        document.querySelector('select[name=language]').addEventListener('change', e => {
            const value = e.target.selectedOptions[0].value;
            l10n.setLocale(value);
            setConfig('language', value);
        });
    }

    {
        document.querySelectorAll('input[name="editFrequency"]').forEach(x => x.addEventListener('change', async e => {
            setConfig('editFrequency', e.currentTarget.value);
        }));
        document.querySelector(`input[name="editFrequency"][value="${await getConfig('editFrequency')}"]`).checked = true;

        document.querySelectorAll('input[name="editOnlyOwn"]').forEach(x => x.addEventListener('change', async e => {
            setConfig('editOnlyOwn', e.currentTarget.checked);
        }));
        document.querySelector(`input[name="editOnlyOwn"]`).checked = !!await getConfig('editOnlyOwn');
    }

    {
        document.querySelectorAll('input[name="openFrequency"]').forEach(x => x.addEventListener('change', async e => {
            setConfig('openFrequency', e.currentTarget.value);
        }));
        document.querySelector(`input[name="openFrequency"][value="${await getConfig('openFrequency')}"]`).checked = true;
    }

    {
        document.querySelectorAll('input[name="enableGlobalKeyboardShortcuts"]').forEach(x => x.addEventListener('change', async e => {
            setConfig('enableGlobalKeyboardShortcuts', e.currentTarget.checked);
        }));
        document.querySelector(`input[name="enableGlobalKeyboardShortcuts"]`).checked = !!await getConfig('enableGlobalKeyboardShortcuts');

        const customizeDialog = document.querySelector('dialog[name="keyboardShortcuts"]');
        document.querySelector('button[name="customize"]').addEventListener('click', _ => {
            customizeDialog.showModal();
        });

        {
            const dialog = customizeDialog;
            dialog.querySelector('button[name="close"]').addEventListener('click', _ => dialog.close());
            const setupShortcut = async name => {
                const { enabled: initialEnabled, shortcut: initialShortcutJson } = (await getConfig(`shortcuts`))[name] || {};
                console.log(JSON.stringify(await getConfig(`shortcuts`)), initialEnabled, JSON.stringify(initialShortcutJson));
                let initialShortcut = new Shortcut(initialShortcutJson);

                const enabledInput = dialog.querySelector(`input[name="shortcuts.${name}.enabled"]`);
                enabledInput.checked = !!initialEnabled;
                enabledInput.addEventListener('change', async _ => {
                    await updateConfig(`shortcuts`, x => {
                        x[name].enabled = enabledInput.checked;
                    });

                });

                const valueInput = dialog.querySelector(`input[name="shortcuts.${name}.value"]`);
                valueInput.value = initialShortcut?.toDisplayString() ?? '';
                valueInput.setAttribute('placeholder', 'Enter a new shortcut');

                dialog.querySelector(`button[name="shortcuts.${name}"]`).addEventListener('click', _ => {
                    const cancel = () => {
                        aborter.abort();
                        valueInput.disabled = true;
                        valueInput.value = initialShortcut.toDisplayString();
                    };
                    const aborter = new AbortController();
                    valueInput.addEventListener('blur', _ => {
                        cancel();
                    }, { signal: aborter.signal });

                    valueInput.addEventListener('keydown', e => {
                        e.preventDefault();
                        e.stopPropagation();
                    }, { signal: aborter.signal });

                    valueInput.addEventListener('keyup', async e => {
                        aborter.abort();

                        const parsed = Shortcut.parseEvent(e);
                        if (!parsed.key || parsed.key === 'Escape') {
                            cancel();
                            return;
                        }
                        const shortcut = new Shortcut(parsed);
                        initialShortcut = shortcut;
                        valueInput.value = shortcut.toDisplayString();
                        valueInput.disabled = true;
                        await updateConfig(`shortcuts`, x => {
                            x[name].shortcut = shortcut.toJSON();
                        });
                    }, { signal: aborter.signal });
                    valueInput.value = '';
                    valueInput.disabled = false;
                    valueInput.focus();
                });
            };
            setupShortcut('navPrev');
            setupShortcut('navNext');
        }
    }

    {
        try {
            document.querySelector('input[name="bytesInUse"]').value = await getConfigBytesInUse();
        } catch (e) {
            console.error('Could not get bytes in use ', e);
        }
        document.querySelector('button[name="clearStorage"]').addEventListener('click', _ => {
            clearConfig();
        });
    }
};

init();
