import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"

const n_p = 100;

export class Grid
{
  constructor(gl, color = [1.0, 1.0, 1.0, 1.0], zoom = 1.0)
  {
    this.color = color;
    this.zoom = zoom;
    this.zoomSpeed = 0.05;

    this.gl = gl;
    this.VAO = null;
    this.Shader = null;
    this.colorLocation = null;
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


    // Create points to allow the grid to be modified

    const pointsX = []
    const pointsY = []
    for(let i = 0; i <= n_p; i++)
    {
      pointsX.push(4.0/n_p * i - 2.0);pointsX.push(-2);
      pointsY.push(-2);pointsY.push(4.0/n_p * i - 2.0);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsX.concat(pointsY)), gl.STATIC_DRAW);
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
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/grid.vs");
    const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/grid.fs");
    const program = await createProgram(gl, vertexShader, fragmentShader);



    // Assign the created VAO and Shader to the instance
    this.VAO = vao;
    this.Shader = program;

    //Save shader properties
    this.colorLocation = gl.getUniformLocation(program, "u_color");
    this.aspectLocation = gl.getUniformLocation(program, "u_aspect");
    this.zoomLocation = gl.getUniformLocation(program, "u_zoom");
    this.xyLocation = gl.getUniformLocation(program, "u_xy");


    this.update_zoom(this.zoom);
    this.update_color(this.color);

  }
/*
  update_zoom(deltaZoom)
  {
    // Maps + to [1,0] and - to [0, infy]
    //this.zoom -= deltaZoom * this.zoomSpeed;

    if (deltaZoom < 0) {
        this.zoom *= (1 + this.zoomSpeed); // Zoom in
    } else {
        this.zoom *= (1 - this.zoomSpeed); // Zoom out
    }

    console.log(this.zoom)

    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.zoom);
  }
*/

  update_zoom(deltaZoom) {
      if (deltaZoom < 0) {
          this.zoom *= (1 + this.zoomSpeed); // Zoom in
      } else {
          this.zoom *= (1 - this.zoomSpeed); // Zoom out
      }

      // Zoom wrapping logic
      const MAX_ZOOM = 4; // Example maximum zoom
      const MIN_ZOOM = 1; // Example minimum zoom

      if(this.zoom > MAX_ZOOM || this.zoom < MIN_ZOOM) this.zoom = 2;


      this.gl.useProgram(this.Shader);
      this.gl.uniform1f(this.zoomLocation, this.zoom);
  }

  update_color(color)
  {
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.colorLocation, color[0], color[1], color[2], color[3]);
  }


  draw()
  {
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);

    gl.uniform1f(this.aspectLocation, gl.canvas.width / gl.canvas.height);
    
    // X
    gl.uniform2f(this.xyLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, 51);
    
    // Y
    gl.uniform2f(this.xyLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, n_p, n_p + 2, 51);

  }
}