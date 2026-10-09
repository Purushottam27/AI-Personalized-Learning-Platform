export function normalizeQuestionText(text) {
    if (typeof text !== 'string') return '';
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
}
