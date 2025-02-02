#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;

uniform float u_aspect;

// all shaders have a main function
void main() {
  vec2 pos = vec2(a_position.x /  u_aspect, a_position.y );
  gl_Position = vec4(pos, 0.0, 1.0);
  //gl_Position = vec4(pos_clipSpace , 0.0, 1.0);
}