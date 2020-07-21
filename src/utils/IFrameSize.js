/**
 *
 * @constructor
 * @returns {IframeSize}
 */
export function IframeSize() {}

if (window.top !== window.self) {

    IframeSize.height = 0;

    IframeSize.poll = function () {
        // What's the page height?
        var height = document.body.offsetHeight;
        //height = document.getElementById().height;

        if (IframeSize.height !== height) {
            IframeSize.height = height;

            // Going to 'pipe' the data to the parent through the helpframe..
            var pipe = document.getElementById('ddbpipeframe');

            //logger('attempting to resize, height=' + height);

            if (!pipe) {
                // make the frame
                var frame = document.createElement('iframe');
                frame.id = 'ddbpipeframe';
                frame.style.position = 'absolute';
                //frame.style.top = '-99999'; // offscreen
                frame.style.left = '-99999';
                frame.width = '1px';
                frame.height = '1px';
                frame.style.border = 'none';
                frame.src = 'https://herbariaunited.org/ddbiframehelper.html?height=' + height;
                document.body.appendChild(frame);
            } else {
                pipe.src = 'https://herbariaunited.org/ddbiframehelper.html?height=' + height;
            }

            // Cachebuster a precaution here to stop browser caching interfering
            //pipe.src = 'http://herbariaunited.org/helper.html?height=' + height; // + '&cacheb=' + Math.random();
        } else {
            console.log('nothing to do');
        }
    };
} else {
    // no-op

    IframeSize.poll = function() {};
}
