
import * as webgl_utils from './webgl-utils.js'
import { RenderPoints,  Point} from './point_class.js'
import {BezierCurve, RenderCurves, Line} from './line_class.js'
import {Grid} from './grid_class.js'



// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}



  // Fills the buffer with the values that define a rectangle.
   

async function main() {
  var canvas = document.querySelector("#c");
  //canvas.width = 400;
  //canvas.height = 300;


  var gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("Error. No se pudo cargar WebGL2");
  }
  // Canvas stuff
  webgl_utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // [-1, 1] maps to [0, canvas.width/height]
  // Clear the canvas
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);


  // ------------------------- Construct necesary VAOS ------------------------

  const grid = new Grid(gl);
  await grid.build();
  

  let theta = 0.0;


  //Mouse stuff
  let mouseX = -1;
  let mouseY = -1;
  var isDragging = false;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = 1 / (canvas.width * devicePixelRatio);
  const pixelHeight = 1 / (canvas.height * devicePixelRatio);

  // To move objects
  var pixelX;
  var pixelY;
  var mouse_ndcX;
  var mouse_ndcY;

  

  
  // New buffer to select objects
  var curr_ID = -1;
  var select_obj =   webgl_utils.buildFrameBuffer_ColorOnly(gl, 0, 1,1);



  // --------- Render cycle ------
  var then  = 0;

  requestAnimationFrame(drawScene);
  function drawScene(now)
  {
    // ---- Time -----
    now *= 0.001; //To seconds
    const deltaTime = now - then;
    then = now;


    // See why if I delete this part it stops rendering
    pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth;
    pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;

    mouse_ndcX = pixelX / gl.canvas.width * 2 - 1; 
    mouse_ndcY = pixelY / gl.canvas.height * 2 - 1;

    //Render to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);


    
    grid.draw();


    // ---------- Animation stuff --------
    //Time in the curve
    const t = (now % animation_duration) / animation_duration




    // Render to one pixel so we can determine which object is being click
    gl.bindFramebuffer(gl.FRAMEBUFFER, select_obj.ID); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, 1, 1);
    // Render things to pick

    theta += 1 * deltaTime;
    requestAnimationFrame(drawScene);

  }

  gl.canvas.addEventListener('mousemove', (e) => {
     const rect = canvas.getBoundingClientRect();
     mouseX = e.clientX - rect.left;
     mouseY = e.clientY - rect.top;


     if(isDragging && curr_ID >= 0)
     {
        pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth;
        pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;
        mouse_ndcX = pixelX / gl.canvas.width * 2 - 1; 
        mouse_ndcY = pixelY / gl.canvas.height * 2 - 1;
        
        let ratio = gl.canvas.width / gl.canvas.height;
        mouse_ndcX *= ratio;

        //Points
        points[curr_ID].update_translation_matrix([mouse_ndcX, mouse_ndcY]);


        //Curve
        switch(curr_ID)
        {
          case 0:
            {
              curve.modify_p1(mouse_ndcX, mouse_ndcY); 
              l1.modify_p1(mouse_ndcX, mouse_ndcY);
              break;
            }
          case 1:
            {
              curve.modify_p2(mouse_ndcX, mouse_ndcY); 
              l1.modify_p2(mouse_ndcX, mouse_ndcY);
              break;
            }
          case 2:
            {
              curve.modify_p3(mouse_ndcX, mouse_ndcY); 
              l2.modify_p2(mouse_ndcX, mouse_ndcY);
              break;
            }
          case 3:
            {
              curve.modify_p4(mouse_ndcX, mouse_ndcY); 
              l2.modify_p1(mouse_ndcX, mouse_ndcY);
              break;
            }
          default: break;
        }

        //renderCurvesInstance.update_points(gl, curve);
     }
  });

  canvas.addEventListener('mousedown', (e) => {
    
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Read the pixel color at the mouse position
    const pixelData = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

    curr_ID = webgl_utils.getIdFromColor(pixelData) - 1;
    //console.log('Picked object ID:', curr_ID);


    isDragging = true;

  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  document.getElementById('time_button').addEventListener('click', () => {
      animate_method = 0;
    });

  document.getElementById('length_button').addEventListener('click', () => {
    animate_method = 1;
  });

  const numberInput = document.getElementById('numberInput');

  document.getElementById('enter_button').addEventListener('click', () => {
    if(numberInput.value < 0.1) alert('The animation time is too low!');
    else animation_duration = numberInput.value;
  });


}

var animate_method = 0;
var animation_duration = 5;
main();