export function merge_status_codes() {
    var status = '';

    for(var n = arguments.length; n--;) {
        if (arguments[n] !== '-' && status !== arguments[n]) {
            status += arguments[n];

            if (status.length > 1) {
                break;
            }
        }
    }

    // if status has no length then all statuses must have been empty or unknown so return unknown
    // if status length is 1 then only a single status type was encounterd, so return that
    // if status length > 1 then return mixed status

    return status.length === 1 ? status
        :
        (status.length === 0 ? '-' : '?');
}
