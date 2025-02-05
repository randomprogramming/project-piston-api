/**
 * Replaces all non URL-legal characters with a '-'
 */
export function sanitizeURLString(input: string): string {
    return input.replace(/[^a-zA-Z0-9-]/g, "-");
}
