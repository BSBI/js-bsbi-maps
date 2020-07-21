/**
 *
 * @param {Element} el
 * @param {string} className
 * @returns {boolean}
 */
export function has_class(el, className) {
    return ("classList" in el) && el.classList.contains(className);
}
