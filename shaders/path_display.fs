#version 300 es
 
precision highp float;

in float invisible;

out vec4 outColor;
void main() {
    outColor = vec4(vec3(1.-invisible), 1.0);
}