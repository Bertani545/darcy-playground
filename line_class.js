import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"

const n_p = 100;

export class Line
{
  constructor(P1, P2,  color = {r:0.29, g:1, b:0.878})
  {
    this.color = color;
    this.p1 = new Vector2D(P1[0], P1[1]);
    this.p2 = new Vector2D(P2[0], P2[1]);

    this.points = new Float32Array();
    this.update_points();
  }

  modify_p1(x,y){this.p1.x = x; this.p1.y=y; this.update_points();}
  modify_p2(x,y){this.p2.x = x; this.p2.y=y; this.update_points();}

  update_points()
  {
    this.points = new Float32Array([this.p1.x, this.p1.y, this.p2.x, this.p2.y]);
  }
}



export class BezierCurve
{
  constructor(P1, P2, P3, P4, color = {r:1, g:1, b:1}){
    this.color = color
    this.p1 = new Vector2D(P1[0], P1[1]);
    this.p2 = new Vector2D(P2[0], P2[1]);
    this.p3 = new Vector2D(P3[0], P3[1]);
    this.p4 = new Vector2D(P4[0], P4[1]);

    this.Matrix = [-1, 3, -3, 1,
                    3, -6, 3, 0,
                   -3, 3, 0, 0,
                    1, 0, 0, 0];
    this.points = new Float32Array();
    this.update_points();
    this.length_to_time = []
    this.length = 0.0001
  }

  modify_p1(x,y){this.p1.x = x; this.p1.y=y; this.update_points();}
  modify_p2(x,y){this.p2.x = x; this.p2.y=y; this.update_points();}
  modify_p3(x,y){this.p3.x = x; this.p3.y=y; this.update_points();}
  modify_p4(x,y){this.p4.x = x; this.p4.y=y; this.update_points();}


  get matriz(){ return this.Matrix;}

  point_in_curve_time(t)
  {
    if(t < 0 || t > 1) throw new Error("Error. Invalid argument for curve " + t);
    return gl_2Dmath.multiply_LML_4x4([t*t*t, t*t, t, 1], this.Matrix, [this.p1, this.p2, this.p3, this.p4]);
  }

  point_in_curve_length(l)
  {
    
    if(l < 0 || l > 1){
      throw new Error("Invalid length" + l);
    }
    l *= this.length; //Actual value

    //Find it using binary search
    const idx = this.#smallest_or_equal_in_length(l);

    if(Math.abs(this.length_to_time[idx][1] - l) < 0.001 || idx === n_p){return this.point_in_curve_time(this.length_to_time[idx][0]);}


    // Iterpolate lengths
    const ip = (l - this.length_to_time[idx][1]) / (this.length_to_time[idx + 1][1] - this.length_to_time[idx][1])
    let t = (1 - ip) * this.length_to_time[idx][0] +  ip * this.length_to_time[idx + 1][0]; 

    //if(t < 0) t = 0
    return this.point_in_curve_time(t);
  }

  //Parameter assumed to be in the array
  #smallest_or_equal_in_length(p)
  {
    let l = 0; let r = n_p;
    while(l <= r)
    {
      const m = Math.floor((l+r)/2)
      if(this.length_to_time[m][1] > p){r = m-1}
      else{l = m+1}
    }
    return r;

  }

  derivative(t)
  {
    return gl_2Dmath.multiply_LML_4x4([3*t*t, 2*t, 1, 0], this.Matrix, [this.p1, this.p2, this.p3, this.p4])
  }

  update_points()
  {
    let points = []
    
    for(let i = 0; i <= n_p; i++)
    { 
      let p = this.point_in_curve_time(1/n_p * i);
      points.push(p.x);
      points.push(p.y);
    }

    this.points = new Float32Array(points);
    this.build_table();
  }

  build_table()
  {
    this.length_to_time = [[0, 0]];
    for(let i = 1; i <= n_p; i++)
    {
      let t = 1/n_p * i;
      if(i === n_p) t = 1; 
      const dt = this.derivative(t);
      const dxdt = dt.x; const dydt = dt.y;
      this.length_to_time.push([t, this.length_to_time[i-1][1] + 1/n_p * Math.sqrt(dxdt*dxdt + dydt*dydt)])
    }

    this.length = this.length_to_time[n_p][1];
  }

}


export class RenderCurves //Lines
{
  constructor()
  {
      this.VAO = null;
      this.Shader = null;
      this.colorLocation = null;
  }

  static async build(gl)
  {
    gl.lineWidth(5.0);
     const instance = new RenderCurves();

      // ---------------- VAO construction. First so it links the other vbuffers automatically
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao); // Make it current

      //Vertex buffer for the VAO
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      // ------ Atribute stuff -------
      gl.enableVertexAttribArray(0);

      /*
      var attribute
      var size = 2;          // 2 components per iteration
      var type = gl.FLOAT;   // the data is 32bit floats
      var normalize = false; // don't normalize the data
      var stride = 4*2;      // Size of the vertex
      var offset = 0;        // start at the beginning of the buffer
      */
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4*2, 0);


      // ------------------ Shader construction -------------
      const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/line.vs");
      const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/line.fs");
      const program = await createProgram(gl, vertexShader, fragmentShader);



      // Assign the created VAO and Shader to the instance
      instance.VAO = vao;
      instance.Shader = program;

      //Save shader properties
      instance.colorLocation = gl.getUniformLocation(program, "u_color");
      instance.aspectLocation = gl.getUniformLocation(program, "u_aspect");

      // Return the instance
      return instance;
  }

  update_points(gl, curve)
  {
    gl.bindVertexArray(this.VAO);
    gl.bufferData(gl.ARRAY_BUFFER, curve.points, gl.STATIC_DRAW);
  }



  draw(gl, curve)
  {
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);

    this.update_points(gl,curve);

    gl.uniform4f(this.colorLocation, curve.color.r, curve.color.g, curve.color.b, 1);
    gl.uniform1f(this.aspectLocation, gl.canvas.width / gl.canvas.height);
    gl.drawArrays(gl.LINE_STRIP, 0, curve.points.length/2);
  }
}