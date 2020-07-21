/**
 *
 * @param {Object} req
 * @param {string} url
 * @param {?Function} handler
 * @param {Object} data
 */
export function xml_save(req,url,handler,data) {
    if (handler) {
        req.onreadystatechange = handler;
    }
    req.open("POST", url, true);
    req.setRequestHeader("Content-type", "text/xml;charset=UTF-8");
    req.send(data);
}
