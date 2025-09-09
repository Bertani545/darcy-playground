import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor, loadShaderFile, createShader_fromSourceCode } from './webgl-utils.js'
import * as gl_2dmath from "./gl_2Dmath.js"
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
    this.originalOffset = [0,0];
    this.extraOffset = [0,0];
    this.currentZoom = 1;
    this.correctionOffset = [0 , 0];
    this.rotation = [1, 0, 0, 0, 1, 0, 0 ,0 ,1]
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
    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/path_display.vs");
    this.fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/path_display.fs");
    const program = await createProgram(gl, vertexShader, this.fragmentShader);



    // Assign the created VAO and Shader to the instance
    this.VAO = vao;
    this.Shader = program;
    this.vertexShaderTransformed_source = await loadShaderFile("./shaders/path_display_transformed.vs")
    this.transformedShader = null;

    //Save shader properties
    this.spanLocation = gl.getUniformLocation(program, "u_spanXY");
    this.pointDataLocation = gl.getUniformLocation(program, "u_pointData");
    //this.screenSizeLocation = gl.getUniformLocation(program, "u_screenSize");
    //this.pointsTotalLocation = gl.getUniformLocation(program, "u_nPoints");
    this.zoomLocation = gl.getUniformLocation(program, "u_zoom");
    this.transLocation = gl.getUniformLocation(program, "u_trans");
    this.rotationLocation = gl.getUniformLocation(program, "u_rotation");

    this.gl.useProgram(this.Shader);
    gl.uniform1i(this.pointDataLocation, 1);
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
    gl.uniform1i(gl.getUniformLocation(this.transformedShader, "u_pointData"), 1);
    const effectiveTranslation = [this.extraOffset[0] + this.originalOffset[0], this.extraOffset[1] + this.originalOffset[1]]
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), ...effectiveTranslation);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.transformedShader, 'u_rotation'), false, this.rotation);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_correctionTrans') , ...this.correctionOffset); 
  }


  create_paths(svgFile, pointsPerCurve)
  {

    const dataTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0 + 1),
    this.gl.bindTexture(this.gl.TEXTURE_2D, dataTexture),
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.nPoints, this.nPaths, 0, this.gl.RGBA, this.gl.FLOAT, this.originalTexData);


    // Reads svg and saves the points of the curves in an object
    console.log(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE))
    this.nPoints = pointsPerCurve;
    if(pointsPerCurve > MAX_POINTS)
    {
      //throw new Error("Too many points. Better safe than sorry");
      alert("Too many points. Capping to " + MAX_POINTS);
      this.nPoints = MAX_POINTS;
    }

    const paths = read_svg_file(svgFile);
    //console.log(paths);
    // const path_container = {'line':{},'quadraticBezier':{}, 'cubicBezier':{}};

    const n_paths = Object.keys(paths['lines']).length + Object.keys(paths['quadraticBeziers']).length + Object.keys(paths['cubicBeziers']).length;

    this.nPaths = n_paths;
    if(n_paths > MAX_PATHS)
    {
      alert("Too many paths. Capping to " + MAX_PATHS);
      this.nPaths = MAX_PATHS;
    }
    

    // Create texture for data
    // Height = n_paths
    // Width = n_points 
    
    
    this.originalTexData = new Float32Array(this.nPoints * this.nPaths * 4);
    //new Uint32Array(this._data.buffer,0,this._width * this._height * 4)

    let currPathID = 0;

    // Obtain bouding box
    let left = Infinity
    let right = -Infinity
    let top = -Infinity
    let bottom = Infinity;

    function update_bouding_box(point)
    {
      if(point[0] < left) left = point[0];
      if(point[0] > right) right = point[0];
      if(point[1] < bottom) bottom = point[1];
      if(point[1] > top) top = point[1];
    }

    for(const line of paths['lines'])
    {
      const distX = (line.p2[0] - line.p1[0]) / (this.nPoints - 1);
      const distY = (line.p2[1] - line.p1[1]) / (this.nPoints - 1);
      
      for(let i = 0; i < this.nPoints; i++)
      {
        // Interpolate
        const newX = line.p1[0] + i * distX;
        const newY = line.p1[1] + i * distY;

        update_bouding_box([newX, newY]);
        
        this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 0] = newX;
        this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 1] = newY;

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
        
        update_bouding_box(pointOnCurve);

        this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 0] = pointOnCurve[0];
        this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 1] = pointOnCurve[1];
      }
      currPathID++;
    }
    
    for(const cB of paths['cubicBeziers'])
    {
      bezierContainer.build_curve(cB, 3, this.nPoints);
      for(let i = 0; i < this.nPoints; i++)
        {
          const pointOnCurve = bezierContainer.eval_by_length(i * 1/(this.nPoints-1));
          update_bouding_box(pointOnCurve);
          
          this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 0] = pointOnCurve[0];
          this.originalTexData[4 * this.nPoints * currPathID + i * 4 + 1] = pointOnCurve[1];
        }
        currPathID++;
    }
      

    // Normalize it
    const h = top-bottom;
    const w = right-left;
    const centerX = (right+left)/2
    const centerY = (top+bottom)/2
    this.originalData = {
      'scale': [w, h],
      'position': [centerX, centerY],
    }

    return this.originalData;
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
  }


  // Returns a texture and how many paths using the object with points
  update_Image(newData) 
  {
    // Build the transformation matrix
    const scaleX =  newData.scale[0] / this.originalData.scale[0];
    const scaleY =  newData.scale[1] / this.originalData.scale[1];


    const scaleMatrix = gl_2dmath.get_scale_matrix(scaleX, scaleY);
    //const transMatrix = gl_2dmath.get_translation_matrix(newData.position[0], newData.position[1]);
    this.originalOffset = newData.position;
    const angle = newData.rotation / 180.0 * Math.PI;
    const rotMatrix = gl_2dmath.get_rotation_matrix(angle);
    this.rotation = rotMatrix;

    // Order of application
    //const transformMatrix = gl_2dmath.multiply_MM(transMatrix, gl_2dmath.multiply_MM(scaleMatrix, rotMatrix));
    const transformMatrix = scaleMatrix;//gl_2dmath.multiply_MM(rotMatrix, scaleMatrix); //

    // Obtain new bounding box
    let left = Infinity
    let right = -Infinity
    let top = -Infinity
    let bottom = Infinity;


    function update_bouding_box(point)
    {
      if(point[0] < left) left = point[0];
      if(point[0] > right) right = point[0];
      if(point[1] < bottom) bottom = point[1];
      if(point[1] > top) top = point[1];
    }


    const texData = new Float32Array(this.nPoints * this.nPaths * 4);

    for(let i = 0; i < this.nPoints*this.nPaths*4; i+=4)
    {
      // Apply the transformation
      let point = [this.originalTexData[i], this.originalTexData[i+1], 1];
      point[0] -= this.originalData.position[0];
      point[1] -= this.originalData.position[1];
      point = gl_2dmath.multiply_MV(transformMatrix, point);
      texData[i] = point[0];
      texData[i+1] = point[1];
      update_bouding_box(gl_2dmath.multiply_MV(this.rotation, point));//point);//*
      
    }


    // Set data
    const dataTexture = this.gl.createTexture();
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
    this.gl.activeTexture(this.gl.TEXTURE0 + 1),
    this.gl.bindTexture(this.gl.TEXTURE_2D, dataTexture),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST),
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST),
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.nPoints, this.nPaths, 0, this.gl.RGBA, this.gl.FLOAT, texData);

    // We build the containing box adding rotation
  /*
    const boudingPoints  = [
      [top, left],
      [top, right],
      [bottom, right],
      [bottom, left]
    ]
    for (let p of boudingPoints) {
      p = gl_2dmath.multiply_MV(this.rotation, [...p, 1]);
      update_bouding_box(p)
    }
  */

    this.correctionOffset = [
      (left + right) / 2,
      (top + bottom) / 2
    ]
    this.boundingBox = {
      Top: top, Bottom: bottom, Left: left, Right: right
    }

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
    this.gl.useProgram(this.transformedShader);
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_trans'), ...this.originalOffset);
    this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.transformedShader, 'u_rotation'), false, this.rotation)
    this.gl.uniform2f(this.gl.getUniformLocation(this.transformedShader, 'u_correctionTrans') , ...this.correctionOffset); 


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

  fit_Image(spanX, spanY, isLocked) {
    // We modify current zoom to fit the span
    if (!this.originalData) return 1;

    const sizeX = this.boundingBox.Right - this.boundingBox.Left;
    const sizeY = this.boundingBox.Top - this.boundingBox.Bottom;
    const ratio = sizeX / sizeY;
    const screenX = spanX[1] - spanX[0];
    const screenY = spanY[1] - spanY[0];
    const screenRatio = screenX / screenY;

    const lastZoom = this.currentZoom;

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

    if (!isLocked) {
      this.gl.useProgram(this.Shader);
      this.gl.uniform1f(this.zoomLocation, this.currentZoom);
      this.gl.useProgram(this.transformedShader);
      this.gl.uniform1f(this.gl.getUniformLocation(this.transformedShader, 'u_zoom'), this.currentZoom);
    }
    

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
    const gl = this.gl;

    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    gl.uniform4f(this.spanLocation, ...spanX, ...spanY);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, this.nPoints, this.nPaths);
  }

  draw_transformed(spanX, spanY, spanXY)
  {
    const gl = this.gl;
    
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.transformedShader);
    gl.uniform4f(gl.getUniformLocation(this.transformedShader, "u_spanXY"),...spanX, ...spanY);
    gl.uniform4f(gl.getUniformLocation(this.transformedShader, "u_transformedSpanXY"),...spanXY);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, this.nPoints, this.nPaths);
  }

}