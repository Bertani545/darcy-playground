import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor, buildFrameBuffer_ColorOnly, buildFrameBuffer_computeShader, loadShaderFile, createShader_fromSourceCode } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"
import { PathContainer } from './path_class.js';

import * as Parser from "./parser.js";

const n_p = 500;
const n_instances = 20;

function lessOrEqualPowerOf2(n) {
  let pow = Math.log(n);
  //pow = pow < 0 ? Math.ceil(pow) : Math.floor(pow);
  return Math.floor(pow);
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

    // Initial version of the function
    this.transformFunction = `vec2 f(vec2 p){return p;}`

    // ------------------ Shader construction -------------
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/grid.vs");
    this.fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/grid.fs");
    const program = await createProgram(gl, vertexShader, this.fragmentShader);

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
    
    
    // Two other frame buffers for "compute" shaders
    this.VAOComputeShader = gl.createVertexArray();
    this.gl.bindVertexArray(this.VAOComputeShader);
    const vertexBufferCS = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCS);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]), gl.STATIC_DRAW); // Square

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4*2, 0);
    
    this.simpleVS = await createShader(gl, gl.VERTEX_SHADER, "./shaders/simple.vs");
    const fragmentShaderCS = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/reduction.fs");
    this.computeShader = await createProgram(gl, this.simpleVS, fragmentShaderCS);
    
    this.floatGrid01 = buildFrameBuffer_computeShader(this.gl, 2, 1024, 1024);
    this.floatGrid01.texID = 2;
    this.floatGrid02 = buildFrameBuffer_computeShader(this.gl, 3, 1024, 1024);
    this.floatGrid02.texID = 3;
    this.gl.bindVertexArray(null);
    /*
      All the code to support a varying shader
    */
    

    // We save the original version
    this.computeFunctionFS_source = await loadShaderFile("./shaders/fill_grid.fs");
    this.gridTransVertexShader_source = await loadShaderFile("./shaders/transformedGrid.vs");
    this.computeFunctionFS = null; this.functionProgram = null;
    this.gridTransformedVS = null; this.programGridTransformed = null;
    
    this.f1 = "\nfloat f1(vec2 p){return p.x;}\n"
    this.f2 = "\nfloat f2(vec2 p){return p.y;}\n"
    await this.#build_new_shaders();

    // Final setup
    this.update_span(spanX, spanY);
    this.update_ratio();
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);


    
  }

  async update_f1(input)
  {
    this.f1 = Parser.toGLSL_f1(input);
    await this.#build_new_shaders();
    this.update_viewport(this.spanX, this.spanY)
  }
  async update_f2(input)
  {
    this.f2 = Parser.toGLSL_f2(input);
    await this.#build_new_shaders();
    this.update_viewport(this.spanX, this.spanY)

  }


  update_viewport(spanX, spanY)
  {
    // Update viewport
    let szX = spanX[1] - spanX[0];
    let szY = spanY[1] - spanY[0];
    const aspectSVG = szX / szY;
    const aspectCanvas = this.gl.canvas.width / this.gl.canvas.height;

    if(aspectSVG > aspectCanvas)
    {
      // Fit to width
      const newHeight = szX / aspectCanvas;
      const centerY = (spanY[0] + spanY[1]) / 2.0;
      spanY[1] = centerY + newHeight / 2.0;
      spanY[0] = centerY - newHeight / 2.0;
    }
    else
    {
      // Fit to heigth
      const newWidth = szY * aspectCanvas;
      const centerX = (spanX[0] + spanX[1]) / 2.0;
      spanX[1] = centerX + newWidth / 2.0;
      spanX[0] = centerX - newWidth / 2.0;
    }
    this.update_span_hard(spanX, spanY);
  }

  async #build_new_shaders()
  {
    /*
    this.transformFunction = "vec2 f(vec2 p) {return vec2(2. * p.x, p.y);}"
  
    this.transformFunction = `
    vec2 f(vec2 uv) {
        float r = length(uv);  // Compute radius
        float theta = atan(uv.y, uv.x);  // Compute angle
        
        // Apply nonlinear distortion to radius
        float rNew = pow(r, 2.0);
        
        // Convert back to Cartesian coordinates
        return vec2(rNew * cos(theta), rNew * sin(theta));
    }
    `;
*/
    this.transformFunction = `uniform float u_t;
                              #define PI 3.14159265359
                              #define TAU 6.283185307179586
                              #define E 2.718281828459

                              float gamma(float x) {
                                // Stirling approximation
                                x--;
                                return sqrt(2.0 * PI * x) * pow(x, x) * 1.0 / pow(E, x);
                              }

                              float cot(float x) {return 1.0 / tan(x);}
                              float sec(float x) {return 1.0 / cos(x);}
                              float csc(float x) {return 1.0 / sin(x);}

                              float coth(float x) {return cosh(x) / sinh(x);}
                              float sech(float x) {return 1.0 / cosh(x);}
                              float csch(float x) {return 1.0 / sinh(x);}

                              float log10(float x) {return log(x) *0.434294481903;}

                              ` ;
    this.transformFunction += this.f1 + this.f2 + "vec2 f(vec2 p){ return vec2(f1(p), f2(p));}"
    console.log(this.transformFunction)

    await this.curves.update_transformed_shader(this.transformFunction);

    const gl = this.gl;

    // We send to compile the modified ones
    this.computeFunctionFS = await createShader_fromSourceCode(gl, gl.FRAGMENT_SHADER, this.computeFunctionFS_source.replace("REPLACE", this.transformFunction));
    console.log(this.computeFunctionFS_source.replace("REPLACE", this.transformFunction))
    // And finaly create the shaders
    this.functionProgram = await createProgram(gl, this.simpleVS, this.computeFunctionFS);
    gl.useProgram(this.functionProgram)
    gl.uniform1f(gl.getUniformLocation(this.functionProgram, "u_numberDivisions"), 1024);
    
    
    this.gridTransformedVS = await createShader_fromSourceCode(gl, gl.VERTEX_SHADER, this.gridTransVertexShader_source.replace("REPLACE", this.transformFunction));
    this.programGridTransformed = await createProgram(gl, this.gridTransformedVS, this.fragmentShader);
    gl.useProgram(this.programGridTransformed);
    gl.uniform1f(gl.getUniformLocation(this.programGridTransformed, "u_zoom"), this.zoom);
    gl.uniform1f(gl.getUniformLocation(this.programGridTransformed, "u_aspectScreen"), gl.canvas.height / gl.canvas.width);
    
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
      let x = -1.25 * this.squareRatio * screenRatio + i * (2.5 / n_instances) * this.squareRatio * screenRatio;

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
      let y = -1.25  + (i - n_instances) * (2.5 / n_instances);

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
    this.sizeSquare[0] =  2.5 / n_instances * this.zoom * screenRatio * this.squareRatio;
    // Distance * zoom * screenRatio * squareRatio
    // Distance = 6 / number of lines
    // 6 = [-3,3]
    this.sizeSquare[1] =  2.5 / n_instances * this.zoom

    this.update_text_labels();

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

    this.gl.useProgram(this.programGridTransformed);
    this.gl.uniform2f(this.gl.getUniformLocation(this.programGridTransformed, "u_offset"), ...this.Offset);
    this.gl.uniform1f(this.gl.getUniformLocation(this.programGridTransformed, "u_zoom"), this.zoom);
    
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

    this.gl.useProgram(this.programGridTransformed);
    this.gl.uniform2f(this.gl.getUniformLocation(this.programGridTransformed, "u_offset"), ...this.Offset);

    //update span
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
    this.update_text_labels();
    //console.log("Span updated");

    this.update_secondView_span();
    
  }

  
  update_span_hard(spanX, spanY)
  {
    // Resets the offset and changes squeare size
    this.Offset = [0,0]

    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.offsetLocation, ...this.Offset);

    this.gl.useProgram(this.programGridTransformed);
    this.gl.uniform2f(this.gl.getUniformLocation(this.programGridTransformed, "u_offset"), ...this.Offset);

    this.spanX = [...spanX];
    this.spanY = [...spanY];
    this.middleX = (spanX[1] + spanX[0])/2;
    this.middleY = (spanY[1] + spanY[0])/2;
    this.update_ratio();
    this.update_squareSize();
    
    this.update_text_labels();
    //console.log("Span updated");
    this.update_secondView_span();
  }


  update_secondView_span()
  {
    const gl = this.gl;
    gl.bindVertexArray(this.VAOComputeShader);
    gl.viewport(0, 0, 1024, 1024);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.floatGrid02.ID); // The first used as tex is grid02
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.functionProgram);

    gl.uniform2f(gl.getUniformLocation(this.functionProgram, "u_spanX"), ...this.spanX);
    gl.uniform2f(gl.getUniformLocation(this.functionProgram, "u_spanY"), ...this.spanY);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    gl.useProgram(this.computeShader);
    // Run the algorithm to obtain the bounding box limits
    const frameBuffers =  [this.floatGrid01, this.floatGrid02];
    // Original size is 1024 x 1024
    for (let i = 9; i >= 0; i--) {
        const newSize = (1 << i);
    
        // Set viewport for the current reduction step
        gl.viewport(0, 0, newSize, newSize);
    
        // Bind output framebuffer (ping-pong buffer)
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[(i+1)%2].ID); 
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(this.computeShader, "u_currentPower"), i);
        gl.uniform1i(gl.getUniformLocation(this.computeShader, "u_pointData"), frameBuffers[i%2].texID);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    //gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1].ID);
    gl.readPixels(0,0,1,1, gl.RGBA,gl.FLOAT, this.spanTransformed); // From current framebuffer
    console.log("Span transformed ", this.spanTransformed )

    // Change the aspect ratio
    const aspect = (this.spanX[1]-this.spanX[0])/(this.spanY[1]-this.spanY[0]);
    const trans_aspect = (this.spanTransformed[1]-this.spanTransformed[0])/(this.spanTransformed[3]-this.spanTransformed[2])

    if(trans_aspect > aspect)
    {
      // Too wide
      const newHeight = (this.spanTransformed[1]-this.spanTransformed[0]) / aspect;
      const centerY = (this.spanTransformed[2]+this.spanTransformed[3]) / 2.0;
      this.spanTransformed[3] = centerY + newHeight / 2.0;
      this.spanTransformed[2] = centerY - newHeight / 2.0;

    }
    else
    {
      // Too tall
      const newWidth = (this.spanTransformed[3]-this.spanTransformed[2]) * aspect;
      const centerX = (this.spanTransformed[0]+this.spanTransformed[1]) / 2.0;
      this.spanTransformed[1] = centerX + newWidth / 2.0;
      this.spanTransformed[0] = centerX - newWidth / 2.0;
    }


    //console.log(this.spanTransformed);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  update_transform_function()
  {
    // Re do the shaders for obtainning the grid and the render shaders in the second canvas
  }

  // Used when manually inputing the new span
  update_ratio()
  {
    let lenX = this.spanX[1] - this.spanX[0];
    let lenY = this.spanY[1] - this.spanY[0];

    console.log("Real ratio: " + lenY / lenX);

    let powX = lessOrEqualPowerOf2(lenX);
    let powY = lessOrEqualPowerOf2(lenY);

    // Get the surrounding powers of 2
    let bottomX =  Math.pow(2, powX);
    let topX = Math.pow(2, powX + 1);
    
    let bottomY = Math.pow(2, powY);
    let topY = Math.pow(2, powY + 1);

/*
    let bottomX = lessOrEqualPowerOf2(lenX);
    let topX = bottomX == 0 ? 1 : bottomX << 1;
    
    let bottomY = lessOrEqualPowerOf2(lenY);
    let topY = bottomY == 0 ? 1 : bottomY << 1;

*/

    console.log("Powers", bottomX, topX, bottomY, topY)

    // Map it [4,2]
    const mapX = (lenX - bottomX) / (topX - bottomX) * 2 + 2;
    const mapY = (lenY - bottomY) / (topY - bottomY) * 2 + 2;

    // Compute ratio
    this.squareRatio = mapY / mapX;

    console.log("Ratio: " + this.squareRatio)

    this.zoom = 3.0;
    this.update_squareSize();

    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.zoom);
    this.gl.uniform1f(this.gridRatioLocation, this.squareRatio);

    this.gl.useProgram(this.programGridTransformed);
    this.gl.uniform1f(this.gl.getUniformLocation(this.programGridTransformed, "u_zoom"), this.zoom);
    this.gl.uniform1f(this.gl.getUniformLocation(this.programGridTransformed, "u_gridRatio"), this.squareRatio);

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

    this.update_viewport([limits.Left, limits.Right], [limits.Bottom, limits.Top])


  }



  draw()
  {
    const gl = this.gl;

    // Draw to the first canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    gl.uniform4f(this.spanLocation,...this.spanX, ...this.spanY);
    
    // X
    gl.uniform2f(this.lineSpawnDirectionLocation, 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);
    
    // Y
    gl.uniform2f(this.lineSpawnDirectionLocation, 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);

    this.curves.draw(this.spanX, this.spanY);



    
    // Draw to the texture
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.programGridTransformed);
    gl.uniform4f(gl.getUniformLocation(this.programGridTransformed, "u_spanXY"),...this.spanX, ...this.spanY);
    gl.uniform4f(gl.getUniformLocation(this.programGridTransformed, "u_transformedSpanXY"),...this.spanTransformed);
    

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.secondBuffer.ID);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(gl.getUniformLocation(this.programGridTransformed, "u_lineSpawnDirection"), 0, 1);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);
    gl.uniform2f(gl.getUniformLocation(this.programGridTransformed, "u_lineSpawnDirection"), 1, 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, n_p + 2, n_instances);

    this.curves.draw_transformed(this.spanX, this.spanY, this.spanTransformed);


    //Pass the texture to the second canvas
    gl.readPixels(0,0,gl.canvas.width, gl.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,this.pixelContainer); // From current framebuffer
    const imageData = new ImageData(this.pixelContainer, gl.canvas.width, gl.canvas.height);
    this.ctx.putImageData(imageData, 0, 0);


    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}