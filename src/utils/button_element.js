/**
 * @param {string} buttonTitle
 * @param {string} imgUrl - ideally should be a full path on the static version of the domain
 * @param {string} buttonAlt
 *
 * @return {HTMLButtonElement}
 */
export function button_element(buttonTitle, imgUrl, buttonAlt) {
    const button = document.createElement("button");
    const img = button.appendChild(document.createElement("img"));
    img.src = imgUrl;

    button.className = 'img';

    button.style.background = 'transparent';

    if (buttonAlt) {
        img.alt = buttonAlt;
    }
    button.title = buttonTitle;
    return button;
}
