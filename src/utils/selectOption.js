/**
 *
 * @param {HTMLSelectElement} selectEl
 * @param {string} value
 * @throws {TypeError} if value not found
 */
export function selectOption(selectEl, value) {
    try {
        selectEl.querySelector("option[value='" + value + "']").selected = true;
    } catch (e) {
        //if (e instanceof TypeError) {
        e.message += ' when trying to select option ' + value + ' of select element.';
        console.log(e.message);
        console.log(selectEl);
        console.log(e);
        throw e;
        //}
    }
}
