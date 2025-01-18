interface CookieOptions {
    sameSite?: "Strict" | "Lax" | "None";
    httpOnly?: boolean;
    path?: string;
    secure?: boolean;
    maxAge?: number;
    domain?: string;
}
export function serializeCookie(
    name: string,
    value: string,
    options?: CookieOptions
) {
    let cookieVal = name + "=" + value;

    if (options?.maxAge) {
        cookieVal += "; Max-Age=" + Math.floor(options.maxAge);
    }

    if (options?.domain) {
        cookieVal += "; Domain=" + options.domain;
    }

    if (options?.path) {
        cookieVal += "; Path=" + options.path;
    }

    // if (opt.expires) {
    //     var expires = opt.expires;

    //     if (!isDate(expires) || isNaN(expires.valueOf())) {
    //         throw new TypeError("option expires is invalid");
    //     }

    //     str += "; Expires=" + expires.toUTCString();
    // }

    if (options?.httpOnly) {
        cookieVal += "; HttpOnly";
    }

    if (options?.secure) {
        cookieVal += "; Secure";
    }

    if (options?.sameSite) {
        cookieVal += `; SameSite=${options.sameSite}`;
    }

    return cookieVal;
}
