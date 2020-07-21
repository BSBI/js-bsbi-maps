import {GMap} from "./GMap";
import {MapConfiguration} from "./MapConfiguration";

export class MappingUtils {

}

/**
 *
 * @param {GridCoordsGB|GridCoordsIE|GridCoordsCI} ref
 * @param {MapConfiguration} mapConfiguration
 * @param {number} initialPrecision (metres)
 * @param {string} newLine
 * @returns {{message: string, series: Array.<Object>, nationalRef: GridCoords, initialPrecisionMetres: number}}
 */
MappingUtils.lookup_gridref_details = function(ref, mapConfiguration, initialPrecision, newLine) {
    var tooltipString;
    var series = [];

    if (ref) {
        var messages = [];
        var grString = ref.to_gridref(initialPrecision);

        // get total number of series (whether loaded or not)
        // if > 1 then need to label the series in the info box
        var totalSeries = Object.keys(mapConfiguration.series).length;

        for (var seriesNumber in mapConfiguration.series) {
            if (mapConfiguration.series.hasOwnProperty(seriesNumber) && mapConfiguration.series[seriesNumber].sourceData.data_loaded()) {
                series[seriesNumber] = {};

                var seriesConfig = mapConfiguration.series[seriesNumber];

                var nonCumulativeFreq = seriesConfig.searchType === MapConfiguration.SEARCHTYPE_TAXON_FREQ ||
                    seriesConfig.searchType === MapConfiguration.SEARCHTYPE_SPECIES_FREQ;

                var sourceData = seriesConfig.sourceData;
                var data = series[seriesNumber].data = sourceData.fetch_data_for_gridref(grString, ref.country.toLowerCase());

                var l = data.length;
                if (l > 0) {
                    var message = '';
                    var previous = 0;
                    var minPrecision = nonCumulativeFreq ? l - 1 : 2; // if using only single precision then restrict range

                    for (var precisionLevel = l - 1; precisionLevel >= minPrecision; precisionLevel--) {
                        var subRef = ref.to_gridref(GMap.precisionLevelMetres[precisionLevel]);
                        var total = data[precisionLevel].childTotal + data[precisionLevel].residualTotal;

                        if (total > previous) {
                            message += subRef + ': ' + total + newLine;
                            previous = total;
                        }
                    }

                    // if there's more than one data series then label them in the tooltip
                    if (previous > 0 && totalSeries > 1) {
                        message = seriesConfig.get_series_label() + newLine + message;
                    }

                    if (message) {
                        messages.push(message);
                    }
                }
            }
        }

        if (messages.length) {
            tooltipString = messages.join(newLine);
        } else {
            tooltipString = grString;
        }
    } else {
        tooltipString = '';
    }

    return {
        message: tooltipString,
        series: series,
        nationalRef: ref,
        initialPrecisionMetres: initialPrecision
    };
}
