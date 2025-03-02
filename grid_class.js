import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"

const n_p = 100;
const n_instances = 50;

function lessOrEqualPowerOf2(n) {
  return 1 << 31 - Math.clz32(n);
}



export class Grid
{
  constructor(gl, text_container, zoom_speed, color = [1.0, 1.0, 1.0, 1.0], zoom = 3.0)
  {
    this.color = color;
    this.zoomSpeed = zoom_speed;
    this.zoom = zoom;
    this.Offset = [0,0];
    this.sizeSquare = [1,1]
    this.squareRatio = 1;

    this.gl = gl;
    this.VAO = null;
    this.Shader = null;
    this.colorLocation = null;

    this.textContainer = text_container;
    this.create_text_instances();
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
    gl.uniform1f(this.aspectScreenLocation, gl.canvas.height / gl.canvas.width);


  }

  create_text_instances()
  {
    for(let i = 0; i < n_instances * 2; i++)
    {
      const temp_div = document.createElement("div");
      temp_div.className = "grid_numbers";
      const textNode = document.createTextNode("");
      temp_div.appendChild(textNode);
      this.textContainer.appendChild(temp_div);
    }
  }

  // Assumes that we are starting at -3 and end at 3
  update_text_labels(spanX, spanY)
  {
    // Called after zoom or drag
    // Get the position for the numbers
    // Create the divs
    // Put them accordingly
    const screenRatio = this.gl.canvas.height / this.gl.canvas.width;
    let i = 0;
    for(i; i < n_instances; i++) // Horizontal
    {
      const curr_div = this.textContainer.children[i];
      let x = -3 * this.squareRatio * screenRatio + i * (6 / n_instances) * this.squareRatio * screenRatio;

      // Transform them to clip coords
      x = (x * this.zoom  + this.Offset[0] + 1) / 2;
      if(x < 0 || x > 1)
      {
        curr_div.style.color = "rgba(0,0,0,0)";
      }else
      {
        curr_div.style.color = "rgba(255,255,0,1)";
      }

      // Obtain position for display
      const position = x * (spanX[1] - spanX[0]) + spanX[0]; 

      // Transform to screen cords
      x *= this.gl.canvas.width;

      curr_div.style.left = (x + 10) + "px";
      curr_div.style.top  = 10 + "px";
      curr_div.textContent = position.toFixed(2);
    }


    for(i; i < 2*n_instances; i++) // Vertical
    {
      const curr_div = this.textContainer.children[i];
      let y = -3  + (i - n_instances) * (6 / n_instances);

      // Transform them to clip coords
      y = (y * this.zoom  + this.Offset[1] + 1) / 2;
      if(y < 0 || y > 1)
      {
        curr_div.style.color = "rgba(0,0,0,0)";
      }else
      {
        curr_div.style.color = "rgba(255,255,0,1)";
      }

      // Obtain position for display
      const position = y * (spanY[1] - spanY[0]) + spanY[0]; 

      // Transform to screen cords
      y = y * -1 + 1;
      y *= this.gl.canvas.height;

      curr_div.style.left = 10 + "px";
      curr_div.style.top  = (y + 10) + "px";
      curr_div.textContent = position.toFixed(2);
    }
  }

  // Screen space
  update_squareSize()
  {
    const screenRatio = this.gl.canvas.height / this.gl.canvas.width;
    this.sizeSquare[0] =  6 / 50 * this.zoom * screenRatio * this.squareRatio;
    // Distance * zoom * screenRatio * squareRatio
    // Distance = 6 / number of lines
    // 6 = [-3,3]
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

      this.update_squareSize();

      this.gl.useProgram(this.Shader);
      this.gl.uniform1f(this.zoomLocation, this.zoom);
  }

  update_color(color)
  {
    this.color = color;
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.colorLocation, ...color);
  }

  // Used when manually inputing the new span
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
    this.update_squareSize();

    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.zoom);
    this.gl.uniform1f(this.gridRatioLocation, this.squareRatio);

  }

  get squareSize()
  {
    return this.sizeSquare;
  }

  update_offset(dx, dy)
  {
    this.Offset[0] += dx;
    this.Offset[1] -= dy;

    // Check if bigger than a square
    if(Math.abs(this.Offset[0]) > this.sizeSquare[0]){ this.Offset[0] %= this.sizeSquare[0]; }
    if(Math.abs(this.Offset[1]) > this.sizeSquare[1]){ this.Offset[1] %= this.sizeSquare[1]; }

    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.offsetLocation, ...this.Offset);
  }

  update_span(spanX, spanY)
  {
    this.update_text_labels(spanX, spanY);
    //console.log("Span updated");
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
  }

  draw()
  {
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    
    // X
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);
    
    // Y
    gl.uniform2f(this.lineSpawnDirectionLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, n_p, n_p + 2, n_instances);

  }
}