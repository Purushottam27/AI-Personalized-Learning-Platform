import { GeminiProvider } from "./gemini.provider.js";

let activeProvider = null;

/**
 * Returns the currently active AI provider instance.
 * Defaults to the live GeminiProvider configured from environment variables.
 * @returns {GeminiProvider|Object}
 */
export function getAiProvider() {
    if (!activeProvider) {
        activeProvider = new GeminiProvider();
    }
    return activeProvider;
}

/**
 * Sets a custom AI provider instance (e.g. for testing with deterministic mocks).
 * @param {Object} provider
 */
export function setAiProvider(provider) {
    activeProvider = provider;
}

/**
 * Resets the active AI provider back to default lazy GeminiProvider.
 */
export function resetAiProvider() {
    activeProvider = null;
}
