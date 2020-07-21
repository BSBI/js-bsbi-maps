/**
 *
 * @param {XMLHttpRequest} req
 * @param {string} url
 * @param {object} handlers
 */
export function getBinary(req, url, handlers) {
    if (handlers) {
        req.onreadystatechange = function () {
            if (req && req.readyState === 4) {
                let status = req.status;

                if (handlers[status]) {
                    handlers[status](req);
                } else if (handlers.defaultHandler) {
                    handlers.defaultHandler(status);
                } else {
                    throw new Error(`Unhandled post result, status ${status}`);
                }
            }
        };
    }

    req.open("GET", url, true);

    req.withCredentials = true; // allow cookie's to be passed
    req.responseType = 'arraybuffer';
    req.send(null);
}
