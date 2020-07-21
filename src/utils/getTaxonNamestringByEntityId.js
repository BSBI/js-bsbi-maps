import {logError} from "./logError";
import {MapControl} from "..";

export function getTaxonNamestringByEntityId(entityId) {
    if (!BsbiDb.hasOwnProperty('TaxonNames')) {
        logError('Taxon dictionary failed to load. (fake error)', '', 3550);
        //alert('The taxon name dictionary has not loaded correctly, please try reloading the page.');

        BsbiDb.synchronously_try_taxon_list_reload();

        if (!BsbiDb.hasOwnProperty('TaxonNames')) {
            MapControl.reload_warning('The taxon name dictionary has not loaded correctly');
            throw new Error('Taxon dictionary failed to load.');
        } else {
            logError('Success after taxon dictionary retry. (fake error)', '', 3559);
        }
    }

    if (entityId in BsbiDb.TaxonNames) {
        var taxon = BsbiDb.TaxonNames[entityId];
    } else {
        throw new Error('Taxon id ' + entityId + ' not found');
    }

    return taxon[BsbiDb.OfflineTaxonDropBox.nameStringColumn] + (taxon[BsbiDb.OfflineTaxonDropBox.qualifierColumn] ? (' ' + taxon[BsbiDb.OfflineTaxonDropBox.qualifierColumn]) : '');
}
