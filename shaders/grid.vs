#version 300 es
precision highp float;
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;

uniform float u_aspectScreen;
uniform float u_zoom;
uniform vec2 u_lineSpawnDirection;
uniform float u_gridRatio;
uniform vec2 u_offset;



out vec4 line_color;
out float invisible;

#define PI 3.1415926535898
#define TAU 6.283185307179586

#define TOTAL_LINES 20.0
#define TOTAL_POINTS 500.0;


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
  invisible = 0.0;
  vec2 distortionX = vec2(u_aspectScreen * u_gridRatio, 1.0);

  float dist_between_lines = 2.5 / TOTAL_LINES;
  float dist_between_points = 2.5 / TOTAL_POINTS;
  vec2 elongate_dir = vec2(u_lineSpawnDirection.y, u_lineSpawnDirection.x);
  vec2 current_position = vec2(gl_VertexID) * dist_between_points * elongate_dir;

  // Scale it
  //current_position *= 2.0 * u_zoom;


  // Position the segments to create the line
  vec2 distanceFromOrigin = u_lineSpawnDirection * vec2(float(gl_InstanceID) * dist_between_lines) * distortionX;
  current_position += distanceFromOrigin;



  // Position the line in the correct position
  vec2 startingPoint = -vec2((TOTAL_LINES) * dist_between_lines) / 2.0 * distortionX;
  current_position += startingPoint;


  current_position *= u_zoom;

      // Ofset caused by the mouse
  current_position += u_offset;

  
  line_color = domain_color(current_position);

  invisible = 0.0;
  if(abs(current_position.x) >  1. || abs(current_position.y) > 1.) invisible = 1.0;


  if(current_position.x < -1.0) line_color = vec4(1.0);

  gl_Position = vec4(current_position, 0.0, 1.0) ;
}