#version 300 es
 
precision highp float;

in float invisible;

out vec4 outColor;


uniform sampler2D u_Texture;

void main() {
    if(invisible > 0.5) discard;
    outColor = vec4(1.0);
}