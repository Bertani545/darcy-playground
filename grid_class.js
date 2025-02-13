import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"

const n_p = 100;

function lessOrEqualPowerOf2(n) {
  return 1 << 31 - Math.clz32(n);
}



export class Grid
{
  constructor(gl, color = [1.0, 1.0, 1.0, 1.0], zoom = 3.0)
  {
    this.color = color;
    this.zoom = zoom;
    this.zoomSpeed = 0.02;
    this.Offset = [0,0];
    this.sizeSquare = [1,1]
    this.squareRatio = 1;

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
      pointsX.push(1.0/n_p * i);pointsX.push(0);
      pointsY.push(0);pointsY.push(1.0/n_p * i);
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
    this.aspectScreenLocation = gl.getUniformLocation(program, "u_aspectScreen");
    this.zoomLocation = gl.getUniformLocation(program, "u_zoom");
    this.lineSpawnDirectionLocation = gl.getUniformLocation(program, "u_lineSpawnDirection");
    this.gridRatioLocation = gl.getUniformLocation(program, "u_gridRatio");
    this.offsetLocation = gl.getUniformLocation(program, "u_offset");
    this.spanLocation = gl.getUniformLocation(program, "u_spanXY");

    gl.useProgram(this.Shader)
    gl.uniform1f(this.zoomLocation, this.zoom);
    gl.uniform4f(this.colorLocation, ...this.color);


  }

  update_squareSize()
  {
    const screenRatio = this.gl.canvas.height / this.gl.canvas.width;
    // 2 divided by the total amount of squares on screen
    this.sizeSquare[0] =  6 / 50 * this.zoom * screenRatio * this.squareRatio;//6 / 12 * screenRatio * this.squareRatio;
    this.sizeSquare[1] =  6 / 50 * this.zoom

    console.log(this.sizeSquare);
  }

  update_zoom(deltaZoom) {

      if (deltaZoom < 0) {
          this.zoom *= (1 + this.zoomSpeed); // Zoom in
      } else {
          this.zoom *= (1 - this.zoomSpeed); // Zoom out
      }

      // Zoom wrapping logic
      const MAX_ZOOM = 4;
      const MIN_ZOOM = 2;

      //if(this.zoom >= MAX_ZOOM || this.zoom <= MIN_ZOOM) this.zoom = 2.0;
      if(this.zoom > MAX_ZOOM) this.zoom = 2.0;
      if(this.zoom < MIN_ZOOM) this.zoom = 4.0;

      console.log("zoom: " + this.zoom);


      this.gl.useProgram(this.Shader);
      this.gl.uniform1f(this.zoomLocation, this.zoom);
  }

  update_color(color)
  {
    this.color = color;
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.colorLocation, ...color);
  }

  update_ratio(spanX, spanY)
  {
    let lenX = spanX[1] - spanX[0];
    let lenY = spanY[1] - spanY[0];

    // Get the surrounding powers of 2
    let bottomX = lessOrEqualPowerOf2(lenX);
    let topX = bottomX << 1;
    let bottomY = lessOrEqualPowerOf2(lenY);
    let topY = bottomY << 1;

    // Map it [4,2]
    const mapX = (lenX - bottomX) / (topX - bottomX) * 2 + 2;
    const mapY = (lenY - bottomY) / (topY - bottomY) * 2 + 2;

    // Compute ratio
    this.squareRatio = mapY / mapX;



    this.zoom = 3.0;


    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.zoom);
    this.gl.uniform1f(this.gridRatioLocation, this.squareRatio);

  }

  // dx and dy between -1 and 1
  update_offset(dx, dy)
  {
    this.Offset[0] += dx * this.sizeSquare[0] * 2.0;
    this.Offset[1] -= dy * this.sizeSquare[1] * 2.0;

    // Check if bigger than a square
    if(Math.abs(this.Offset[0]) > this.sizeSquare[0]){ this.Offset[0] = 0; }
    if(Math.abs(this.Offset[1]) > this.sizeSquare[1]){ this.Offset[1] = 0; }

    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.offsetLocation, ...this.Offset);
  }

  update_span(spanX, spanY)
  {
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
  }

  draw()
  {
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);

    gl.uniform1f(this.aspectScreenLocation, gl.canvas.height / gl.canvas.width);
    
    // X
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, 50);
    
    // Y
    gl.uniform2f(this.lineSpawnDirectionLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, n_p, n_p + 2, 50);

  }
}