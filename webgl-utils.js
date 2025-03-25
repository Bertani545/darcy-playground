// Function to load the shader file
export async function loadShaderFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load shader file: ' + url);
  }
  return await response.text(); // Return shader code as a string
}

// Load shader and create the shader module
export async function createShader(gl, type, source) {
  var source_code = await loadShaderFile(source)

  var shader = gl.createShader(type);
  gl.shaderSource(shader, source_code);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return await shader;
  }
     
  throw ("could not compile shader:" + gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return undefined;
}


export async function createShader_fromSourceCode(gl, type, source_code) {

  var shader = gl.createShader(type);
  gl.shaderSource(shader, source_code);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return await shader;
  }
     
  throw ("could not compile shader:" + gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return undefined;
}

export async function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return await program;
  }
     
  throw ("program failed to link:" + gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return undefined;
}


export function resizeCanvasToDisplaySize(canvas, multiplier) {
    multiplier = multiplier || 1;
    const width  = canvas.clientWidth  * multiplier | 0;
    const height = canvas.clientHeight * multiplier | 0;
    if (canvas.width !== width ||  canvas.height !== height) {
      canvas.width  = width;
      canvas.height = height;
      return true;
    }
    return false;
}

export function createAndSetupTexture(gl, i, data)
{
  //------- Texture stuff ------
  // Create a texture.
  var texture = gl.createTexture();
  
  // make unit i the active texture unit
  gl.activeTexture(gl.TEXTURE0 + i);
  
  // Bind texture to 'texture unit i' 2D bind point
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we don't need mips and so we're not filtering
  // and we don't repeat
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


  return texture;
}


export function buildFrameBuffer_ColorOnly(gl, i, width, height)
{
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  // Tell WebGL how to convert from clip space to pixels
  //gl.viewport(0, 0, width, height);

  var texture = createAndSetupTexture(gl, i);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  // Bind the texture as where color is going to be written
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  //console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE)
  //Unbind
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {ID: fbo,
          ColorTexture: texture}
}


export function buildFrameBuffer_computeShader(gl, i, width, height)
{
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  // Tell WebGL how to convert from clip space to pixels
  //gl.viewport(0, 0, width, height);

  var texture = createAndSetupTexture(gl, i);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);

  // Bind the texture as where color is going to be written
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  //console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE)
  //Unbind
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {ID: fbo,
          ColorTexture: texture}
}


export function getIdColor(id) {
  const R = (id & 0xFF0000) >> 16 / 255; // Red
  const G = (id & 0x00FF00) >> 8 / 255;  // Green
  const B = (id & 0x0000FF) / 255;       // Blue
  return  {r:R, g:G, b:B};
}


export function getIdFromColor(pixelData) {
  const r = pixelData[0];
  const g = pixelData[1];
  const b = pixelData[2];

  // Reverse the ID encoding
  const id = (r << 16) | (g << 8) | b;
  return id;
}