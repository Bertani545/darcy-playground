#version 300 es
 
precision highp float;

in float invisible;
in vec2 vTexCoord;

out vec4 outColor;


uniform sampler2D u_Texture;

void main() {
    outColor =  texture(u_Texture, vTexCoord);
    if(invisible > 0.5 || outColor.a < 0.5) discard;
    
    //outColor = vec4(1.0, 1.0, 0.0, 1.0);
}