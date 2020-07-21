/**
 * @deprecated
 * @type {boolean}
 */
export const html5ColourSupported = true;

/**
 *
 * @param {HTMLInputElement} element
 * @param {string} colour
 * @deprecated
 */
export function set_input_colour(element, colour) {
        element.value = '#' + colour.toString().replace(/^#/, '').toLowerCase();
    }

/**
 *
 * @param {HTMLInputElement} element
 * @param {string} colour
 * @deprecated
 */
export function initialise_input_colour(element, colour) {
        element.type = 'color';
        element.value = '#' + colour.toString().replace(/^#/, '').toLowerCase();
    }

/**
 *
 * @param {HTMLInputElement} element
 * @deprecated
 * @returns {string}
 */
export function get_input_colour(element) {
        return element.value.replace(/^#/, '');
    }
