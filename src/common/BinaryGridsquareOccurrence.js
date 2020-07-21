/**
 * @this DataView
 * @type {{"1": (number) => number, "2": (number, boolean) => number, "3": (number) => number, "4": (number, boolean) => number}}
 */
const uintFetchFunctions = {
    1 : DataView.prototype.getUint8,
    2 : DataView.prototype.getUint16,
    3 : function(offset) {
        return this.getUint32(offset, true) & 0xffffff;
    },
    4 : DataView.prototype.getUint32
};

/**
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {number} numberOfPartitions
 * @constructor
 */
export class BinaryGridsquareOccurrence {

    /**
     *
     * @param {ArrayBuffer} arrayBuffer
     * @param {number} numberOfPartitions
     */
    constructor(arrayBuffer, numberOfPartitions) {
        this.baseArrayBuffer = arrayBuffer;
        this.numberOfPartitions = numberOfPartitions;
    };

    /**
     * As dataset styling and labeling uses a numeric series, whereas status codes are alphabetic need to map
     * between the two
     *
     * @type {Array.<string>}
     */
    static numericToStatusMapping = [
        '-', //TaxonStatus::MAPPING_STATUS_SPECIAL_UNKNOWN,
        'n', //TaxonStatus::BROAD_STATUS_NATIVE,
        'a', //TaxonStatus::BROAD_STATUS_ALIEN,
        '?', //TaxonStatus::MAPPING_STATUS_SPECIAL_MIXED, // mixed status
        'c' //TaxonStatus::BROAD_STATUS_CASUAL
    ];

    /**
     * partitions (corresponding to date classes etc.)
     * source data typically has either 1 or 8 partitions (unpartitioned or by dateclass)
     *
     * @type Array
     */
    //BinaryGridsquareOccurrence.prototype.partitions = [];

    /**
     *
     * @type {?ArrayBuffer}
     */
    baseArrayBuffer = null;

    /**
     *
     * @type {?number}
     */
    numberOfPartitions = null;

    /**
     *
     * @param {number} pointer
     * @param {Array.<number>} grComponents
     * @param {number} precision
     * @returns {{partitions: Array.<{childFreq: number, residualFreq: number, status: string}>, childTotal: number, residualTotal: number, nextOffset: number}}
     */
    read_totals(pointer, grComponents, precision) {
        const view = new DataView(this.baseArrayBuffer, pointer);

        /**
         * 8 partitions (corresponding to date classes)
         *
         * @type {Array.<{childFreq: number, residualFreq: number, status: string}>}
         */
        const partitions = [];

        let childTotal = 0;
        let residualTotal = 0;

        const packedStatus = view.getUint32(0, true);
        const packedLengths = view.getUint8(4);

        let offset = 5; // status word (4 bytes) + packedLengths byte

        const freqBytes = (packedLengths >>> 4);
        const offsetBytes = packedLengths & 0xf;

        const byteFetch = uintFetchFunctions[freqBytes];

        if (!byteFetch) {
            throw new Error(`Failed to find byte fetch function for '${freqBytes}'`);
        }

        if (offsetBytes) {
            // if offsetBytes size is non-zero then at least one child pointer exists

            for (let n = 0; n < this.numberOfPartitions; n++) {
                partitions[n] = {
                    childFreq: byteFetch.call(view, offset, true),
                    residualFreq: byteFetch.call(view, freqBytes + offset, true),
                    status: BinaryGridsquareOccurrence.numericToStatusMapping[(packedStatus >>> (n * 4)) & 0xf]
                };
                childTotal += partitions[n].childFreq;
                residualTotal += partitions[n].residualFreq;

                offset += freqBytes * 2;
            }
        } else {
            // null offsetPointersSize means that none of the children can be set
            // so don't store child freqs in status table

            for (let n = 0; n < this.numberOfPartitions; n++) {
                partitions[n] = {
                    childFreq: 0,
                    residualFreq: byteFetch.call(view, offset, true),
                    status: BinaryGridsquareOccurrence.numericToStatusMapping[(packedStatus >>> (n * 4)) & 0xf]
                };
                residualTotal += partitions[n].residualFreq;

                offset += freqBytes;
            }
        }

        // test if have children and that grid-ref is long enough
        const nextOffset = (childTotal && (precision in grComponents)) ?
            uintFetchFunctions[offsetBytes].call(view, offset + (grComponents[precision] * offsetBytes), true) // pointer - (view.getUint32(offset + (grComponents[precision] * offsetBytes), true) & mask) // child pointer is relative to current pointer
            :
            0;

        return {
            partitions: partitions,
            childTotal: childTotal,
            residualTotal: residualTotal, // needed for debugging only
            nextOffset: nextOffset ? pointer - nextOffset : 0 // nextOffset is either null (0) or relative to base pointer
        };
    };

    /**
     *
     * @param {number} pointer
     * @returns {{partitions : Array.<Object>, childTotal : number, residualTotal : number}}
     */
    prep_and_get_base_freq(pointer) {
        this.cellDataView = new DataView(this.baseArrayBuffer, pointer);

        /**
         * defaults to 8 partitions (corresponding to date classes), or single partition for un-partitioned data
         *
         * @type Array
         */
        const partitions = [];

        let childTotal = 0;
        let residualTotal = 0;

        const packedStatus = this.cellDataView.getUint32(0, true);
        const packedLengths = this.cellDataView.getInt8(4);
        const freqBytes = (packedLengths >>> 4);

        // if (BinaryGridsquareListSource.debug) {
        //     if (freqBytes < 1 || freqBytes > 4) {
        //         console.log(`Freq bytes: ${freqBytes}`);
        //     }
        // }

        this.offsetPointersSize = packedLengths & 0xf;

        this.bytesOffset = 5; // 4 bytes of packed status + 1 byte of packed lengths

        const byteFetch = uintFetchFunctions[freqBytes]; // typically a direct DataView read (except when reading 3 byte value)

        if (!byteFetch) {
            throw new Error("Failed to find byte fetch function for '" + freqBytes + "'");
        }

        if (this.offsetPointersSize) {
            for (let n = 0; n < this.numberOfPartitions; n++) {
                partitions[n] = {
                    childFreq: byteFetch.call(this.cellDataView, this.bytesOffset, true),
                    residualFreq: byteFetch.call(this.cellDataView, this.bytesOffset + freqBytes, true),
                    status: BinaryGridsquareOccurrence.numericToStatusMapping[(packedStatus >>> (n * 4)) & 0xf]
                };
                childTotal += partitions[n].childFreq;
                residualTotal += partitions[n].residualFreq;

                this.bytesOffset += freqBytes * 2;
            }
        } else {
            // null offsetPointersSize means that none of the children can be set
            // so don't store child freqs in status table

            for (let n = 0; n < this.numberOfPartitions; n++) {
                partitions[n] = {
                    childFreq: 0,
                    residualFreq: byteFetch.call(this.cellDataView, this.bytesOffset, true),
                    status: BinaryGridsquareOccurrence.numericToStatusMapping[(packedStatus >>> (n * 4)) & 0xf]
                };
                residualTotal += partitions[n].residualFreq;

                this.bytesOffset += freqBytes;
            }
        }

        return {
            partitions: partitions,
            childTotal: childTotal,
            residualTotal: residualTotal // needed for debugging only
        };
    };

    /**
     *
     * @param {number} childCellNumber
     * @returns {number}
     */
    read_prepped_cell_handle(childCellNumber) {
        return uintFetchFunctions[this.offsetPointersSize].call(
            this.cellDataView, this.bytesOffset + (childCellNumber * this.offsetPointersSize), true
        );
    }
}
