export const SVG = {
    SYMBOLID : {
        FILLEDSQUARE : 'filledsquare',
        FILLEDCIRCLE : 'filledcircle',
        FILLEDDIAMOND : 'filleddiamond',
        FILLEDUPTRIANGLE : 'filleduptriangle',
        FILLEDDOWNTRIANGLE : 'filleddowntriangle',
        OPENSQUARE : 'opensquare',
        OPENCIRCLE : 'opencircle',
        OPENDIAMOND : 'opendiamond',
        OPENUPTRIANGLE : 'openuptriangle',
        OPENDOWNTRIANGLE : 'opendowntriangle',
        PLUS : 'plus',
        EX : 'ex',
        NONE : 'none'
    },
    SYMBOL : {
        filledsquare : {id: 'filledsquare', label : 'filled square',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointSW.x) + ' ' + Math.round(pointSW.y) +
                    'L' + Math.round(pointNW.x) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointNE.x) + ' ' + Math.round(pointNE.y) +
                    'L' + Math.round(pointSE.x) + ' ' + Math.round(pointSE.y) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour);
                line.setAttributeNS('', "fill", fillColour);
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        filledcircle : {id: 'filledcircle', label : 'filled circle',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                line.setAttributeNS('', 'cx', Math.round((pointSW.x + pointNW.x + pointNE.x + pointSE.x) / 4));
                line.setAttributeNS('', 'cy', Math.round((pointSW.y + pointNW.y + pointNE.y + pointSE.y) / 4));
                line.setAttributeNS('', 'r', ((pointNE.x - pointNW.x) + (pointSE.x - pointSW.x) +
                    Math.abs(pointSE.y - pointNE.y) + Math.abs(pointSW.y - pointNW.y)) / 8);

                line.setAttributeNS('', "stroke", strokeColour);
                line.setAttributeNS('', "fill", fillColour);
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        filleddiamond : {id: 'filleddiamond', label : 'filled diamond',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round((pointSW.x + pointNW.x) / 2) + ' ' + Math.round((pointSW.y + pointNW.y) / 2) +
                    'L' + Math.round((pointNW.x + pointNE.x) / 2) + ' ' + Math.round((pointNW.y + pointNE.y) / 2) +
                    'L' + Math.round((pointSE.x + pointNE.x) / 2) + ' ' + Math.round((pointSE.y + pointNE.y) / 2) +
                    'L' + Math.round((pointSW.x + pointSE.x) / 2) + ' ' + Math.round((pointSW.y + pointSE.y) / 2) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour);
                line.setAttributeNS('', "fill", fillColour);
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        filleduptriangle : {id: 'filleduptriangle', label : 'filled triangle (up)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const o = Math.tan(0.261799388) * (((pointSE.x - pointSW.x) + (pointNE.x - pointNW.x)) / 2); // - pointNW.x - pointSW.x) / 2);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointNW.x) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointNE.x) + ' ' + Math.round(pointNE.y + o) +
                    'L' + Math.round(pointSW.x + o) + ' ' + Math.round(pointSW.y) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour);
                line.setAttributeNS('', "fill", fillColour);
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        filleddowntriangle : {id: 'filleddowntriangle', label : 'filled triangle (down)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const o = Math.tan(0.261799388) * (((pointSE.x - pointSW.x) + (pointNE.x - pointNW.x)) / 2); // - pointNW.x - pointSW.x) / 2);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointSW.x) + ' ' + Math.round(pointSW.y) +
                    'L' + Math.round(pointNW.x + o) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointSE.x) + ' ' + Math.round(pointSW.y - o) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour);
                line.setAttributeNS('', "fill", fillColour);
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        opensquare : {id: 'opensquare', label : 'open square',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointSW.x) + ' ' + Math.round(pointSW.y) +
                    'L' + Math.round(pointNW.x) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointNE.x) + ' ' + Math.round(pointNE.y) +
                    'L' + Math.round(pointSE.x) + ' ' + Math.round(pointSE.y) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        opencircle : {id: 'opencircle', label : 'open circle',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                line.setAttributeNS('', 'cx', Math.round((pointSW.x + pointNW.x + pointNE.x + pointSE.x) / 4));
                line.setAttributeNS('', 'cy', Math.round((pointSW.y + pointNW.y + pointNE.y + pointSE.y) / 4));
                //line.setAttributeNS('', 'r', Math.round((pointSE.x + pointNE.x - pointNW.x - pointSW.x) / 4));
                line.setAttributeNS('', 'r', ((pointNE.x - pointNW.x) + (pointSE.x - pointSW.x) +
                    Math.abs(pointSE.y - pointNE.y) + Math.abs(pointSW.y - pointNW.y)) / 8);

                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        opendiamond : {id: 'opendiamond', label : 'open diamond',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round((pointSW.x + pointNW.x) / 2) + ' ' + Math.round((pointSW.y + pointNW.y) / 2) +
                    'L' + Math.round((pointNW.x + pointNE.x) / 2) + ' ' + Math.round((pointNW.y + pointNE.y) / 2) +
                    'L' + Math.round((pointSE.x + pointNE.x) / 2) + ' ' + Math.round((pointSE.y + pointNE.y) / 2) +
                    'L' + Math.round((pointSW.x + pointSE.x) / 2) + ' ' + Math.round((pointSW.y + pointSE.y) / 2) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        openuptriangle : {id: 'openuptriangle', label : 'open triangle (up)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const o = Math.tan(0.261799388) * (((pointSE.x - pointSW.x) + (pointNE.x - pointNW.x)) / 2); // - pointNW.x - pointSW.x) / 2);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointNW.x) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointNE.x) + ' ' + Math.round(pointNE.y + o) +
                    'L' + Math.round(pointSW.x + o) + ' ' + Math.round(pointSW.y) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        opendowntriangle : {id: 'opendowntriangle', label : 'open triangle (down)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const o = Math.tan(0.261799388) * (((pointSE.x - pointSW.x) + (pointNE.x - pointNW.x)) / 2);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointSW.x) + ' ' + Math.round(pointSW.y) +
                    'L' + Math.round(pointNW.x + o) + ' ' + Math.round(pointNW.y) +
                    'L' + Math.round(pointSE.x) + ' ' + Math.round(pointSW.y - o) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        plus : {id: 'plus', label : '(+)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round((pointSW.x + pointNW.x) /2) + ' ' + Math.round((pointSW.y + pointNW.y) /2) +
                    'L' + Math.round((pointSE.x + pointNE.x) /2) + ' ' + Math.round((pointSE.y + pointNE.y) /2) +
                    'M' + Math.round((pointNW.x + pointNE.x) /2) + ' ' + Math.round((pointNE.y + pointNW.y) /2) +
                    'L' + Math.round((pointSW.x + pointSE.x) /2) + ' ' + Math.round((pointSE.y + pointSW.y) /2) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "stroke-width", '1.2');
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        ex : {id: 'ex', label : '(x)',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd',
                    'M' + Math.round(pointSW.x) + ' ' + Math.round(pointSW.y) +
                    'L' + Math.round(pointNE.x) + ' ' + Math.round(pointNE.y) +
                    'M' + Math.round(pointSE.x) + ' ' + Math.round(pointSE.y) +
                    'L' + Math.round(pointNW.x) + ' ' + Math.round(pointNW.y) +
                    'z'
                );
                line.setAttributeNS('', "stroke", strokeColour === 'none' ? fillColour : strokeColour);
                line.setAttributeNS('', "stroke-width", '1.2');
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", opacity);
                return line;
            }},
        none : {id: 'none', label : 'none',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttributeNS('', 'd', ''	);
                line.setAttributeNS('', "stroke", 'none');
                line.setAttributeNS('', "stroke-width", '0');
                line.setAttributeNS('', "fill", 'none');
                line.setAttributeNS('', "fill-opacity", '0');
                return line;
            }},

        // used to show colours in key if no partition marker set, not to be used as map symbol
        specialcolourswatch : {id: 'specialcolourswatch', label : 'specialcolourswatch',
            plot : function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

                const height = pointSW.y - pointNW.y;

                rect.setAttributeNS('', 'x', pointNW.x);
                rect.setAttributeNS('', 'y', pointNW.y);
                rect.setAttributeNS('', 'width', (pointSE.x - pointSW.x).toString());
                rect.setAttributeNS('', 'height', height.toString());
                rect.setAttributeNS('', 'rx', (height / 3).toString()); // very rounded corners
                rect.setAttributeNS('', 'ry', (height / 3).toString());

                rect.setAttributeNS('', "stroke", strokeColour);
                rect.setAttributeNS('', "fill", fillColour);
                rect.setAttributeNS('', "fill-opacity", opacity);
                return rect;
            }}
    }
};
