#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform vec4 u_color;

in vec4 line_color;
in float invisible;

// we need to declare an output for the fragment shader
out vec4 outColor;
 
void main() {
  // Just set the output to a constant reddish-purple
  vec3 real_color = line_color.xyz * (1.0 - invisible);
  outColor = vec4(real_color, 1.0);
}