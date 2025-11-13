// To do:
// Account for ugly input :c



/*
Reads ans SVG file and creates a dictionary
with its elements.

dic
    -> TypeOfCurve
        -> Curve number
            -> Relevant Numbers

Only accepts paths that are made out of lines or Bezier Curves. Will
    separate them into their respective curves.
    Arcs will be skipped
Only saves points, no other information is saved
*/
const EPS = 0.0000001; // Change to allow different resolutions


// <------------------------------- Acount for the view box

function parseFloatDefault(x) {
  const n = parseFloat(x);
  if (isNaN(n)) console.log("Tried to parse " + x);
  return isNaN(n) ? 0 : n;
}

const numericConstant = "[-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?";
const commands = "[a-zA-Z]"
const whitespace = "(\\s|\\t|\\n|\\r|\\v)+";

class TextTraveler
{
    constructor(text) {
        this.tokens = this.tokenize(text);
        this.currentIndex = 0;
    }


    tokenize(text) {
        const regex = RegExp("(" + numericConstant + "|" + commands + "|" + whitespace + ")", "g");
        
        let tokenStream = text.match(regex);

        if (!tokenStream) return [];
        //if (tokenStream.join("") != text) return [];

        tokenStream = tokenStream.filter(function(token) {
            return ! token.match("^(" + whitespace + ")$");
        });
        //console.log(tokenStream)
        return tokenStream;
    }

    get_next() {
        if (this.currentIndex >= this.tokens.length) {
            return null;
        }
        const token = this.tokens[this.currentIndex];
        this.currentIndex++;
        //if (!isNaN(parseFloat(token)) && Math.abs(parseFloat(token) < 0.001))
        //console.log(token)
        return token;
    }

    return_to_prev() {
        if (this.currentIndex <= 0) {
            throw new Error("No valid previous state");
        }
        this.currentIndex--;
    }

    go_to_start() {
        this.currentIndex = 0;
    }
}


