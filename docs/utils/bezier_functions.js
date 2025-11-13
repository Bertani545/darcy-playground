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

function derivative_of_cubic_time(t, curveData)
{
    return gl_2Dmath.multiply_LML_4x4([3*t*t, 2*t, 1, 0], cubicMatrix, [curveData.p1, curveData.p2, curveData.p3, curveData.p4]);
}


function point_in_quadratic_time(t, curveData)
{
    return gl_2Dmath.multiply_LML_3x3([t*t, t, 1], quadraticMatrix, [curveData.p1, curveData.p2, curveData.p3]);
}

function derivative_of_quadratic_time(t, curveData)
{
    return gl_2Dmath.multiply_LML_3x3([2*t, 1, 0], quadraticMatrix, [curveData.p1, curveData.p2, curveData.p3]);
}


const eval_func = {2:point_in_quadratic_time, 3:point_in_cubic_time};
const eval_derivative = {2:derivative_of_quadratic_time, 3:derivative_of_cubic_time};

export function point_in_bezier_time(degree, t, curveData)
{
    return eval_func[degree](t, curveData);
}

export function derivative_in_bezier_time(degree, t, curveData)
{
    return eval_derivative[degree](t, curveData);
}


export class BezierCurve
{
    constructor()
    {
        this.data = null;
        this.length_to_time = null;
        this.degree = 0;
        this.n_p = -1;
        this.length = 0;
    }

    build_curve(data, degree, resolution_number_of_points)
    {
        this.data = data;
        this.degree = degree;

        // Build table for evaluation by arc length
        this.n_p = resolution_number_of_points;
        this.length_to_time = [[0, 0]]; // First value
        for(let i = 1; i < this.n_p; i++)
        {
            let t = 1/(this.n_p - 1) * i;
            if(i === this.n_p - 1) t = 1; 
            const Ddt = derivative_in_bezier_time(this.degree, t, this.data)
            const dxdt = Ddt[0]; const dydt = Ddt[1];
            this.length_to_time.push([t, this.length_to_time[i-1][1] + 1/(this.n_p-1) * Math.sqrt(dxdt*dxdt + dydt*dydt)])
        }
        this.length = this.length_to_time[this.n_p - 1][1];
    }

    // Between 0 and 1
    eval_by_length(l_frac)
    {
        if( 0 > l_frac || l_frac > 1) throw new Error(`Invalid Length fraction`)
        const l = l_frac *= this.length;

            //Find it using binary search
        const idx = this.#smallest_or_equal_in_length(l);

        if(Math.abs(this.length_to_time[idx][1] - l) < 0.0001 || idx === this.n_p-1){return this.eval_by_parameter(this.length_to_time[idx][0]);}


        // Iterpolate lengths
        const ip = (l - this.length_to_time[idx][1]) / (this.length_to_time[idx + 1][1] - this.length_to_time[idx][1])
        let t = (1 - ip) * this.length_to_time[idx][0] +  ip * this.length_to_time[idx + 1][0]; 

        //if(t < 0) t = 0
        return this.eval_by_parameter(t);
    }

    //Parameter assumed to be in the array
    #smallest_or_equal_in_length(p)
    {
        let l = 0; let r = this.n_p-1;
        while(l <= r)
        {
        const m = Math.floor((l+r)/2)
        if(this.length_to_time[m][1] > p){r = m-1}
        else{l = m+1}
        }
        return r;

    }    

    eval_by_parameter(t)
    {
        if(!this.data) throw new Error("No curve avaible");
        return eval_func[this.degree](t, this.data);
    }

}