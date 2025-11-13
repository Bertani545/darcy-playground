#version 300 es
 

uniform vec4 u_spanXY; // (minX, maxX, minY, maxY)
uniform vec4 u_transformedSpanXY;
uniform vec2 u_trans;
uniform mat3 u_rotation;
uniform vec2 u_correctionTrans;
uniform float u_zoom;
uniform vec2 u_scale;

uniform sampler2D u_pointData;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

out float invisible;
out vec2 vTexCoord;

REPLACE

void main() {

  vec2 data = aPosition;
  data *= u_scale;
  data *= u_zoom;
  data = vec2(u_rotation * vec3(data, 1.0));
  data += u_trans - u_zoom * u_correctionTrans;

    bool change = false;
    if(data.x < u_spanXY[0]) change = true;//data.x = u_spanXY[0];
    if(data.x > u_spanXY[1]) change = true;//data.x = u_spanXY[1];
    if(data.y < u_spanXY[2]) change = true;//data.y = u_spanXY[2];
    if(data.y > u_spanXY[3]) change = true;//data.y = u_spanXY[3];

    if(change) invisible = 1.0;

  
  vec2 coords = f(data);


  gl_Position.zw = vec2(.0, 1.0);
  // Transform them into [-1, 1]
  gl_Position.x = 2.0 * (coords.x - u_transformedSpanXY[0]) / (u_transformedSpanXY[1]-u_transformedSpanXY[0]) - 1.0;
  gl_Position.y = 2.0 * (coords.y - u_transformedSpanXY[2]) / (u_transformedSpanXY[3]-u_transformedSpanXY[2]) - 1.0;

    //gl_Position.x = 2.0 * (coords.x - u_spanXY[0]) / (u_spanXY[1]-u_spanXY[0]) - 1.0;
    //gl_Position.y = 2.0 * (coords.y - u_spanXY[2]) / (u_spanXY[3]-u_spanXY[2]) - 1.0;

    // Calculate
    vTexCoord = aTexCoord;

}
