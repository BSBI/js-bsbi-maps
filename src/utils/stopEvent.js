/**
 *
 * @param {Event} event
 * @returns {boolean} false
 */
export function stop_event(event) {

    if (event) {
        if (event.stopPropagation) {
            event.stopPropagation();
        } else {
            event.cancelBubble = true; // for old IE
        }

        if (event.preventDefault) {
            event.preventDefault(); // DOM 2
        } else {
            event.returnValue = false; // IE
        }
    }
    return false;
}
