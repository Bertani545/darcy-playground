#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform float[8] u_bezierPoints;
uniform vec4 u_spanXY;
uniform vec2 u_screenSize;

// we need to declare an output for the fragment shader
out vec4 outColor;


vec2 f(vec2 p)
{
  return vec2(p.x*p.x, p.y);
}

float min_distance(vec2 p)
{
  float res = 2.0;
  for(float i = 0.; i <= 6.28; i+= 0.01)
  {
    vec2 curr_p = vec2(cos(i), sin(i));
    float dist = length(curr_p - p);
    res = min(res, dist);
  }
  return res;
}



void main() {

    vec2 p =  gl_FragCoord.xy /u_screenSize;  // [0,1] x [0,1]

    vec2 realPos;

    realPos.x = p.x * (u_spanXY[1] - u_spanXY[0]) + u_spanXY[0];
    realPos.y = p.y * (u_spanXY[3] - u_spanXY[2]) + u_spanXY[2];

    float aspect = (u_spanXY[3] - u_spanXY[2]) / (u_spanXY[1] - u_spanXY[0]);

    if(min_distance(realPos) < 0.08 * aspect)
    {
        outColor = vec4(1.0);
    }
    else
    {
        discard;
    }
}