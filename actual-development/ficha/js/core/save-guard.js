// Decisões puras do save/realtime. Sem DOM, para o load não redesenhar o eco
// da própria gravação e para um setDoc em voo não ser atropelado por outro.

export function fingerprintSheet(data) {
    return JSON.stringify(canonicalize(data));
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            if (value[key] === undefined) continue;
            out[key] = canonicalize(value[key]);
        }
        return out;
    }
    return value;
}

/**
 * Leitores sempre aplicam o snapshot.
 * Editores ignoram o remoto enquanto um save local está em voo ou agendado,
 * e ignoram o eco da gravação que acabaram de enviar.
 */
export function shouldApplyRemoteSnapshot({
    permission,
    saveInFlight = false,
    saveTimerActive = false,
    remoteFingerprint = null,
    knownSentFingerprints = null,
} = {}) {
    if (permission === 'read') return true;
    if (saveInFlight || saveTimerActive) return false;
    if (remoteFingerprint && knownSentFingerprints?.has(remoteFingerprint)) return false;
    return true;
}
