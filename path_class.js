import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"


export class PathContainer
{
    constructor(gl)
  {
    this.gl = gl;
  }

  async build()
  {
    const gl = this.gl;
    //gl.lineWidth(2.0);

    // ---------------- VAO construction. -----------
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao); // Make it current

    //Vertex buffer for the VAO
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);


    // Create a square to display the functions with fragment shader
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.5,-1.5,  1.5,-1.5,  -1.5,1.5,  1.5,1.5]), gl.STATIC_DRAW);
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
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/display.vs");
    const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/display.fs");
    const program = await createProgram(gl, vertexShader, fragmentShader);



    // Assign the created VAO and Shader to the instance
    this.VAO = vao;
    this.Shader = program;

    //Save shader properties
    this.spanLocation = gl.getUniformLocation(program, "u_spanXY");
    this.bezierLocation = gl.getUniformLocation(program, "u_bezierPoints");
    this.screenSizeLocation = gl.getUniformLocation(program, "u_screenSize");


    this.gl.useProgram(this.Shader);
    gl.uniform2f(this.screenSizeLocation, gl.canvas.width, gl.canvas.height);

  }

  update_span(spanX, spanY)
  {
    //console.log("Span updated bezier");
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
  }


  add_Path()
  {

  }


  draw()
  {
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);

    // X
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
  }

}