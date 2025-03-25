import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor, buildFrameBuffer_ColorOnly, buildFrameBuffer_computeShader } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"
import { PathContainer } from './path_class.js';

const n_p = 100;
const n_instances = 50;

function lessOrEqualPowerOf2(n) {
  return 1 << 31 - Math.clz32(n);
}



export class Grid
{
  constructor(gl, ctx_second_canvas, text_container, zoom_speed, color = [1.0, 1.0, 1.0, 1.0], zoom = 3.0)
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

    this.ctx = ctx_second_canvas;
    this.pixelContainer;

    this.textContainer = text_container;
    this.create_text_instances();

    this.curves = new PathContainer(this.gl);

    this.spanX = [0,0]
    this.spanY = [0,0]
    this.middleX = [0,0]
    this.middleY = [0,0]
    this.spanTransformed = new Float32Array(4);
  }

  async build(spanX, spanY)
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

    await this.curves.build();

    // Create second buffer for the second canvas
    // contains id and texture
    this.secondBuffer = buildFrameBuffer_ColorOnly(this.gl, 0, gl.canvas.width, gl.canvas.height);
    this.pixelContainer = new Uint8ClampedArray(gl.canvas.width * gl.canvas.height * 4);
    
    
    // Two otther frame buffers for "compute" shaders
    this.VAOComputeShader = gl.createVertexArray();
    this.gl.bindVertexArray(this.VAOComputeShader);
    const vertexBufferCS = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCS);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]), gl.STATIC_DRAW); // Square

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4*2, 0);
    
    const vertexShaderCS = await createShader(gl, gl.VERTEX_SHADER, "./shaders/simple.vs");
    const fragmentShaderCS = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/reduction.fs");
    this.computeShader = await createProgram(gl, vertexShaderCS, fragmentShaderCS);
    
    this.floatGrid01 = buildFrameBuffer_computeShader(this.gl, 2, 1024, 1024);
    this.floatGrid01.texID = 2;
    this.floatGrid02 = buildFrameBuffer_computeShader(this.gl, 3, 1024, 1024);
    this.floatGrid02.texID = 3;
    this.gl.bindVertexArray(null);

    // Final setup
    this.update_span(spanX, spanY);
    this.update_ratio();
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
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
  update_text_labels()
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
      const position = x * (this.spanX[1] - this.spanX[0]) + this.spanX[0]; 

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
      const position = y * (this.spanY[1] - this.spanY[0]) + this.spanY[0]; 

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

    console.log(...this.sizeSquare);
  }

  update_zoom(deltaZoom) {

      if (deltaZoom < 0) {
          this.zoom *= (1 + this.zoomSpeed); // Zoom in
          this.Offset = this.Offset.map(x => x * (1 + this.zoomSpeed));

          this.sizeX = (this.spanX[1] - this.spanX[0]) / (1 + this.zoomSpeed);
          this.spanX = [this.middleX - this.sizeX/2, this.middleX + this.sizeX/2];

          this.sizeY = (this.spanY[1] - this.spanY[0]) / (1 + this.zoomSpeed);
          this.spanY = [this.middleY - this.sizeY/2, this.middleY + this.sizeY/2];

      } else {
          this.zoom /= (1 + this.zoomSpeed); // Zoom out
          this.Offset = this.Offset.map(x => x / (1 + this.zoomSpeed));

          
          this.sizeX = (this.spanX[1] - this.spanX[0]) * (1 + this.zoomSpeed);
          this.spanX = [this.middleX - this.sizeX/2, this.middleX + this.sizeX/2];

          this.sizeY = (this.spanY[1] - this.spanY[0]) * (1 + this.zoomSpeed);
          this.spanY = [this.middleY - this.sizeY/2, this.middleY + this.sizeY/2];
      }
      this.update_span(this.spanX, this.spanY);

      // Zoom wrapping logic
      const MAX_ZOOM = 4;
      const MIN_ZOOM = 2;

      //if(this.zoom >= MAX_ZOOM || this.zoom <= MIN_ZOOM) this.zoom = 2.0;
      if(this.zoom > MAX_ZOOM) this.zoom = 2.0;
      if(this.zoom < MIN_ZOOM) this.zoom = 4.0;

      console.log("zoom: " + this.zoom);

      this.update_squareSize();

    
      //console.log("Offset: " + (this.Offset))
      if(Math.abs(this.Offset[0] ) >  this.sizeSquare[0]){ this.Offset[0] %= this.sizeSquare[0]; }
      if(Math.abs(this.Offset[1]) >  this.sizeSquare[1]){ this.Offset[1] %= this.sizeSquare[1]; }


    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.offsetLocation, ...this.Offset);
      this.gl.uniform1f(this.zoomLocation, this.zoom);
  }

  update_offset(dx, dy)
  {

    dx *= this.squareSize[0] * 2.0; 
    dy *= this.squareSize[1] * 2.0;

    this.Offset[0] += dx * this.zoom;
    this.Offset[1] -= dy * this.zoom;

    // Check if bigger than a square
    if(Math.abs(this.Offset[0] ) >  this.sizeSquare[0]){ this.Offset[0] %= this.sizeSquare[0]; }
    if(Math.abs(this.Offset[1]) >  this.sizeSquare[1]){ this.Offset[1] %= this.sizeSquare[1]; }

    //this.Offset[0] = (this.Offset[0] + this.sizeSquare[0]) % this.sizeSquare[0];
    //this.Offset[1] = (this.Offset[1] + this.sizeSquare[1]) % this.sizeSquare[1];


    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.offsetLocation, ...this.Offset);

    //update sapan
    // Square size in screen space, move to world space
    dx = dx * (this.spanX[1] - this.spanX[0]) / 2 * this.zoom;
    dy = dy * (this.spanY[1] - this.spanY[0]) / 2 * this.zoom;

    // Now for span
    this.spanX[0] -= dx;
    this.spanX[1] -= dx;

    this.spanY[0] += dy;
    this.spanY[1] += dy;

    this.update_span(this.spanX, this.spanY);
  }

  update_span(spanX, spanY)
  {
    this.spanX = [...spanX];
    this.spanY = [...spanY];
    this.middleX = (spanX[1] + spanX[0])/2;
    this.middleY = (spanY[1] + spanY[0])/2;
    this.curves.update_span(this.spanX, this.spanY);
    this.update_text_labels();
    //console.log("Span updated");
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
  }

  
  update_span_hard(spanX, spanY)
  {
    // Resets the offset and changes squeare size
    this.Offset = [0,0]
    this.spanX = [...spanX];
    this.spanY = [...spanY];
    this.middleX = (spanX[1] + spanX[0])/2;
    this.middleY = (spanY[1] + spanY[0])/2;
    this.update_ratio();
    this.update_squareSize();
    
    this.curves.update_span(this.spanX, this.spanY);
    this.update_text_labels();
    //console.log("Span updated");
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.spanLocation,...spanX, ...spanY);
    
  }


  #generateGridData(width, height) {
    const data = new Float32Array(width * height * 4); // RGBA32F (4 floats per pixel)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
        
            const point = [2/width*x -1, 2/height*y -1];
            data[index]     = point[0] * point[0];  
            data[index + 1] = data[index];
            data[index + 2] = point[1]; 
            data[index + 3] = data[index + 2]; 
          }
      }
      return data;
  }



  update_secondView_span()
  {
    const gl = this.gl;
    // Future first function to obtain the values of the grid
    // Test
    const data = this.#generateGridData(1024, 1024);
    console.log(data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.floatGrid02.ID);
    const texture = gl.createTexture();
    // make unit i the active texture unit
    gl.activeTexture(gl.TEXTURE0 + 3);
    // Bind texture to 'texture unit i' 2D bind point
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Set the parameters so we don't need mips and so we're not filtering
    // and we don't repeat
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, 1024, 0, gl.RGBA, gl.FLOAT, data);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.bindVertexArray(this.VAOComputeShader);
    gl.useProgram(this.computeShader);
    // Run the algorithm to obtain the bounding box limits

    console.log(this.floatGrid01.texID)
    const frameBuffers =  [this.floatGrid01, this.floatGrid02];
    for (let i = 9; i >= 0; i--) {
        const newSize = (1 << i);
    
        // Set viewport for the current reduction step
        gl.viewport(0, 0, newSize, newSize);
    
        // Bind output framebuffer (ping-pong buffer)
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[(i+1)%2].ID); 
        //gl.clear(gl.COLOR_BUFFER_BIT);
    
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(this.computeShader, "u_currentPower"), i);
        gl.uniform1i(gl.getUniformLocation(this.computeShader, "u_pointData"), frameBuffers[i%2].texID);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    //gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1].ID);
    gl.readPixels(0,0,1,1, gl.RGBA,gl.FLOAT, this.spanTransformed); // From current framebuffer

    console.log(this.spanTransformed);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }


  // Used when manually inputing the new span
  update_ratio()
  {
    let lenX = this.spanX[1] - this.spanX[0];
    let lenY = this.spanY[1] - this.spanY[0];

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

  update_color(color)
  {
    this.color = color;
    this.gl.useProgram(this.Shader);
    this.gl.uniform4f(this.colorLocation, ...color);
  }

  get squareSize()
  {
    return this.sizeSquare;
  }

  create_discrete_paths(svgFile, n_points)
  {
    const limits = this.curves.create_discrete_paths(svgFile, n_points);

    // Update viewport
    let szX = limits.Right - limits.Left;
    let szY = limits.Top - limits.Bottom;
    const aspectSVG = szX / szY;
    const aspectCanvas = this.gl.canvas.width / this.gl.canvas.height;

    if(aspectSVG > aspectCanvas)
    {
      // Fit to width
      const newHeight = szX / aspectCanvas;
      const centerY = (limits.Top + limits.Bottom) / 2.0;
      limits.Top = centerY + newHeight / 2.0;
      limits.Bottom = centerY - newHeight / 2.0;
    }
    else
    {
      // Fit to heigth
      const newWidth = szY * aspectCanvas;
      const centerX = (limits.Right + limits.Left) / 2.0;
      limits.Right = centerX + newWidth / 2.0;
      limits.Left = centerX - newWidth / 2.0;
    }


    this.update_span_hard([limits.Left-10, limits.Right+10], [limits.Bottom-10, limits.Top+10]);
  }



  draw()
  {
    const gl = this.gl;

    // Draw to the first canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    
    // X
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);
    
    // Y
    gl.uniform2f(this.lineSpawnDirectionLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, n_p, n_p + 2, n_instances);


    this.curves.draw();


    // Draw to the texture
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.secondBuffer.ID);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);
    gl.uniform2f(this.lineSpawnDirectionLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, n_p, n_p + 2, n_instances);

    // Pass the texture to the second canvas
    gl.readPixels(0,0,gl.canvas.width, gl.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,this.pixelContainer); // From current framebuffer
    const imageData = new ImageData(this.pixelContainer, gl.canvas.width, gl.canvas.height);
    this.ctx.putImageData(imageData, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}