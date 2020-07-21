/**
 * provides access to gridsquare list occurrence data from a packed binary format
 *
 * @constructor
 */
import {GridsquareListSource} from "./GridsquareListSource";
import {getBinary} from "../framework/getBinary";
import {BinaryGridsquareOccurrence} from "./BinaryGridsquareOccurrence";

export class BinaryGridsquareListSource extends GridsquareListSource {

    /**
     *
     * @type {?{
     *  minFrequencies: Object.<string, number>,
     *  maxFrequencies: Object.<string, number>,
     *  searchXml: string,
     *  freqMonitoringPrecisionLevel: string,
     *  distinctHectads: Object,
     *  numberOfPartitions: number,
     *  caption : string,
     *  customDistinctGroupingFlag : boolean}}
     */
    descriptor = null;

    /**
     * if set then log debug info
     *
     * @type boolean
     */
    static debug = false;

    /**
     *
     * @type ArrayBuffer
     */
    arrayBuffer = null;

    /**
     * byte offset to national grid
     *
     * @type {{gb : number, ie : number, ci : number}}
     */
    nationalGrids;

    static EVENT_DATA_LOADED = 'data loaded';

    static nationalGridDimensions = {
        'gb' : {width: 7, height: 13},
        'ie' : {width: 4, height: 5},
        'ci' : {width: 1, height: 2}
    };

    /**
     *
     * @returns {boolean}
     */
    data_loaded() {
        return !!this.arrayBuffer;
    }

    destroy() {
        this.arrayBuffer = null;
        this.destructor();
    }

    /**
     *
     * @param {string} url
     */
    load_binary(url) {
        let binaryFetchRequest = new XMLHttpRequest;
        this.url = url;

        this.arrayBuffer = null;

        if (url[0] === '/') {
            this.usedUrl = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '') +
                url.replace(/&$/, ''); // clip trailing '&'
        } else {
            this.usedUrl = url.replace(/&$/, ''); // clip trailing '&'
        }

