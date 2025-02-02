#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;

uniform float u_aspect;
uniform float u_zoom;
uniform vec2 u_xy;

// all shaders have a main function
void main() {

  float dist = 2.0 / 50.;

  vec2 offset = u_xy * vec2(float(gl_InstanceID) * dist);
  offset.x /= u_aspect;

  vec2 pos = vec2(a_position.x /  u_aspect, a_position.y ) + offset;

  //pos.x = pos.x * pos.y;
  //pos.y = pos.y;

  gl_Position = vec4(pos, 0.0, 1.0);

  //gl_Position = vec4(a_position + offset, 0.0, 1.0);
}