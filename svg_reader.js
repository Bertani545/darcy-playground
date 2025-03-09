
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
const EPS = 0.00001; // Change to allow different resolutions

class ArrayTraveler
{
    constructor(arr)
    {
        this.arr = arr;
        this.id = 0;
    }
    get_next()
    {
        const value = this.arr[this.id];
        this.id++;
        if(this.id > this.arr.length) return null;
        return value;
    }
    return_to_prev()
    {
        this.id--;
        if(this.id < 0) throw new Error("Invalid negative index");
    }
    go_to_id(id)
    {
        this.id = id;
    }
    go_to_start()
    {
        this.id = 0;
    }
}


export function read_svg_file(file)
{
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(file, "image/svg+xml");
    const paths = xmlDoc.getElementsByTagName("path");

    const path_container = {'line':{},'squareBezier':{}, 'cubicBezier':{}};

    for (let path of paths) {
        const values = new ArrayTraveler(path.getAttribute("d").split(/[ ,]+/));
        
        let change_command = false;
        let idCubicBezier = 0;
        let idSquareBezier = 0;
        let idLine = 0;

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
                        const dx = parseFloat(values.get_next());
                        const dy = parseFloat(values.get_next());
                        current_point[0] += dx;
                        current_point[1] += dy;

                        initial_point = [... current_point];
                        change_command = true;
                        break;
                    }
                case 'L':
                case 'l':
                    {
                        let dx = parseFloat(values.get_next());
                        let dy = parseFloat(values.get_next());

                        if (current_command === 'l') { // Relative
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        if(Math.abs(current_point[0] - dx) < EPS && Math.abs(current_point[1] - dy) < EPS)
                        {
                            // A point
                            break;
                        }

                        path_container['line'][idLine] = {}; 
                        path_container['line'][idLine].p1 = [...current_point];
                        path_container['line'][idLine].p2 = [dx, dy];
                        current_point = [dx, dy];

                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'H':
                case 'h':
                    {
                        let dx = parseFloat(values.get_next());

                        if (current_command === 'h') { // Relative
                            dx += current_point[0];
                        }

                        path_container['line'][idLine] = {}; 
                        path_container['line'][idLine].p1 = [...current_point];
                        path_container['line'][idLine].p2 = [dx, current_point[1]];
                        current_point = [dx, current_point[1]];

                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'V':
                case 'v':
                    {
                        let dy = parseFloat(values.get_next());

                        if (current_command === 'v') { // Relative
                            dy += current_point[1];
                        }

                        path_container['line'][idLine] = {}; 
                        path_container['line'][idLine].p1 = [...current_point];
                        path_container['line'][idLine].p2 = [current_point[0], dy];
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
                        path_container['line'][idLine] = {};
                        path_container['line'][idLine].p1 = [...current_point];
                        path_container['line'][idLine].p2 = [...initial_point];
                        current_point = [...initial_point];
                            
                        change_command = true;
                        idLine++;
                        break;
                    }
                case 'Q':
                case 'q':
                    {
                        let cx = parseFloat(values.get_next());
                        let cy = parseFloat(values.get_next());
                        let dx = parseFloat(values.get_next());
                        let dy = parseFloat(values.get_next());

                        if (current_command === 'q') { // Relative
                            cx += current_point[0];
                            cy += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        path_container['squareBezier'][idSquareBezier] = {};
                        path_container['squareBezier'][idSquareBezier].p1 = [...current_point];
                        path_container['squareBezier'][idSquareBezier].c = [cx, cy];
                        path_container['squareBezier'][idSquareBezier].p2 = [dx, dy];
                        current_point = [dx, dy];

                        change_command = true;
                        idSquareBezier++;
                        break;
                    }
                case 'T':
                case 't':
                    {
                        let dx = parseFloat(values.get_next());
                        let dy = parseFloat(values.get_next());
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
                            const past_control = path_container['squareBezier'][idSquareBezier-1].c;
                            cx = -1 * (past_control[0] - current_point[0]) + current_point[0];
                            cy = -1 * (past_control[1] - current_point[1]) + current_point[1];
                        }

                        path_container['squareBezier'][idSquareBezier] = {};
                        path_container['squareBezier'][idSquareBezier].p1 = [...current_point];
                        path_container['squareBezier'][idSquareBezier].c = [cx, cy];
                        path_container['squareBezier'][idSquareBezier].p2 = [dx, dy];
                        current_point = [dx, dy];

                        change_command = true;
                        idSquareBezier++;
                        break;
                    }
                case 'C':
                case 'c':
                    {
                        let c1x = parseFloat(values.get_next());
                        let c1y = parseFloat(values.get_next());
                        let c2x = parseFloat(values.get_next());
                        let c2y = parseFloat(values.get_next());
                        let dx = parseFloat(values.get_next());
                        let dy = parseFloat(values.get_next());

                        if (current_command === 'c') { // Relative
                            c1x += current_point[0];
                            c1y += current_point[1];
                            c2x += current_point[0];
                            c2y += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        path_container['cubicBezier'][idCubicBezier] = {};
                        path_container['cubicBezier'][idCubicBezier].p1 = [...current_point];
                        path_container['cubicBezier'][idCubicBezier].c1 = [c1x, c1y];
                        path_container['cubicBezier'][idCubicBezier].c2 = [c2x, c2y];
                        path_container['cubicBezier'][idCubicBezier].p2 = [dx, dy];
                        current_point = [dx, dy];

                        change_command = true;
                        idCubicBezier++;
                        break;
                    }
                case 'S':
                case 's':
                    {
                        let c2x = parseFloat(values.get_next());
                        let c2y = parseFloat(values.get_next());
                        let dx = parseFloat(values.get_next());
                        let dy = parseFloat(values.get_next());
                        if (current_command === 's') { // Relative
                            c2x += current_point[0];
                            c2y += current_point[1];
                            dx += current_point[0];
                            dy += current_point[1];
                        }

                        let c1x, c1y;
                        if((last_command !== 'C' && last_command !== 'c') &&
                            (last_command !== 'S' && last_command !== 's'))
                        {
                            c1x = current_point[0];
                            c2x = current_point[1];
                        }
                        else
                        {
                            // Compute the new control point
                            const past_control = path_container['cubicBezier'][idCubicBezier-1].c2;
                            c1x = -1 * (past_control[0] - current_point[0]) + current_point[0];
                            c1y = -1 * (past_control[1] - current_point[1]) + current_point[1];
                        }

                        path_container['cubicBezier'][idCubicBezier] = {};
                        path_container['cubicBezier'][idCubicBezier].p1 = [...current_point];
                        path_container['cubicBezier'][idCubicBezier].c1 = [c1x, c1y];
                        path_container['cubicBezier'][idCubicBezier].c2 = [c2x, c2y];
                        path_container['cubicBezier'][idCubicBezier].p2 = [dx, dy];
                        current_point = [dx, dy];

                        change_command = true;
                        idCubicBezier++;
                        break;
                    }
                case 'a':
                case 'A':
                    {
                        // Not bothering with this one bruh
                        for(let i = 0; i < 7; i++) values.get_next();
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
        }  
        
        }while(current_command != null)
    }

    console.log(path_container);
    return path_container;
}