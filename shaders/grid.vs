#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;

uniform float u_aspectScreen;
uniform float u_zoom;
uniform vec2 u_lineSpawnDirection;
uniform float u_gridRatio;
uniform vec2 u_offset;
uniform vec4 u_spanXY;



out vec4 line_color;

#define PI 3.1415926535898
#define TAU 6.283185307179586

#define TOTAL_LINES 50.0

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
  vec2 distortionX = vec2(u_aspectScreen * u_gridRatio, 1.0);

  float dist = 6.0 / TOTAL_LINES;

  vec2 current_position = a_position * 6.;

  // Scale it
  //current_position *= 2.0 * u_zoom;


  // Position the segments to create the line
  vec2 distanceFromOrigin = u_lineSpawnDirection * vec2(float(gl_InstanceID) * dist) * distortionX;
  current_position += distanceFromOrigin;



  // Position the line in the correct position
  vec2 startingPoint = -vec2((TOTAL_LINES) * dist) / 2.0 * distortionX;
  current_position += startingPoint;


  current_position *= u_zoom;

      // Ofset caused by the mouse
  current_position += u_offset;

  


  // Map the coordinates to span and color them acordingly
  // [-1,1] -> [span[0], span[1]]
  vec2 real_position = current_position;
  real_position.x = ((current_position.x + 1.0) / 2.0) * (u_spanXY[1]-u_spanXY[0]) + u_spanXY[0];
  real_position.y = ((current_position.y + 1.0) / 2.0) * (u_spanXY[3]-u_spanXY[2]) + u_spanXY[2];  
  line_color = domain_color(real_position);

  //if(gl_InstanceID == 25) line_color = vec4(1.0);
  
/*
  real_position.x *= real_position.x;
  real_position.y *= 1.0;
  //current_position.x = current_position.x + 0.5 * current_position.y;
  //current_position.y = 1.4 * current_position.y;

  // Re map real_position to screen space [span[0], span[1]] -> [-1, 1]
  float l = u_spanXY[0] < 0.0 &&  u_spanXY[1] > 0.0 ? 0.0 : min(u_spanXY[0] * u_spanXY[0], u_spanXY[1] * u_spanXY[1]); // <--- si funciona T__T
  float r = max(u_spanXY[0] * u_spanXY[0], u_spanXY[1] * u_spanXY[1]);
  float t = u_spanXY[2];
  float b = u_spanXY[3];

  current_position.x = ((real_position.x - l)/(r - l)) * 2. - 1.;
  current_position.y = ((real_position.y - t)/(b - t)) * 2. - 1.;
*/
  gl_Position = vec4(current_position, 0.0, 1.0) ;
}