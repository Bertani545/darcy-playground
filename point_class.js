import { createShader, createProgram, resizeCanvasToDisplaySize, getIdColor } from './webgl-utils.js'
import * as gl_2Dmath from "./gl_2Dmath.js"


export class Point
{
  constructor(id, trans, scale, theta, color){

    this.color = {r:color[0], g:color[1], b:color[2], a:color[3]}
    this.ID = id;

    this.Translation = gl_2Dmath.get_translation_matrix(trans[0], trans[1]);
    this.Rotation = gl_2Dmath.get_rotation_matrix(theta);
    this.Scale = gl_2Dmath.get_scale_matrix(scale[0], scale[1]);
  }

  get translation(){ return this.Translation;}
  get scale(){ return this.Scale;}
  get rotation(){ return this.Rotation;}

  update_rotation_matrix(theta){this.Rotation = gl_2Dmath.get_rotation_matrix(theta);}
  update_translation_matrix(trans){this.Translation = gl_2Dmath.get_translation_matrix(trans[0], trans[1]);}
}


export class RenderPoints //A square :b
{
  constructor()
  {
      this.VAO = null;
      this.Shader = null;
      this.colorLocation = null;
      this.rotationLocation = null;
      this.translationLocation = null;
      this.scaleLocation = null;

      
      //Pick stuff
      this.pickLocation = null;
      this.pickSacleLocation = null;
      this.pickTransLocation = null;

  }

  static async build(gl)
  {
     const instance = new RenderPoints();

      // ---------------- VAO construction. First so it links the other vbuffers automatically
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao); // Make it current

      // Screen info
    const vertices = [
      // XY
      -1, -1,
      -1,  1,
       1, -1,
       1,  1,
    ];

      const indices = [
        0, 1, 2,
        1, 2, 3,
      ]

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


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
      const vertexShader = await createShader(gl, gl.VERTEX_SHADER, "./shaders/square.vs");
      const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, "./shaders/square.fs");
      const program = await createProgram(gl, vertexShader, fragmentShader);



      // Assign the created VAO and Shader to the instance
      instance.VAO = vao;
      instance.Shader = program;

      //Save shader properties
      gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
      instance.colorLocation = gl.getUniformLocation(program, "u_color");
      instance.rotationLocation = gl.getUniformLocation(program, "u_rot");
      instance.translationLocation = gl.getUniformLocation(program, "u_trans");
      instance.scaleLocation = gl.getUniformLocation(program, "u_scale");
      instance.aspectLocation = gl.getUniformLocation(program, "u_aspect");

      // Pick stuff
      instance.pickLocation = gl.getUniformLocation(program, "u_pick");
      instance.pickScaleLocation = gl.getUniformLocation(program, "u_pick_scale");
      instance.pickTransLocation = gl.getUniformLocation(program, "u_pick_trans");


      // Return the instance
      return instance;
  }


  normal_draw(gl, point)
  {
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);

    gl.uniform4f(this.colorLocation, point.color.r, point.color.g, point.color.b, point.color.a);
    gl.uniform1f(this.pickLocation, 0.0);
    gl.uniformMatrix3fv(this.rotationLocation, false, point.rotation);
    gl.uniformMatrix3fv(this.translationLocation, false, point.translation);
    gl.uniformMatrix3fv(this.scaleLocation, false, point.scale);

    gl.uniform1f(this.aspectLocation, gl.canvas.width / gl.canvas.height)

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  pick_draw(gl, point, pw, ph, ndcX, ndcY)
  {
    gl.bindVertexArray(this.VAO);
    gl.useProgram(this.Shader);
    var color =  getIdColor(point.ID);
    
    gl.uniformMatrix3fv(this.rotationLocation, false, point.rotation);
    gl.uniformMatrix3fv(this.translationLocation, false, point.translation);
    gl.uniformMatrix3fv(this.scaleLocation, false, point.scale);

    gl.uniform1f(this.aspectLocation, gl.canvas.width / gl.canvas.height)

    gl.uniform4f(this.colorLocation, color.r, color.g, color.b, 1.0);
    gl.uniform1f(this.pickLocation, 1.0);
    gl.uniformMatrix3fv(this.pickScaleLocation, false, new Float32Array([1./pw,0,0,  0, 1./ph, 0,  0,0,1]));
    gl.uniformMatrix3fv(this.pickTransLocation, false, new Float32Array([1,0,0,  0,1,0,  -ndcX, -ndcY, 1])); //Va por columnas

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
}