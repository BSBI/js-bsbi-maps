/**
 *
 * @param {XMLHttpRequest} req
 * @param {string} url
 * @param {object} handlers
 * @param {string} responseType
 */
export function get(req, url, handlers, responseType) {
    var status;
    if (handlers) {
        req.onreadystatechange = function () {
            if (req && req.readyState === 4) {
                status = req.status;

                try {
                    // this may cause problems in IE 9 if the request has been aborted
                    // yielding error "Could not complete the operation due to error c00c023f."
                    status = req.status;
                } catch (e) {
                    console.log(e);
                    return;
                }

                if (handlers[status]) {
                    handlers[status]();
                } else if (handlers.defaultHandler) {
                    handlers.defaultHandler(status);
                } else {
                    throw new Error("Unhandled post result, status " + status);
                }

                req = null;
            }
        };
    }

    req.open("GET", url, true);
    req.responseType = responseType;
    req.send(null);
}
