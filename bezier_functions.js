import * as gl_2Dmath from "./gl_2Dmath.js"


const cubicMatrix = [-1, 3, -3, 1,
                     3, -6, 3, 0,
                    -3, 3, 0, 0,
                     1, 0, 0, 0];

const quadraticMatrix = [1, -2, 1,
                        0, 2, -2,
                        0, 0, 1];

function point_in_cubic_time(t, curveData)
{
    return gl_2Dmath.multiply_LML_4x4([t*t*t, t*t, t, 1], cubicMatrix, [curveData.p1, curveData.p2, curveData.p3, curveData.p4]);
}


function point_in_quadratic_time(t, curveData)
{
    return gl_2Dmath.multiply_LML_3x3([t*t, t, 1], quadraticMatrix, [curveData.p1, curveData.p2, curveData.p3]);
}



const eval_func = {2:point_in_quadratic_time, 3:point_in_cubic_time};

export function point_in_bezier_time(degree, t, curveData)
{
    return eval_func[degree](t, curveData);
}