'use strict';

import { l10n } from './src/l10n.js';
import { getConfig, setConfig, updateConfig, clearConfig, getConfigBytesInUse } from './src/config.js';
import './src/ui/svg.js';
import { Shortcut } from './src/ui/Shortcut.js';
import './src/template.js';

const initBoolean = async (name) => {
    const inputName = name;
    const configName = name;
    const input = document.querySelectorAll(`input[name="${inputName}"]`);
    input.forEach(x => x.addEventListener('change', async e => {
        awaitsetConfig(configName, e.currentTarget.checked);
    }));
    for (const x of input)
        x.checked = !!(await getConfig(configName));
};

const initRadio = async (name) => {
    const inputName = name;
    const configName = name;
    document.querySelectorAll(`input[name="${inputName}"]`).forEach(x => x.addEventListener('change', async e => {
        await setConfig(configName, e.currentTarget.value);
    }));
    document.querySelector(`input[name="${inputName}"][value="${await getConfig(configName)}"]`).checked = true;

};

const init = async () => {
    document.querySelector('button[name="openInNewTab"]').addEventListener('click', _ => {
        window.open(chrome.runtime.getURL("options.html"));
        window.close();
    });

    {
        await initRadio('saveFrequency');
    }

    {
        const initialLanguage = await getConfig('language');
        l10n.getLocales().forEach(async l => {
            const option = document.createElement('option');
            option.setAttribute('value', l);
            option.innerHTML = l;
            if (l === initialLanguage)
                option.setAttribute('selected', 'selected');
            document.querySelector('select[name="language"]').append(option);
        });
        document.querySelector('select[name="language"]').addEventListener('change', e => {
            const value = e.target.selectedOptions[0].value;
            l10n.setLocale(value);
            setConfig('language', value);
        });
    }

    {
        await initRadio('editFrequency');
        await initBoolean('editOnlyOwn');
    }

    {
        await initRadio('openFrequency');
    }

    {
        const input = document.querySelector('input[name="inlineModePattern"]');
        document.querySelector('input[name="inlineModePattern"]').addEventListener('change', e => {
            try {
                new RegExp(input.value);
                input.classList.remove('error');
            } catch (e) {
                input.classList.add('error');
                return;
            }
            setConfig('inlineModePattern', input.value);
        });
        input.value = await getConfig('inlineModePattern');
    }

    {
        await initBoolean('enableGlobalKeyboardShortcuts');

        const customizeDialog = document.querySelector('dialog[name="keyboardShortcuts"]');
        document.querySelector('button[name="customize"]').addEventListener('click', _ => {
            customizeDialog.showModal();
        });

        {
            const dialog = customizeDialog;
            dialog.querySelector('button[name="close"]').addEventListener('click', _ => dialog.close());
            const setupShortcut = async name => {
                const { enabled: initialEnabled, shortcut: initialShortcutJson } = (await getConfig(`shortcuts`))[name] || {};

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
        await initBoolean('security.enableRepositoryWhitelist');
        await initRadio('security.promptUnknownRepository');

        const dialog = document.querySelector('dialog[name="allowedRepositoriesDialog"]');
        document.querySelector('button[name="editAllowedRepositories"]').addEventListener('click', _ => {
            dialog.showModal();
        });
        dialog.querySelector('button[name="close"]').addEventListener('click', _ => dialog.close());

        ['repositories', 'owners'].forEach(async type => {
            const configName = `security.${type}.allowed`;
            const allowedSelect = dialog.querySelector(`select[name="${type}.allowed"]`);

            const configValues = await getConfig(configName);
            configValues.forEach(async l => {
                const option = document.createElement('option');
                option.setAttribute('value', l);
                option.innerHTML = l;
                allowedSelect.append(option);
            });

            dialog.querySelector(`button[name="${type}.delete"]`).addEventListener('click', async _ => {
                Array.from(allowedSelect.selectedOptions).forEach(x => x.remove());
                await setConfig(configName, Array.from(allowedSelect.options).map(x => x.value));
            });
        });
    }

    {
        await initRadio('licenseType');

        switch (await getConfig('licenseType')) {
            case 'pro':
                document.querySelector(`div[name="licenseTypeText"]`).innerText = 'Thank you for upgrading to the pro version! 👍';
                break;
            default:
            case 'basic':
                document.querySelector(`div[name="licenseTypeText"]`).innerHTML = 'Please consider upgrading to the pro version! 🙇‍♀️ Click <button name="licenseDetails">here</button> for details.';
                break;
        }

        document.querySelector('button[name="licenseDetails"]').addEventListener('click', _ => {
            window.open('https://github.com/putgeminmouth/tell-request/blob/master/PLANS.md');
        });
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
