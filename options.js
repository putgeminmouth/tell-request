'use strict';

import { getConfig, setConfig } from './src/config.js';

(async () => {

    document.querySelectorAll('input[name="saveFrequency"]').forEach(x => x.addEventListener('change', async e => {
        setConfig('saveFrequency', e.currentTarget.value);
    }));

    const initCurrentValues = async () => {
        document.querySelector(`input[name="saveFrequency"][value="${await getConfig('saveFrequency', 'auto')}"]`).checked = true;
    };

    await initCurrentValues();

}).apply();