/**
 *
 * @param {Element} el
 * @param {string} className
 * @deprecated
 */
export function remove_class(el, className) {
    if ("classList" in el) {
        el.classList.remove(className);
    }
}
