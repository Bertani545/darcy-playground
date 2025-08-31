#version 300 es
 

uniform vec4 u_spanXY; // (minX, maxX, minY, maxY)
uniform vec2 u_trans;
uniform float u_zoom;

uniform sampler2D u_pointData;

out float invisible;

void main() {
  invisible = 0.0;
  vec4 data = texelFetch(u_pointData, ivec2(gl_VertexID, gl_InstanceID), 0);

  vec2 coords = data.xy;
  coords *= u_zoom;
  coords += u_trans;

  gl_Position.zw = vec2(.0, 1.0);
  // Transform them into [-1, 1]
  gl_Position.x = 2.0 * (coords.x - u_spanXY[0]) / (u_spanXY[1]-u_spanXY[0]) - 1.0;
  gl_Position.y = 2.0 * (coords.y - u_spanXY[2]) / (u_spanXY[3]-u_spanXY[2]) - 1.0;
}
