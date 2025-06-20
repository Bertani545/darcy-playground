#version 300 es

precision highp float;
 
uniform int u_currentPower; //p
uniform sampler2D u_pointData; // Asumed to be 2<<(p+1) * 2<<(p+1)

out vec4 outColor;
 
void main() {
    ivec2 fragCoordInt = ivec2(floor(gl_FragCoord.xy));
    int squareSize = 1 << u_currentPower;
    if(fragCoordInt.x >= squareSize || fragCoordInt.y >= squareSize) discard;

    // The pixel P1 holds the minimum and maximum of 3 adyacent pixels and itself
    /*
    P1  P2
    P3  P4
    */
    ivec2 texID = fragCoordInt * 2;
    vec4 p1 = texelFetch(u_pointData, texID, 0);
    vec4 p2 = texelFetch(u_pointData, texID + ivec2(1, 0), 0);
    vec4 p3 = texelFetch(u_pointData, texID + ivec2(0, 1), 0);
    vec4 p4 = texelFetch(u_pointData, texID + ivec2(1, 1), 0);

    
    float left =   min(min(min(p1.x, p2.x), p3.x), p4.x);
    float right =  max(max(max(p1.y, p2.y), p3.y), p4.y);
    float bottom = min(min(min(p1.z, p2.z), p3.z), p4.z);
    float top =    max(max(max(p1.w, p2.w), p3.w), p4.w);
    

    outColor = vec4(left, right, bottom, top);
}