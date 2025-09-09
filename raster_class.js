import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor, loadShaderFile, createShader_fromSourceCode } from './webgl-utils.js'
import * as gl_2dmath from "./gl_2Dmath.js"
import {Vector2D} from "./gl_2Dmath.js"
import { read_svg_file } from './svg_reader.js';
import {BezierCurve, point_in_bezier_time } from './bezier_functions.js';


export class RasterContainer
{
    constructor(gl)
  {
    this.gl = gl;
    this.originalOffset = [0,0];
    this.extraOffset = [0,0];
    this.currentZoom = 1;
    this.correctionOffset = [0 , 0];
    this.rotation = [1, 0, 0, 0, 1, 0, 0 ,0 ,1]
    this.originalScale = [1,1]
    this.shouldDraw = false; // To avoid drawing new pictures without cleaning the shader parameters for the last one
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

    const vertices = new Float32Array([
      // x,    y,     s,   t
      -0.5, -0.5,   0.0, 0.0, // bottom-left
       0.5, -0.5,   1.0, 0.0, // bottom-right
       0.5,  0.5,   1.0, 1.0, // top-right
      -0.5,  0.5,   0.0, 1.0  // top-left
    ]);
    const indices = new Uint16Array([
      0, 1, 2,  // first triangle
      0, 2, 3   // second triangle
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    
    // ------ Atribute stuff -------
    gl.enableVertexAttribArray(0);

    // Enable position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(
      0,              // index = location in shader
      2,              // size (x, y)
      gl.FLOAT,       // type
      false,          // normalize
      4 * 4,          // stride (4 floats per vertex = 16 bytes)
      0               // offset (start at position data)
    );

    // Enable texcoord attribute
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(
      1,              // index
      2,              // size (s, t)
      gl.FLOAT,
      false,
      4 * 4,          // stride
      2 * 4           // offset (skip first 2 floats)
    );

    gl.bindVertexArray(null);

    // ------------------ Shader construction -------------
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/rasterDisplay.vs");
    this.fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/rasterDisplay.fs");
    const program = await createProgram(gl, vertexShader, this.fragmentShader);



    // Assign the created VAO and Shader to the instance
    this.VAO = vao;
    this.Shader = program;
    this.vertexShaderTransformed_source = await loadShaderFile("./shaders/rasterDisplay_transformed.vs")
    this.transformedShader = null;

    //Save shader properties
    this.spanLocation = gl.getUniformLocation(program, "u_spanXY");
    this.zoomLocation = gl.getUniformLocation(program, "u_zoom");
    this.transLocation = gl.getUniformLocation(program, "u_trans");
    this.rotationLocation = gl.getUniformLocation(program, "u_rotation");
    this.textureLocation = gl.getUniformLocation(program, "u_Texture");

    this.gl.useProgram(this.Shader);
    gl.uniform1i(this.textureLocation, 1);
    gl.uniform1f(this.zoomLocation, 1.0);



    this.nPaths = 0;
    this.nPoints = 0;
  }

  
  async update_transformed_shader(new_function)
  {
    const gl = this.gl;
    const vertexShader = await createShader_fromSourceCode(gl, gl.VERTEX_SHADER, this.vertexShaderTransformed_source .replace("REPLACE", new_function) );
    this.transformedShader = await createProgram(gl, vertexShader, this.fragmentShader);


    gl.useProgram(this.transformedShader);
    gl.uniform1i(gl.getUniformLocation(this.transformedShader, "u_Texture"), 1);
    const effectiveTranslation = [this.extraOffset[0] + this.originalOffset[0], this.extraOffset[1] + this.originalOffset[1]]
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), ...effectiveTranslation);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.transformedShader, 'u_rotation'), false, this.rotation);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_correctionTrans') , ...this.correctionOffset); 
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_scale') , ...this.originalScale);
  }




  save_Image_data(imgFile) {
    
    this.shouldDraw = false;
    // Set data
    const dataTexture = this.gl.createTexture();
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.activeTexture(this.gl.TEXTURE0 + 1),
    this.gl.bindTexture(this.gl.TEXTURE_2D, dataTexture),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST),
    this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,                // level
        this.gl.RGBA,          // internal format
        this.gl.RGBA,          // format
        this.gl.UNSIGNED_BYTE, // type
        imgFile
      );


    this.create_grid(Math.min(512, imgFile.width), Math.min(512, imgFile.height));

    this.originalData = {
      'scale': [imgFile.width, imgFile.height],
      'position': [0, 0],
    }
    return this.originalData;
  }

  create_grid(w, h){
    const gl = this.gl;

    const vertices  = []
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        // Coords
        const px = x / w - 0.5;
        const py = y / h - 0.5;

        // Tex coords
        const u = x / w;
        const v = y / h;

        vertices.push(px, py, u, v);
      }
    }
    const vertexData = new Float32Array(vertices);

    const indices = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i0 = y * (w + 1) + x;
        const i1 = i0 + 1;
        const i2 = i0 + (w + 1);
        const i3 = i2 + 1;

        indices.push(i0, i1, i2); // first triangle
        indices.push(i1, i3, i2); // second triangle
      }
    }

    const indexData = new Uint32Array(indices);
    this.indexCount = indexData.length;

    this.gridVAO = gl.createVertexArray();
    gl.bindVertexArray(this.gridVAO);

    // VBO
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // layout(location=0) in vec2 aPosition;
    // layout(location=1) in vec2 aTexCoord;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    // EBO
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  delete_temp_info()
  {
    // Call this to delete the object with the points
    this.originalTexData = null;
    this.nPoints = 0;
  }

  clean() {
    this.originalTexData = null;
    this.nPoints = 0;
    this.originalOffset = [0,0];
    this.extraOffset = [0,0];
    this.currentZoom = 1;
    this.correctionOffset = [0 , 0];
    this.rotation = [1, 0, 0, 0, 1, 0, 0 ,0 ,1]
    this.originalData = {}
    this.indexCount = 0;
  }


  // Returns a texture and how many paths using the object with points
  update_Image(newData) 
  {

    // Build the transformation matrix
    const scaleX =  newData.scale[0];
    const scaleY =  newData.scale[1];
    this.originalScale = [scaleX, scaleY];
    //const scaleMatrix = gl_2dmath.get_scale_matrix(scaleX, scaleY);
    //const transMatrix = gl_2dmath.get_translation_matrix(newData.position[0], newData.position[1]);
    this.originalOffset = newData.position;
    const angle = newData.rotation / 180.0 * Math.PI;
    const rotMatrix = gl_2dmath.get_rotation_matrix(angle);
    this.rotation = rotMatrix;

    // Order of application
    //const transformMatrix = gl_2dmath.multiply_MM(transMatrix, gl_2dmath.multiply_MM(scaleMatrix, rotMatrix));
    //const transformMatrix = scaleMatrix;//gl_2dmath.multiply_MM(rotMatrix, scaleMatrix); //



      // Normal picture

      this.originalData // The original position for pictures is 0 this.originalData.position = [0,0]
      let left =  - scaleX / 2;
      let right =scaleX / 2;
      let top =  + scaleY / 2;
      let bottom = - scaleY / 2

      const corners = [
        [left, top],
        [left, bottom],
        [right, top],
        [right, bottom]
       ]


      left = Infinity;
      right = -Infinity;
      top = -Infinity;
      bottom = Infinity;
      function update_bouding_box(point)
      {
        if(point[0] < left) left = point[0];
        if(point[0] > right) right = point[0];
        if(point[1] < bottom) bottom = point[1];
        if(point[1] > top) top = point[1];
      }

      for (let p of corners) {
        // Apply the transformation
        let point = [...p, 1]; // already centered around 0
        update_bouding_box(gl_2dmath.multiply_MV(this.rotation, point));
      }

      // Set data

      this.correctionOffset = [
        (left + right) / 2,
        (top + bottom) / 2
      ]

      this.boundingBox = {Top: top, Bottom: bottom, Left: left, Right: right};

      const newBox = {Top: top + this.originalOffset[1] - this.correctionOffset[1],
            Bottom: bottom + this.originalOffset[1] - this.correctionOffset[1],
            Left: left + this.originalOffset[0] - this.correctionOffset[0], 
            Right:right + this.originalOffset[0] - this.correctionOffset[0]}


    // Set shaders
    this.currentZoom = 1;
    this.extraOffset = [0,0];
    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.transLocation, ...this.originalOffset);
    this.gl.uniform1f(this.zoomLocation, this.currentZoom);
    this.gl.uniformMatrix3fv(this.rotationLocation, false, this.rotation)
    this.gl.uniform2f(this.gl.getUniformLocation(this.Shader, 'u_correctionTrans') , ...this.correctionOffset); 
    this.gl.uniform2f(this.gl.getUniformLocation(this.Shader, 'u_scale') , ...this.originalScale); 

    this.gl.useProgram(this.transformedShader);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), ...this.originalOffset);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.transformedShader, 'u_rotation'), false, this.rotation)
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_correctionTrans') , ...this.correctionOffset);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_scale') , ...this.originalScale);  

    this.shouldDraw = true;
    return newBox;
  }

  update_translation(dx, dy) {
    this.extraOffset[0] += dx;
    this.extraOffset[1] += dy;
    //this.extraOffset = new_translation;
    const effectiveTranslation = [this.extraOffset[0] + this.originalOffset[0], this.extraOffset[1] + this.originalOffset[1]]
    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.transLocation, ...effectiveTranslation);
    this.gl.useProgram(this.transformedShader);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), ...effectiveTranslation);

  }

  update_zoom(zoomFactor) {
    this.currentZoom *= zoomFactor;
    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.currentZoom);
    this.gl.useProgram(this.transformedShader);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
  }

  lockPath(x, y, zoom) {
    this.extraOffset = [x - this.originalOffset[0], y - this.originalOffset[1]];
    this.currentZoom = zoom;
    this.gl.useProgram(this.Shader);
    this.gl.uniform2f(this.transLocation, x, y);
    this.gl.uniform1f(this.zoomLocation, this.currentZoom);
    this.gl.useProgram(this.transformedShader);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), x, y);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);

  }

  // Assumes that its locked
  fit_Image(spanX, spanY) {
    
    if (!this.originalData) return 1;

    const sizeX = this.boundingBox.Right - this.boundingBox.Left;
    const sizeY = this.boundingBox.Top - this.boundingBox.Bottom;
    const ratio = sizeX / sizeY;
    const screenX = spanX[1] - spanX[0];
    const screenY = spanY[1] - spanY[0];
    const screenRatio = screenX / screenY;


    if (screenRatio >= 1) { // Wider
      if (screenRatio <= ratio) {
        this.currentZoom =  screenX / sizeX;
      } else {
        this.currentZoom =  screenY / sizeY;
      }
      
      
    } else { // Longer
      if (screenRatio >= ratio) {
        this.currentZoom =  screenY / sizeY;
      } else {
        this.currentZoom =  screenX / sizeX;
      }
      
    }
    

    this.gl.useProgram(this.Shader);
    this.gl.uniform1f(this.zoomLocation, this.currentZoom);
    this.gl.useProgram(this.transformedShader);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);

    return this.currentZoom;
  }


  getImageMods() {
    return {
      'center': [this.extraOffset[0] + this.originalOffset[0], this.extraOffset[1] + this.originalOffset[1]],
      'zoom': this.currentZoom
    }
  }

  draw(spanX, spanY)
  {
    if(!this.shouldDraw) return;
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    gl.uniform4f(this.spanLocation, ...spanX, ...spanY);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  draw_transformed(spanX, spanY, spanXY)
  {
    if(!this.shouldDraw) return;
    const gl = this.gl;
    
    gl.bindVertexArray(this.gridVAO);
    gl.useProgram(this.transformedShader);
    gl.uniform4f(gl.getUniformLocation(this.transformedShader, "u_spanXY"),...spanX, ...spanY);
    gl.uniform4f(gl.getUniformLocation(this.transformedShader, "u_transformedSpanXY"),...spanXY);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
  }

}