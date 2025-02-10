#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;

uniform float u_aspect;
uniform float u_zoom;
uniform vec2 u_lineSpawnDirection;


// Yet to be used
uniform vec2 u_centerCoords;
uniform vec4 u_spanXY;


out vec4 line_color;

#define PI 3.1415926535898
#define TAU 6.283185307179586

vec4 domain_color(vec2 coord) {
    //hsv-rgb code taken from https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
    float hue = atan(coord.y, coord.x);
    hue /= TAU;
    if (hue < 0.0) hue += 1.0;
    float mag = 1.0;//3.0 / (3.0 + length(coord));
    vec3 c = vec3(hue, 1, 1);
    vec4 K = vec4(1.0, 0.66666666, 0.33333333, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return vec4(mag * c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y), 1);
  }



void main() {

  float line_total = 25.;


  float dist = 2.0 / line_total;


  vec2 offset = u_lineSpawnDirection * vec2(float(gl_InstanceID) * dist);
  offset.x /= u_aspect;

  vec2 pos = vec2(a_position.x /  u_aspect, a_position.y ) + offset;

  float colorDist = 1./line_total;
  line_color = domain_color(pos);


  //pos.x = pos.x + 0.5 * pos.y;
  //pos.y = 1.4 * pos.y;



  pos *= u_zoom;

  gl_Position = vec4(pos, 0.0, 1.0) ;




  //gl_Position = vec4(a_position + offset, 0.0, 1.0);
}