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
