#version 300 es
 

uniform vec4 u_spanXY; // (minX, maxX, minY, maxY)
uniform vec2 u_trans;
uniform mat3 u_rotation;
uniform vec2 u_correctionTrans;
uniform float u_zoom;
uniform vec2 u_scale;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

out float invisible;
out vec2 vTexCoord;

void main() {
  invisible = 0.0;

  vec2 coords = aPosition;
  coords *= u_scale;
  coords *= u_zoom;
  coords = vec2(u_rotation * vec3(coords, 1.0));
  
  //coords += u_zoom * vec2(u_rotation * vec3(u_correctionTrans, 1.0));
  coords += u_trans - u_zoom * u_correctionTrans;

  gl_Position.zw = vec2(.0, 1.0);
  // Transform them into [-1, 1]
  gl_Position.x = 2.0 * (coords.x - u_spanXY[0]) / (u_spanXY[1]-u_spanXY[0]) - 1.0;
  gl_Position.y = 2.0 * (coords.y - u_spanXY[2]) / (u_spanXY[3]-u_spanXY[2]) - 1.0;


  vTexCoord = aTexCoord;
}