export function read_svg_file(file)
{
    const a = new TextTraveler("c-0.67945,0.63112-2.99579,3.21416");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(file, "image/svg+xml");
    const paths = xmlDoc.getElementsByTagName("path");
    const SVGElement = xmlDoc.documentElement;
    let height = SVGElement.getAttribute("height");
    if(height){ height = parseFloatDefault(height);}
    else {height = 0;}

    //const width = SVGElement.getAttribute("width");

    const path_container = {'lines':[],'quadraticBeziers':[], 'cubicBeziers':[]};
    let idCubicBezier = 0;
    let idquadraticBezier = 0;
    let idLine = 0;

    for (let path of paths) {
        const values = new TextTraveler(path.getAttribute("d"));
        
        let change_command = false;

        let current_point = [0,0];
        let initial_point = [0,0];
        let last_command = '';
        let current_command = '';

        current_command = values.get_next();
        do
        {
            switch(current_command)
            {
                case 'M':
                    current_point = [0,0];
                case 'm':
                    {
                        const dx = parseFloatDefault(values.get_next());
                        const dy = parseFloatDefault(values.get_next());
                        current_point[0] += dx;
                        current_point[1] += dy;

                        initial_point = [...current_point];
                        change_command = true;
                        break;
                    }
                case 'L':
                case 'l':
                    {
                        let dx = parseFloatDefault(values.get_next());
                        let dy = parseFloatDefault(values.get_next());

                        if (current_command === 'l') { // Relative
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        if(Math.abs(current_point[0] - dx) < EPS && Math.abs(current_point[1] - dy) < EPS)
                        {
                            // A point
                            break;
                        }

                        path_container['lines'].push({}); 
                        path_container['lines'][idLine].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['lines'][idLine].p2 = [dx, dy * -1 + height];
                        current_point = [dx, dy];

                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'H':
                case 'h':
                    {
                        let dx = parseFloatDefault(values.get_next());

                        if (current_command === 'h') { // Relative
                            dx += current_point[0];
                        }

                        path_container['lines'].push({}); 
                        path_container['lines'][idLine].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['lines'][idLine].p2 = [dx, current_point[1] * -1 + height];
                        current_point = [dx, current_point[1]];

                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'V':
                case 'v':
                    {
                        let dy = parseFloatDefault(values.get_next());

                        if (current_command === 'v') { // Relative
                            dy += current_point[1];
                        }

                        path_container['lines'].push({}); 
                        path_container['lines'][idLine].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['lines'][idLine].p2 = [current_point[0], dy * -1 + height];
                        current_point = [current_point[0], dy];

                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'z':
                case 'Z':
                    {   
                        if(Math.abs(current_point[0] - initial_point[0]) < EPS && 
                            Math.abs(current_point[1] - initial_point[1]) < EPS)
                        {
                            // A point
                            break;
                        }
                        
                        path_container['lines'].push({});
                        path_container['lines'][idLine].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['lines'][idLine].p2 = [initial_point[0], initial_point[1] * -1 + height];
                        current_point = [...initial_point];
                        
                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'Q':
                case 'q':
                    {
                        let cx = parseFloatDefault(values.get_next());
                        let cy = parseFloatDefault(values.get_next());
                        let dx = parseFloatDefault(values.get_next());
                        let dy = parseFloatDefault(values.get_next());

                        if (current_command === 'q') { // Relative
                            cx += current_point[0];
                            cy += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        path_container['quadraticBeziers'][idquadraticBezier] = {};
                        path_container['quadraticBeziers'][idquadraticBezier].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['quadraticBeziers'][idquadraticBezier].p2 = [cx, cy * -1 + height];
                        path_container['quadraticBeziers'][idquadraticBezier].p3 = [dx, dy * -1 + height];
                        current_point = [dx, dy];

                        change_command = true;
                        idquadraticBezier++;
                        break;
                    }
                case 'T':
                case 't':
                    {
                        let dx = parseFloatDefault(values.get_next());
                        let dy = parseFloatDefault(values.get_next());
                        if (current_command === 't') { // Relative
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        let cx, cy;
                        if((last_command !== 'Q' && last_command !== 'q') &&
                            (last_command !== 'T' && last_command !== 't'))
                        {
                            cx = current_point[0];
                            cy = current_point[1];
                        }
                        else
                        {   
    
                            // Compute the new control point
                            const past_control = [...path_container['quadraticBeziers'][idquadraticBezier-1].p2];
                            past_control[1] = -1 * (past_control[1] - height); // Uninvert
                            cx = -1 * (past_control[0] - current_point[0]) + current_point[0];
                            cy = -1 * (past_control[1] - current_point[1]) + current_point[1];
                        }
                        
                        path_container['quadraticBeziers'][idquadraticBezier] = {};
                        path_container['quadraticBeziers'][idquadraticBezier].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['quadraticBeziers'][idquadraticBezier].p2 = [cx, cy * -1 + height];
                        path_container['quadraticBeziers'][idquadraticBezier].p3 = [dx, dy * -1 + height];
                        current_point = [dx, dy];

                        change_command = true;
                        idquadraticBezier++;
                        break;
                    }
                case 'C':
                case 'c':
                    {
                        let c1x = parseFloatDefault(values.get_next());
                        let c1y = parseFloatDefault(values.get_next());
                        let c2x = parseFloatDefault(values.get_next());
                        let c2y = parseFloatDefault(values.get_next());
                        let dx = parseFloatDefault(values.get_next());
                        let dy = parseFloatDefault(values.get_next());

                        if (current_command === 'c') { // Relative
                            c1x += current_point[0];
                            c1y += current_point[1];
                            c2x += current_point[0];
                            c2y += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        path_container['cubicBeziers'][idCubicBezier] = {};
                        path_container['cubicBeziers'][idCubicBezier].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p2 = [c1x, c1y * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p3 = [c2x, c2y * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p4 = [dx, dy * -1 + height];
                        current_point = [dx, dy];

                        change_command = true;
                        idCubicBezier++;
                        break;
                    }
                case 'S':
                case 's':
                    {
                        let c2x = parseFloatDefault(values.get_next());
                        let c2y = parseFloatDefault(values.get_next());
                        let dx = parseFloatDefault(values.get_next());
                        let dy = parseFloatDefault(values.get_next());
                        if (current_command === 's') { // Relative
                            c2x += current_point[0];
                            c2y += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        let c1x = 0, c1y = 0;
                        if((last_command !== 'C' && last_command !== 'c') &&
                            (last_command !== 'S' && last_command !== 's'))
                        {
                            c1x = current_point[0];
                            c1y = current_point[1];
                        }
                        else
                        {
                            // Compute the new control point
                            const past_control = [...path_container['cubicBeziers'][idCubicBezier-1].p3];
                            past_control[1] = -1 * (past_control[1] - height) // Uninvert 
                            c1x = -1 * (past_control[0] - current_point[0]) + current_point[0];
                            c1y = -1 * (past_control[1] - current_point[1]) + current_point[1];
                        }

                        path_container['cubicBeziers'][idCubicBezier] = {};
                        path_container['cubicBeziers'][idCubicBezier].p1 = [current_point[0], current_point[1] * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p2 = [c1x, c1y * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p3 = [c2x, c2y * -1 + height];
                        path_container['cubicBeziers'][idCubicBezier].p4 = [dx, dy * -1 + height];
                        current_point = [dx, dy];

                        change_command = true;
                        idCubicBezier++;
                        break;
                    }
                case 'a':
                case 'A':
                    {
                        // Not bothering with this one bruh
                        for(let i = 0; i < 5; i++) values.get_next();
                        const dx = values.get_next();
                        const dy = values.get_next();

                        if (current_command === 'a') { // Relative
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        current_point = [dx, dy];

                        break;
                    }
                case '':
                    {
                        change_command = true;
                        break;
                    }
                default:
                    {
                        /*
                            Assumes that this means the command to be used next
                            is the same as the last one

                            We have to go back one position in the array
                        */
                       values.return_to_prev();
                       change_command = false;
                    }
            }

        if(change_command)
        {
            last_command = current_command;
            current_command = values.get_next();

        }
        else
        {
            current_command = last_command;
            //console.log(current_command)
            if(current_command == 'M' || current_command == 'm')
                current_command = 'l';
        }  
        //console.log(current_command)
        
        }while(current_command != null)
    }

    return path_container;
}