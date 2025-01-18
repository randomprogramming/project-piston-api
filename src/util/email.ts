export function hideEmail(email: string) {
    if (!email.includes("@")) {
        return email;
    }

    const [handle, provider] = email.split("@");
    if (handle.length <= 2) {
        return `${"*".repeat(handle.length)}@${provider}`;
    }

    const handleFirstChar = handle[0];
    const masked = "*".repeat(handle.length - 2);
    const handleLastChar = handle[handle.length - 1];

    return `${handleFirstChar}${masked}${handleLastChar}@${provider}`;
}
