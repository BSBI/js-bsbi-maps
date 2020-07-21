/**
 *
 * @param {Array.<number[]>} colours
 * @return string css style
 */
export function coloured_css_gradient(colours) {
    var colourStrings = [];

    for(var colour in colours) {
        if (colours.hasOwnProperty(colour)) {

            colourStrings.push('#' +
                ('0' + colours[colour][0].toString(16)).substr(-2) +// hex value padded to two digits
                ('0' + colours[colour][1].toString(16)).substr(-2) +
                ('0' + colours[colour][2].toString(16)).substr(-2)
            );
        }
    }
    return "background: linear-gradient(to right," + colourStrings.join(',') + ");";
}
