#version 300 es
 
//layout(location = 0) in vec2 a_position;

uniform int u_nPoints;
uniform vec4 u_spanXY; // (minX, maxX, minY, maxY)
uniform vec2 u_screenSize;

uniform sampler2D u_pointData;

void main() {

  vec4 data = texelFetch(u_pointData, ivec2(gl_VertexID, gl_InstanceID), 0);

  vec2 coords = data.xy;

  gl_Position.zw = vec2(.0, 1.0);
  // Transform them into the span
  gl_Position.x = 2.0 * (coords.x - u_spanXY[0]) / (u_spanXY[1]-u_spanXY[0]) - 1.0;
  gl_Position.y = 2.0 * (coords.y - u_spanXY[2]) / (u_spanXY[3]-u_spanXY[2]) - 1.0;
}