import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"
import { read_svg_file } from './svg_reader.js';
import {BezierCurve, point_in_bezier_time } from './bezier_functions.js';


const MAX_POINTS = 1000;
const MAX_PATHS = 2000;

export class PathContainer
{
    constructor(gl)
  {
    this.gl = gl;
  }

  async build()
  {
    const gl = this.gl;
    gl.lineWidth(2.0);

    // ---------------- VAO construction. -----------
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao); // Make it current

    //Vertex buffer for the VAO
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);


    // Create a square to display the functions with fragment shader
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]), gl.STATIC_DRAW);
    //gl.bufferData(gl.ARRAY_BUFFER, MAX_PATHS * MAX_POINTS * 2, gl.STATIC_DRAW);
    
    // ------ Atribute stuff -------
    //gl.enableVertexAttribArray(0);

    /*
    var attribute
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 4*2;      // Size of the vertex
    var offset = 0;        // start at the beginning of the buffer
    */
    //gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4*2, 0);


    // ------------------ Shader construction -------------
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/display.vs");
    const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/display.fs");
    const program = await createProgram(gl, vertexShader, fragmentShader);



    // Assign the created VAO and Shader to the instance
    this.VAO = vao;
    this.Shader = program;

    //Save shader properties
    this.spanLocation = gl.getUniformLocation(program, "u_spanXY");
    this.pointDataLocation = gl.getUniformLocation(program, "u_pointData");
    this.screenSizeLocation = gl.getUniformLocation(program, "u_screenSize");
    this.pointsTotalLocation = gl.getUniformLocation(program, "u_nPoints");


    this.gl.useProgram(this.Shader);
    gl.uniform2f(this.screenSizeLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1i(this.pointDataLocation, 1);


    this.nPaths = 0;
    this.nPoints = 0;
  }

  
  update_span(spanX, spanY)
  {
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
    console.log(spanX, spanY);
  }


  // Returns a texture and how many paths
  create_discrete_paths(svgFile, n_points)
  {
    console.log(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE))
    this.nPoints = n_points;
    if(n_points > MAX_POINTS)
    {
      //throw new Error("Too many points. Better safe than sorry");
      alert("Too many points. Capping to " + MAX_POINTS);
      this.nPoints = MAX_POINTS;
    }
    this.gl.uniform1i(this.pointsTotalLocation, this.nPoints);

    const paths = read_svg_file(svgFile);
    //console.log(paths);
    // const path_container = {'line':{},'quadraticBezier':{}, 'cubicBezier':{}};

    const n_paths = Object.keys(paths['lines']).length + Object.keys(paths['quadraticBeziers']).length + Object.keys(paths['cubicBeziers']).length;

    this.nPaths = n_paths;
    console.log(n_paths);
    if(n_paths > MAX_PATHS)
    {
      alert("Too many paths. Capping to " + MAX_PATHS);
      this.nPaths = MAX_PATHS;
    }
    

    // Create texture for data
    // Height = n_paths
    // Width = n_points 
    
    
    const data = new Float32Array(this.nPoints * this.nPaths * 4);
    //new Uint32Array(this._data.buffer,0,this._width * this._height * 4)

    let currPathID = 0;

    for(const line of paths['lines'])
    {
      const distX = (line.p2[0] - line.p1[0]) / (this.nPoints - 1);
      const distY = (line.p2[1] - line.p1[1]) / (this.nPoints - 1);
      
      for(let i = 0; i < this.nPoints; i++)
      {
        // Interpolate
        data[4 * this.nPoints * currPathID + i * 4 + 0] = line.p1[0] + i * distX;
        data[4 * this.nPoints * currPathID + i * 4 + 1] = line.p1[1] + i * distY;
      }
      currPathID++;
    }


    const bezierContainer = new BezierCurve();

    for(const qB of paths['quadraticBeziers'])
    {
      bezierContainer.build_curve(qB, 2, this.nPoints);
      // Create the points by length parametrization
      for(let i = 0; i < this.nPoints; i++)
      {
        const pointOnCurve = bezierContainer.eval_by_length(i * 1/(this.nPoints-1));
        data[4 * this.nPoints * currPathID + i * 4 + 0] = pointOnCurve[0];
        data[4 * this.nPoints * currPathID + i * 4 + 1] = pointOnCurve[1];
      }
      currPathID++;
    }
    
    for(const cB of paths['cubicBeziers'])
    {
      bezierContainer.build_curve(cB, 3, this.nPoints);
      for(let i = 0; i < this.nPoints; i++)
        {
          const pointOnCurve = bezierContainer.eval_by_length(i * 1/(this.nPoints-1));
          data[4 * this.nPoints * currPathID + i * 4 + 0] = pointOnCurve[0];
          data[4 * this.nPoints * currPathID + i * 4 + 1] = pointOnCurve[1];
        }
        currPathID++;
    }
      
    // Set data
    const dataTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0 + 1),
    this.gl.bindTexture(this.gl.TEXTURE_2D, dataTexture),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST),
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.nPoints, this.nPaths, 0, this.gl.RGBA, this.gl.FLOAT, data);

    //console.log(data)
  }


  draw()
  {
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, this.nPoints, this.nPaths);
  }

}