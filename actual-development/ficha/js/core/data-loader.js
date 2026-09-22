// core/data-loader.js — Generic JSON data loader
'use strict';

/**
 * Creates a managed data loader for a JSON endpoint.
 * Encapsulates the loading/error/data state that was duplicated across
 * inventory.js, powers.js, and magias.js.
 *
 * @param {string} path        URL path to the JSON file
 * @param {string} label       Human-readable label for console logs (e.g. "Inventário")
 * @param {string} [arrayKey]  If the JSON wraps the array in an object, the key to extract (e.g. "itens", "magias")
 * @returns {object}           { load(), getData(), isLoading(), hasError() }
 *
 * Usage:
 *   const loader = createDataLoader('/data/itens.json', 'Inventário', 'itens');
 *   await loader.load();
 *   const items = loader.getData(); // []
 *   if (loader.hasError()) { ... }
 */
export function createDataLoader(path, label, arrayKey = null) {
    let data = [];
    let loading = true;
    let error = false;

    async function load() {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (arrayKey && json[arrayKey]) {
                data = Array.isArray(json[arrayKey]) ? json[arrayKey] : [];
            } else if (Array.isArray(json)) {
                data = json;
            } else {
                data = [];
            }
            error = false;
            console.log(`[${label}] Carregados ${data.length} registros`);
        } catch (err) {
            console.error(`[${label}] Erro ao carregar ${path}:`, err);
            data = [];
            error = true;
        } finally {
            loading = false;
        }
    }

    return {
        load,
        getData: () => data,
        isLoading: () => loading,
        hasError: () => error
    };
}