        getBinary(binaryFetchRequest, this.usedUrl, {
            200: (/** @param {XMLHttpRequest} binaryFetchRequest */ binaryFetchRequest) => {
                let arrayBuffer = binaryFetchRequest.response;

                if (arrayBuffer) {
                    this.process_binary_response(arrayBuffer);
                } else {
                    let url = binaryFetchRequest.responseURL ? binaryFetchRequest.responseURL : this.usedUrl; // responseURL not supported by all browsers
                    throw new Error(`Failed to get array buffer response from ${url} status = ${binaryFetchRequest.status} readyState ${binaryFetchRequest.readyState} (${(arrayBuffer === null) ? 'is NULL' : 'non-NULL'}) responseType=${binaryFetchRequest.responseType}`);
                }
            },
            defaultHandler: (status) => {
                console.log(`Unexpected error response from binary data load request, status: ${status}`);
            }
        });
    }

    /**
     *
     * @param {ArrayBuffer} arrayBuffer
     * @returns {undefined}
     */
    process_binary_response(arrayBuffer) {
        // read the offsets into the country grids
        // stored as three 32-bit words in the last 3 32-bit words of the file, preceded by the pointer to the JSON results descriptor string
        let startPointers = new DataView(arrayBuffer, arrayBuffer.byteLength - 16);

        let jsonDescriptorPointer = startPointers.getUint32(0, true);

        let jsonBuffer = new DataView(arrayBuffer, jsonDescriptorPointer);
        let bytesLength = jsonBuffer.getUint32(0, true);
        let jsonString = read_ucs_string(arrayBuffer, jsonDescriptorPointer + 4, bytesLength);

        this.descriptor = JSON.parse(jsonString);
        this.numberOfPartitions = this.descriptor.numberOfPartitions;

        this.nationalGrids = {
            gb : startPointers.getUint32(4, true),
            ie : startPointers.getUint32(8, true),
            ci : startPointers.getUint32(12, true)
        };

        this.arrayBuffer = arrayBuffer;
        this.fireEvent(BinaryGridsquareListSource.EVENT_DATA_LOADED);
    }

    /**
     *
     * @param {string} countryCode
     * @returns {number} byte offset
     */
    get_national_grid_handle(countryCode) {
        return this.nationalGrids[countryCode];
    }

    /**
     *
     * @param {string} ref
     * @param {string} countryCode
     * @returns {Array}
     */
    fetch_data_for_gridref(ref, countryCode) {
        const occurrences = [];

        if (ref) {
            let pointer = this.nationalGrids[countryCode];
            const grComponents = GridsquareListSource.interleave_gr(ref, countryCode);
            let precision = 0;

            if (pointer && grComponents) {
                // only begin loop if have at least some data for the country
                do {
                    occurrences[precision] = (new BinaryGridsquareOccurrence(this.arrayBuffer, this.numberOfPartitions)).read_totals(pointer, grComponents, precision);
                    pointer = occurrences[precision++].nextOffset;
                } while (pointer);
            }
        }

        return occurrences;
    }

    /**
     *
     * @param {string} countryCode
     * @returns {object}
     */
    fetch_data_for_country_level(countryCode) {
        const pointer = this.nationalGrids[countryCode];

        if (pointer) {
            // only look up if have at least some data for the country

            return (new BinaryGridsquareOccurrence(this.arrayBuffer, this.numberOfPartitions))
                .read_totals(
                    pointer,
                    [0], // grComponents (top-level precision and zero offset)
                    0 // precision level (where 0 is country)
                );
        } else {
            return null;
        }
    };

    /**
     * sum partitioned data across gb, ie and ci
     * @param {number} eventualNumberOfPartitions (note that this is distinct from the raw source data this.numberOfPartitions)
     * @param {function=} partitionFilterFunction default null
     * @returns {Array}
     */
    fetch_data_for_top_level(eventualNumberOfPartitions, partitionFilterFunction) {
        const partitionTotals = (new Array(eventualNumberOfPartitions)).fill(0);
        const countries = ['gb', 'ie', 'ci'];

        for (let n in countries) {
            let occurrenceSummary = this.fetch_data_for_country_level(countries[n]);
            if (occurrenceSummary) {

                if (eventualNumberOfPartitions === 1) {
                    // special case, used partly because the filter for OTHER partition type doesn't merge the sub-partitions
                    partitionTotals[0] += occurrenceSummary.childTotal;
                } else {
                    // if partitionFilterFunction is set then it will condense down source partitions into the grouped set
                    // from self::numberOfPartitons => eventualNumberOfPartitions
                    if (partitionFilterFunction) {
                        occurrenceSummary = partitionFilterFunction(occurrenceSummary);
                    }

                    occurrenceSummary.partitions.map(function (partitionData, index) {
                        partitionTotals[index] += partitionData.childFreq; // at top level everything counts as child rather than residue
                    });
                }
            }
        }

        return partitionTotals;
    }

    /**
     *
     * @param {number} maxPrecisionLevel
     * @returns {Object} statusCodeUsage
     */
    enumerate_status(maxPrecisionLevel) {
        this.statusCodeUsage = {};

        for (let countryCode in BinaryGridsquareListSource.nationalGridDimensions) {
            if (BinaryGridsquareListSource.nationalGridDimensions.hasOwnProperty(countryCode)) {
                let pointer = this.nationalGrids[countryCode];

                if (pointer) {
                    this._enumerate_status_impl(
                        pointer,
                        BinaryGridsquareListSource.nationalGridDimensions[countryCode].width * BinaryGridsquareListSource.nationalGridDimensions[countryCode].height,
                        1,
                        maxPrecisionLevel
                    );
                }
            }
        }

        return this.statusCodeUsage;
    }

    /**
     *
     * @param {number} pointer
     * @param {number} totalNumberOfCells
     * @param {number} precisionLevel
     * @param {number} maxPrecisionLevel
     * @returns {undefined}
     */
    _enumerate_status_impl(pointer, totalNumberOfCells, precisionLevel, maxPrecisionLevel) {
        const occurrence = new BinaryGridsquareOccurrence(this.arrayBuffer, this.numberOfPartitions);
        const baseCellDescription = occurrence.prep_and_get_base_freq(pointer);

        let haveMixedStatus = false;
        for (let p = 0; p < this.numberOfPartitions; p++) {
            let partitionStatus = baseCellDescription.partitions[p].status;
            this.statusCodeUsage[partitionStatus] = true;
            haveMixedStatus = haveMixedStatus || (partitionStatus === '?');
        }

        if (haveMixedStatus && baseCellDescription.childTotal > 0 && (precisionLevel + 1) <= maxPrecisionLevel) {
            var childPrecision = precisionLevel + 1;
            var childNumberOfCells = BinaryGridsquareListSource.precisionGridSquareDimensions[childPrecision] * BinaryGridsquareListSource.precisionGridSquareDimensions[childPrecision];

            for (let cellNumber = 0; cellNumber < totalNumberOfCells; cellNumber++) {
                const cellHandle = occurrence.read_prepped_cell_handle(cellNumber);

                // if (BinaryGridsquareListSource.debug) {
                //     if ((pointer - cellHandle) === 0) {
                //         console.log('zero pointer: where pointer = ' + pointer);
                //     }
                // }

                if (cellHandle) {

                    this._enumerate_status_impl(
                        pointer - cellHandle, // child cell handle is offset from current handle
                        childNumberOfCells,
                        childPrecision,
                        maxPrecisionLevel
                    );
                }
            }
        }
    }

    static precisionGridSquareDimensions = {
        2: 10, // 10 x 10 hectads
        3: 5, // 5 x 5 tetrads
        4: 2, // 2 x 2 monads (as tetrad subdivision)
        5: 10, // 10 x 10 100m squares
        6: 10, // 10 x 10 10 m squares (not yet implemented)
        7: 10 // 10 x 10 1 m squares (not yet implemented)
    };

    /**
     *
     * @param {Array.<Object>} squareList
     * @param {string} gridCode 'gb','ie','ci'
     * @param {number} minX (metres, national grid)
     * @param {number} minY (metres, national grid)
     * @param {number} maxX (metres, national grid)
     * @param {number} maxY (metres, national grid)
     * @param {number} tableLX
     * @param {number} tableLY
     * @param {number} minPrecision
     * @param {number} maxPrecision
     * @param {boolean} plotResidue (note that for partitioned data sets this should be false and instead applied during plotting)
     * @param {number} startPrecision
     * @param {number=} handle e.g. array pointer to binary data
     *
     * @returns {Object}
     */
    get_tile_tree(squareList, gridCode, minX, minY, maxX, maxY, tableLX, tableLY, minPrecision, maxPrecision, plotResidue, startPrecision, handle) {
        var tableCellsWidth, tableCellsHeight, currentTileTree;

        if (!handle) {
            handle = this.get_national_grid_handle(gridCode);

            if (!handle) {
                //console.log('no handle, returning empty array');
                return {}; // data for the whole national table is missing
            }

            if (!startPrecision) {
                startPrecision = 1; // 100km grid letters
            }

            if (tableLX === undefined) {
                tableLX = 0; // low bounds of the tile table at this tree-level (national units in meters)
            }

            if (tableLY === undefined) {
                tableLY = 0;
            }

            tableCellsWidth = GridsquareListSource.nationalGridDimensions[gridCode].width;
            tableCellsHeight = GridsquareListSource.nationalGridDimensions[gridCode].height;
        } else {
            tableCellsWidth = BinaryGridsquareListSource.precisionGridSquareDimensions[startPrecision];
        }

        /**
         * cell dimension in metres (national units)
         */
        var childCellDimension = GridsquareListSource.precisionCellWidths[startPrecision];
        var thisCellDimension = GridsquareListSource.precisionCellWidths[startPrecision - 1];

        if (tableLX > minX) {
            minX = tableLX;
        }

        if (tableLY > minY) {
            minY = tableLY;
        }

        var lowCellX, lowCellY, hiCellX, hiCellY;

        lowCellX = Math.floor((minX - tableLX) / childCellDimension);
        lowCellY = Math.floor((minY - tableLY) / childCellDimension);
        hiCellX = Math.ceil((maxX - tableLX) / childCellDimension);
        hiCellY = Math.ceil((maxY - tableLY) / childCellDimension);

        if (hiCellX > tableCellsWidth) {
            hiCellX = tableCellsWidth;
        }

        if (hiCellY > tableCellsHeight) {
            hiCellY = tableCellsHeight;
        }

        var occurrence = new BinaryGridsquareOccurrence(this.arrayBuffer, this.numberOfPartitions);
        var baseCellDescription = occurrence.prep_and_get_base_freq(handle);

        if (startPrecision < maxPrecision) {
            currentTileTree = {
                precision: startPrecision,
                tileX: tableLX,
                tileY: tableLY,
                tileDimension: thisCellDimension,
                residualFreq: baseCellDescription.residualTotal,
                childFreq: baseCellDescription.childTotal,
                partitions: baseCellDescription.partitions
            };

            if (currentTileTree.residualFreq && startPrecision >= minPrecision) {

                if (plotResidue || currentTileTree.childFreq === 0) {
                    squareList.push(currentTileTree);
                }
            }

            if (currentTileTree.childFreq) {
                var childPointers = [];

                for (var cellY = lowCellY; cellY < hiCellY; cellY++) {
                    for (var cellX = lowCellX; cellX < hiCellX; cellX++) {

                        var cellHandle = occurrence.read_prepped_cell_handle((cellY * tableCellsWidth) + cellX);

                        if (cellHandle) {
                            if (BinaryGridsquareListSource.debug) {
                                if ((handle - cellHandle) < 1) {
                                    console.log('in tile tree walker have invalid new handle: handle = ' + handle + ' cell handle=' + cellHandle);
                                }
                            }

                            childPointers.push({
                                handle: handle - cellHandle, // child cell handle is offset from current handle
                                x: cellX,
                                y: cellY
                            });
                        }
                    }
                }

                if (childPointers.length) {
                    currentTileTree.children = [];

                    for (let n = childPointers.length; n--;) {
                        var childTableLX = tableLX + (childPointers[n].x * childCellDimension);
                        var childTableLY = tableLY + (childPointers[n].y * childCellDimension);

                        var tileTree = this.get_tile_tree(
                            squareList,
                            gridCode,

                            Math.max(childTableLX, minX),
                            Math.max(childTableLY, minY),
                            Math.min(childTableLX + childCellDimension - 1, maxX),
                            Math.min(childTableLY + childCellDimension - 1, maxY),

                            childTableLX,
                            childTableLY,

                            minPrecision,
                            maxPrecision,
                            plotResidue,
                            startPrecision + 1,
                            childPointers[n].handle
                        );

                        if (tileTree) {
                            currentTileTree.children.push(tileTree);
                        }
                    }
                } else {
                    currentTileTree.children = null;
                }
            }
        } else {
            // not zooming deeper than this, so merge residual and child totals
            if (baseCellDescription.childTotal) {
                for (let n = this.numberOfPartitions; n--;) {
                    baseCellDescription.partitions[n].residualFreq += baseCellDescription.partitions[n].childFreq;
                    baseCellDescription.partitions[n].childFreq = 0;
                }
            }

            currentTileTree = {
                precision: startPrecision,
                tileX: tableLX,
                tileY: tableLY,
                tileDimension: thisCellDimension,
                residualFreq: baseCellDescription.residualTotal + baseCellDescription.childTotal,
                childFreq: 0,
                partitions: baseCellDescription.partitions,
                children: null
            };

            if (startPrecision >= minPrecision) {
                squareList.push(currentTileTree);
            }
        }

        return currentTileTree;
    }
}

/**
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {number} start
 * @param {number} length
 * @returns {*}
 */
function read_ucs_string(arrayBuffer, start, length) {
    // see http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String

    let a = new Uint16Array(arrayBuffer, start, length / 2);

    try {
        return String.fromCharCode.apply(null, a);
    } catch (e) {
        // earlier browsers may not accept TypedArray in lieu of Array as parameter for apply
        // 'TypeError: Function.prototype.apply: Arguments list has wrong type'

        let data = '';
        for (let i = 0, l = a.length; i < l; i++) {
            data += String.fromCharCode(a[i]);
        }
        return data;
    }
}
