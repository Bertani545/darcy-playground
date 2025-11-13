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
vec2 distortionX = vec2(u_aspectScreen * u_gridRatio, 1.0);

  float dist_between_lines = 3. / TOTAL_LINES;
  float dist_between_points = 3. / TOTAL_POINTS;
  vec2 elongate_dir = vec2(u_lineSpawnDirection.y, u_lineSpawnDirection.x);
  vec2 current_position = vec2(float(gl_VertexID)) * dist_between_points * elongate_dir * distortionX;

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


/*
  // Map the coordinates to span and color them acordingly
  // [-1,1] -> [span[0], span[1]]
  vec2 real_position;
  real_position.x = ((current_position.x + 1.0) / 2.0) * (u_spanXY[1]-u_spanXY[0]) + u_spanXY[0];
  real_position.y = ((current_position.y + 1.0) / 2.0) * (u_spanXY[3]-u_spanXY[2]) + u_spanXY[2];
  

  real_position = f(real_position);
  // Re map real_position to screen space [TransSpan[0], TransSpan[1]] -> [-1, 1]
  
  float l = u_transformedSpanXY[0];
  float r = u_transformedSpanXY[1];
  float b = u_transformedSpanXY[2];
  float t = u_transformedSpanXY[3];
  
  current_position.x = ((real_position.x - l)/(r - l)) * 2. - 1.;
  current_position.y = ((real_position.y - b)/(t - b)) * 2. - 1.;
  

  current_position.y =  -current_position.y;
*/

  gl_Position = vec4(current_position, 0.0, 1.0) ;
}