export function hashDate(date: Date): string {
    const timestamp = date.getTime();
    const hash = timestamp.toString(36);

    return hash.slice(-5);
}
