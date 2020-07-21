/**
 *
 * @param {XMLHttpRequest} req
 * @param {string} url
 * @param data
 * @param handlers
 * @param {?string} responseType
 */
export function post(req, url, data, handlers, responseType) {
    var content = '';
    var status;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            content += key + '=' + encodeURIComponent(data[key]) + '&';
        }
    }

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
                    handlers[status](req);
                } else if (handlers.defaultHandler) {
                    console.log('Calling default handler for status: ' + status);
                    handlers.defaultHandler();
                } else {
                    throw new Error("Unhandled post result, status " + status);
                }

                req = null;
            }
        };
    }

    console.log('Url: ' + url);
    console.log(content);

    req.open("POST", url, true);

    if (responseType) {
        req.responseType = responseType;
    }

    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded;charset=UTF-8");
    req.send(content);
}
