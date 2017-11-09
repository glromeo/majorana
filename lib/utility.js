export function isGenerator(fn) {
    return fn && fn.constructor[Symbol.toStringTag] === "GeneratorFunction";
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
