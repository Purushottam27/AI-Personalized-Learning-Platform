import { ApiError } from "../../../shared/errors/ApiError.js";
import { AI_CONSTANTS, AI_ERROR_CODES } from "../constants/aiAssistant.constants.js";

/**
 * Dedicated Google Gemini API provider adapter.
 * Uses Node.js native fetch and keeps the API key strictly on the backend.
 */
export class GeminiProvider {
    constructor(config = {}) {
        this.apiKey = config.apiKey !== undefined ? config.apiKey : (process.env.GEMINI_API_KEY || null);
        this.model = config.model !== undefined && config.model !== null ? config.model : (process.env.GEMINI_MODEL || AI_CONSTANTS.DEFAULT_MODEL);
        this.timeoutMs = config.timeoutMs || AI_CONSTANTS.REQUEST_TIMEOUT_MS;
    }

    /**
     * Checks if provider has valid configuration.
     */
    isConfigured() {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }

    /**
     * Generates text response using Google Gemini API.
     * @param {Object} params
     * @param {string} params.prompt Current user question
     * @param {string} [params.systemInstruction] Optional system instruction for grounding
     * @param {Array} [params.history] Optional previous messages [{ role: "user"|"assistant", content: string }]
     * @param {number} [params.maxOutputTokens] Max output tokens
     * @returns {Promise<{ text: string, model: string }>}
     */
    async generateText({ prompt, systemInstruction = null, history = [], maxOutputTokens = AI_CONSTANTS.MAX_OUTPUT_TOKENS }) {
        if (!this.isConfigured()) {
            throw new ApiError(
                503,
                AI_ERROR_CODES.CONFIG_MISSING,
                "AI service is currently not configured on this server"
            );
        }

        const contents = [];

        // Format history (role: user -> user, assistant -> model)
        if (Array.isArray(history)) {
            for (const msg of history) {
                if (msg && msg.content && typeof msg.content === "string") {
                    contents.push({
                        role: msg.role === "assistant" ? "model" : "user",
                        parts: [{ text: msg.content.trim() }],
                    });
                }
            }
        }

        // Append current prompt
        contents.push({
            role: "user",
            parts: [{ text: prompt.trim() }],
        });

        const requestPayload = {
            contents,
            generationConfig: {
                maxOutputTokens,
                temperature: 0.3,
            },
        };

        if (systemInstruction && typeof systemInstruction === "string") {
            requestPayload.systemInstruction = {
                parts: [{ text: systemInstruction.trim() }],
            };
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

        let response;
        try {
            response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": this.apiKey,
                },
                body: JSON.stringify(requestPayload),
                signal: AbortSignal.timeout(this.timeoutMs),
            });
        } catch (networkErr) {
            if (networkErr.name === "TimeoutError" || networkErr.name === "AbortError") {
                throw new ApiError(504, AI_ERROR_CODES.PROVIDER_UNAVAILABLE, "AI service request timed out. Please try again.");
            }
            throw new ApiError(503, AI_ERROR_CODES.PROVIDER_UNAVAILABLE, "Failed to connect to AI service");
        }

        if (!response.ok) {
            const statusCode = response.status;
            let providerErrorMsg = "AI provider error";
            try {
                const errJson = await response.json();
                providerErrorMsg = errJson.error?.message || providerErrorMsg;
            } catch {
                // Ignore parse errors for non-JSON responses
            }

            if (statusCode === 429) {
                throw new ApiError(
                    429,
                    AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
                    "AI service rate limit exceeded. Please wait a moment before asking again."
                );
            }

            if (statusCode === 401 || statusCode === 403) {
                throw new ApiError(
                    503,
                    AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
                    "AI service authentication failed"
                );
            }

            if (statusCode === 404) {
                throw new ApiError(
                    503,
                    AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
                    `Configured AI model is not supported or not found: ${this.model}`
                );
            }

            throw new ApiError(
                503,
                AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
                "AI service is temporarily unavailable"
            );
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        // Extract text parts
        const textParts = candidate?.content?.parts?.filter((p) => typeof p.text === "string" && p.text.length > 0) || [];
        const text = textParts.map((p) => p.text).join("\n").trim();

        if (!text) {
            throw new ApiError(
                502,
                AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
                "AI service returned an empty response"
            );
        }

        return {
            text,
            model: this.model,
        };
    }
}
