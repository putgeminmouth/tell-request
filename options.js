'use strict';

import { l10n } from './src/l10n.js';
import { getConfig, setConfig } from './src/config.js';

(async () => {

    document.querySelectorAll('input[name="saveFrequency"]').forEach(x => x.addEventListener('change', async e => {
        setConfig('saveFrequency', e.currentTarget.value);
    }));
    document.querySelector(`input[name="saveFrequency"][value="${await getConfig('saveFrequency', 'auto')}"]`).checked = true;

    const initialLanguage = await getConfig('language');
    l10n.getLocales().forEach(async l => {
        const option = document.createElement('option');
        option.setAttribute('value', l);
        option.innerHTML = l;
        if (l === initialLanguage)
            option.setAttribute('selected', 'selected');
        document.querySelector('select[name=language').append(option);
    });
    document.querySelector('select[name=language').addEventListener('change', e => {
        const value = e.target.selectedOptions[0].value;
        l10n.setLocale(value);
        setConfig('language', value);
    });


}).apply();