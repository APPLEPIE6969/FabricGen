/**
 * Smart JSON Validator & Repair Utility
 * Handles common AI model output issues before parsing
 */

export interface JsonRepairResult {
    data: unknown;
    repairs: string[];
    success: boolean;
}

const REPAIR_STRATEGIES = [
    // Strategy 1: Remove thinking/reasoning tags
    (input: string) => {
        const cleaned = input
            .replace(/<tool_call>[\s\S]*?<\/think>/gi, '')
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
            .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '');
        return { result: cleaned, repair: 'Removed thinking tags' };
    },

    // Strategy 2: Fix trailing commas
    (input: string) => {
        const cleaned = input.replace(/,(\s*[}\]])/g, '$1');
        return { result: cleaned, repair: 'Removed trailing commas' };
    },

    // Strategy 3: Fix single quotes to double quotes
    (input: string) => {
        // Only replace single quotes around property names and string values
        const cleaned = input
            .replace(/'/g, '"')
            .replace(/\\'/g, "\\'"); // Restore escaped quotes
        return { result: cleaned, repair: 'Converted single quotes to double quotes' };
    },

    // Strategy 4: Quote unquoted property names
    (input: string) => {
        const cleaned = input.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        return { result: cleaned, repair: 'Quoted unquoted property names' };
    },

    // Strategy 5: Remove JavaScript-style comments
    (input: string) => {
        const cleaned = input
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        return { result: cleaned, repair: 'Removed comments' };
    },

    // Strategy 6: Fix control characters in strings
    (input: string) => {
        const cleaned = input
            .replace(/[\x00-\x1F]/g, (char) =>
                char === '\n' ? '\\n' :
                    char === '\r' ? '\\r' :
                        char === '\t' ? '\\t' : ''
            );
        return { result: cleaned, repair: 'Escaped control characters' };
    },

    // Strategy 7: Attempt to close unclosed brackets
    (input: string) => {
        const openBraces = (input.match(/\{/g) || []).length;
        const closeBraces = (input.match(/\}/g) || []).length;
        const openBrackets = (input.match(/\[/g) || []).length;
        const closeBrackets = (input.match(/\]/g) || []).length;

        let cleaned = input;
        const repairs: string[] = [];

        const missingBraces = openBraces - closeBraces;
        const missingBrackets = openBrackets - closeBrackets;

        if (missingBraces > 0) {
            cleaned += '}'.repeat(missingBraces);
            repairs.push(`Added ${missingBraces} closing brace(s)`);
        }
        if (missingBrackets > 0) {
            cleaned += ']'.repeat(missingBrackets);
            repairs.push(`Added ${missingBrackets} closing bracket(s)`);
        }

        return { result: cleaned, repair: repairs.join(', ') || 'No bracket fixes needed' };
    },
];

/**
 * Extract JSON from various formats (markdown blocks, raw text, etc.)
 */
export function extractJsonBlock(input: string): string {
    // Try markdown json block first
    const jsonBlockMatch = input.match(/```json\s*([\s\S]*?)```/);
    if (jsonBlockMatch) return jsonBlockMatch[1].trim();

    // Try generic code block
    const genericBlockMatch = input.match(/```\s*([\s\S]*?)```/);
    if (genericBlockMatch) {
        const content = genericBlockMatch[1].trim();
        if (content.startsWith('{') || content.startsWith('[')) {
            return content;
        }
    }

    // Try to find raw JSON object/array
    const objectMatch = input.match(/\{[\s\S]*\}/);
    const arrayMatch = input.match(/\[[\s\S]*\]/);

    if (objectMatch && arrayMatch) {
        // Return whichever comes first
        return objectMatch.index! < arrayMatch.index!
            ? objectMatch[0]
            : arrayMatch[0];
    }

    return objectMatch?.[0] || arrayMatch?.[0] || input;
}

/**
 * Smart JSON parser with automatic repair
 */
export function parseJsonWithRepair(input: string): JsonRepairResult {
    const repairs: string[] = [];

    // Step 1: Extract JSON block
    let processed = extractJsonBlock(input);
    if (processed !== input) {
        repairs.push('Extracted JSON from markdown/text wrapper');
    }

    // Step 2: Try parsing as-is first
    try {
        return { data: JSON.parse(processed), repairs: [], success: true };
    } catch { }

    // Step 3: Apply repair strategies sequentially
    for (const strategy of REPAIR_STRATEGIES) {
        const { result, repair } = strategy(processed);
        if (repair && repair !== 'No bracket fixes needed') {
            repairs.push(repair);
        }

        try {
            return { data: JSON.parse(result), repairs, success: true };
        } catch {
            processed = result;
        }
    }

    // Step 4: Final attempt with all repairs applied
    try {
        return {
            data: JSON.parse(processed),
            repairs,
            success: true
        };
    } catch (error) {
        return {
            data: null,
            repairs: [...repairs, `Final parse failed: ${(error as Error).message}`],
            success: false
        };
    }
}

/**
 * Validate the structure matches expected schema
 */
export function validateModResponse(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Response must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    // Check upsert array
    if (!Array.isArray(obj.upsert)) {
        errors.push('Missing or invalid "upsert" array');
    } else {
        for (let i = 0; i < obj.upsert.length; i++) {
            const item = obj.upsert[i] as Record<string, unknown>;
            if (!item.path) errors.push(`upsert[${i}]: missing "path"`);
            if (item.content === undefined) errors.push(`upsert[${i}]: missing "content"`);
            if (!['utf-8', 'base64', 'texture_prompt'].includes(item.encoding as string)) {
                errors.push(`upsert[${i}]: invalid encoding "${item.encoding}"`);
            }
        }
    }

    // Check delete array (optional)
    if (obj.delete !== undefined && !Array.isArray(obj.delete)) {
        errors.push('"delete" must be an array of strings');
    }

    return { valid: errors.length === 0, errors };
}