/**
 *
 * @param {string=} documentElementName
 * @returns {Node}
 */
export function create_xml_doc(documentElementName) {
    if (!documentElementName) {
        documentElementName = 'response';
    }

    var doc = document.implementation.createDocument('', documentElementName, null); // create blank XML response document

    if (doc.documentElement === null) { // Safari 1.2 bug
        // add documentElement
        doc.appendChild(doc.createElement(documentElementName));
    }
    return doc;
}
