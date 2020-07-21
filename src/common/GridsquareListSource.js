
import {EventHarness} from "../framework/EventHarness";

const tetradLettersRowFirst = 'AFKQVBGLRWCHMSXDINTYEJPUZ';

/**
 * abstract class providing access to gridsquare list occurrence data in various formats
 *
 * @constructor
 */
export class GridsquareListSource extends EventHarness {
    static gbLetterMapping = {
        'A': 0,
        'B': 1,
        'C': 2,
        'D': 3,
        'E': 4,
        'F': 5,
        'G': 6,
        'H': 7,
        'J': 8,
        'K': 9,
        'L': 10,
        'M': 11,
        'N': 12,
        'O': 13,
        'P': 14,
        'Q': 15,
        'R': 16,
        'S': 17,
        'T': 18,
        'U': 19,
        'V': 20,
        'W': 21,
        'X': 22,
        'Y': 23,
        'Z': 24
    };

    /**
     *
     * @type {{A: number[], B: number[], C: number[], D: number[], F: number[], G: number[], H: number[], J: number[], L: number[], M: number[], N: number[], O: number[], Q: number[], R: number[], S: number[], T: number[], V: number[], W: number[], X: number[], Y: number[]}}
     */
    static ieLetterMapping = {
        A: [0, 4],
        B: [1, 4],
        C: [2, 4],
        D: [3, 4],
        F: [0, 3],
        G: [1, 3],
        H: [2, 3],
        J: [3, 3],
        L: [0, 2],
        M: [1, 2],
        N: [2, 2],
        O: [3, 2],
        Q: [0, 1],
        R: [1, 1],
        S: [2, 1],
        T: [3, 1],
        V: [0, 0],
        W: [1, 0],
        X: [2, 0],
        Y: [3, 0]
    };

    /**
     *
     * @type {{ci: {width: number, height: number}, gb: {width: number, height: number}, ie: {width: number, height: number}}}
     */
    static nationalGridDimensions = {
        'gb': {width: 7, height: 13},
        'ie': {width: 4, height: 5},
        'ci': {width: 1, height: 2}
    };

    /**
     * cell square dimensions in metres
     * @type {{"0": number, "1": number, "2": number, "3": number, "4": number, "5": number, "6": number, "7": number}}
     */
    static precisionCellWidths = {
        0: 0, // invalid
        1: 100000,
        2: 10000,
        3: 2000,
        4: 1000,
        5: 100,
        6: 10,
        7: 1
    };

    /**
     * returns gridref broken into x,y square offsets at each precision level
     * (100km, 10km, 2km, 1km, 100m, ...)
     *
     * @param {string} ref
     * @param {string} countryCode
     * @returns {Array.<number>}
     */
    static interleave_gr = function (ref, countryCode) {
        const interleaved = [];

        if (countryCode === 'gb') {
            let char1 = GridsquareListSource.gbLetterMapping[ref[0]];
            let char2 = GridsquareListSource.gbLetterMapping[ref[1]];

            ref = ref.substr(2);

            // units of x,y are 100km
            let x = Math.floor((((char1 % 5) * 500) + ((char2 % 5) * 100) - 1000) / 100);
            let y = Math.floor(((-Math.floor(char1 / 5) * 500) - (Math.floor(char2 / 5) * 100) + 1900) / 100);

            interleaved[0] = (y * GridsquareListSource.nationalGridDimensions.gb.width) + x;
        } else if (countryCode === 'ie') {
            // Ireland

            let letterMapping = GridsquareListSource.ieLetterMapping[ref[0]];
            interleaved[0] = (letterMapping[1] * GridsquareListSource.nationalGridDimensions.ie.width) + letterMapping[0];

            ref = ref.substr(1);
        } else {
            // CI WA => 0 WV => 1

            interleaved[0] = (ref[1] === 'V') ? 0 : 1;
            ref = ref.substr(2);
        }

        var length = ref.length;

        // hectad square
        interleaved[1] = (ref[Math.floor(length / 2)] * 10) + parseInt(ref[0], 10); // (x * 10) + y

        if (length === 3) {
            // have explicit tetrad

            interleaved[2] = tetradLettersRowFirst.indexOf(ref[2]);
        } else if (length > 2) {
            // calculate the implicit tetrad

            let x = Math.floor(ref[1] / 2);
            let y = Math.floor(ref[(length / 2) + 1] / 2);
            interleaved[2] = (y * 5) + x;

            // monad needs rescaling to a 2x2 tetrad subdivision
            interleaved[3] = ((ref[(length / 2) + 1] % 2) * 2) + (parseInt(ref[1], 10) % 2);

            // starting with 100m squares continue to end of grid-ref
            for (let p = 2; p < length / 2; p++) {
                interleaved[p + 2] = (ref[(length / 2) + p] * 10) + parseInt(ref[p], 10);
            }
        }

        return interleaved;
    }
}

