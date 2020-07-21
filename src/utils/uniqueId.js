let counter = 0;

/**
 * generate a unique id, by appending an integer to the specified prefix
 *
 * @param {string} prefix id prefix
 * @return {string} id string
 */
export function uniqueId(prefix) {
    return prefix + counter++;
}
