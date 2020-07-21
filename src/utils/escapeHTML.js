export function escapeHTML (text) {
    try {
        // IE (even v 11) sometimes fails here with 'Unknown runtime error', see http://blog.rakeshpai.me/2007/02/ies-unknown-runtime-error-when-using.html
        let textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.innerHTML.replace(/"/g, '&quot;');
    } catch (e) {
        let pre = document.createElement('pre');
        pre.appendChild(document.createTextNode(text));
        return pre.innerHTML.replace(/"/g, '&quot;');
    }
}
