#version 300 es

precision highp float;

uniform vec2 u_spanX;
uniform vec2 u_spanY;
uniform float u_sizeSquare;

out vec4 outValue;

REPLACE


void main()
{
    vec2 fragCoord = floor(gl_FragCoord.xy);
    // Obtain grid
    vec2 step = fragCoord / (u_sizeSquare-1.);
    vec2 position;

    position.x = (u_spanX[1] - u_spanX[0]) * step.x + u_spanX[0];
    position.y = (u_spanY[1] - u_spanY[0]) * step.y + u_spanY[0];

    vec2 finalVal = f(position);

    outValue = vec4(finalVal.x, finalVal.x, finalVal.y, finalVal.y);
}

