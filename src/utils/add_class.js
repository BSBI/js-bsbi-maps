/**
 * @deprecated use classList.add directly
 * @param {Element} el
 * @param {string} className
 */
export function add_class(el, className) {
    if ("classList" in el) {
        el.classList.add(className);
    }
}
