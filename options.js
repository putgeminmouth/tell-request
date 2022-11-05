'use strict';

import { l10n } from './src/l10n.js';
import { getConfig, setConfig, clearConfig, getConfigBytesInUse } from './src/config.js';

(async () => {

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
}).apply();