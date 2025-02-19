
import * as webgl_utils from './webgl-utils.js'
import { RenderPoints,  Point} from './point_class.js'
import {BezierCurve, RenderCurves, Line} from './line_class.js'
import {Grid} from './grid_class.js'



// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}


var animate_method = 0;
var animation_duration = 5;

var spanX = [-1,1];
var sizeX = 2;
var middleX = 0;

var spanY = [-1,1];
var sizeY = 2;
var middleY = 0;


var spanSpeed = 0.05;
var spanText = document.getElementById('span_text');
spanText.style.fontSize = "x-large"; 


/*

TODO: 
- Send the span of the axis to the vertex shader. Aka, map [-1, 1] to [span[0], span[1]]
- Add user being able to input span
- Add the option to draw your vector graphics
- Add UI element for the span of the axis
---- MVP ----
- Add the option to add pictures and edit them
*/


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

  grid.update_ratio(spanX, spanY);
  grid.update_squareSize();
  grid.update_span(spanX, spanY);
  

  let theta = 0.0;


  //Mouse stuff
  let mouseX = -1;
  let mouseY = -1;
  let mouseClientX = -1;
  let mouseClientY = -1;
  var isDragging = false;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = 1 / (canvas.width * devicePixelRatio);
  const pixelHeight = 1 / (canvas.height * devicePixelRatio);

  // To move objects
  var pixelX;
  var pixelY;
  var mouseCoordX;
  var mouseCoordY;

  

  
  // New buffer to select objects
  var curr_ID = -1;
  var select_obj =   webgl_utils.buildFrameBuffer_ColorOnly(gl, 0, 1,1);






  // --------- Render cycle ------
  var timeThen  = 0;

  requestAnimationFrame(drawScene);
  function drawScene(timeNow)
  {
    // ---- Time -----
    timeNow *= 0.001; //To seconds
    const deltaTime = timeNow - timeThen;
    timeThen = timeNow;



    //Render to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);


    
    grid.draw();


    // ---------- Animation stuff --------
    //Time in the curve
    const t = (timeNow % animation_duration) / animation_duration




    // Render to one pixel so we can determine which object is being click
    gl.bindFramebuffer(gl.FRAMEBUFFER, select_obj.ID); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, 1, 1);
    // Render things to pick

    theta += 1 * deltaTime;
    requestAnimationFrame(drawScene);


    // UI elements
    spanText.textContent = "width from " + spanX[0].toFixed(4) + " to " + spanX[1].toFixed(4) + "\n" +
                            "height from " + spanY[0].toFixed(4) + " to " + spanY[1].toFixed(4);

  }


  // -------------------- Inputs -----------------------------


  canvas.addEventListener('mousemove', (e) => {
     const rect = canvas.getBoundingClientRect();


     if(isDragging)
     {
        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;

        let dx = currentMouseX - mouseX;
        let dy = currentMouseY - mouseY;

        // Normalize them
        dx /= rect.height; // With aspect transformation
        dy /= rect.height;

        // Update the translation of the grid
        grid.update_offset(dx, dy);


        // Update the transformation of the span
        dx *= spanX[1] - spanX[0];
        dy *= spanY[1] - spanY[0];

        // Scale
        dx *= 2.0;
        dy *= 2.0;

        spanX[0] -= dx;
        spanX[1] -= dx;
        middleX -= dx;

        spanY[0] += dy;
        spanY[1] += dy;
        middleY += dy;

        // Update mouse position
        mouseX = currentMouseX;
        mouseY = currentMouseY;
        mouseCoordX = (currentMouseX - rect.left) / rect.width * (spanX[1] - spanX[0]) + spanX[0];
        mouseCoordY = (currentMouseY - rect.top) / rect.height * (spanY[1] - spanY[0]) + spanY[0];
        
        grid.update_span(spanX, spanY);
     }
  });

  canvas.addEventListener('mousedown', (e) => {
    
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX;
    mouseY = e.clientY;

    mouseCoordX = (mouseX - rect.left) / rect.width * (spanX[1] - spanX[0]) + spanX[0];
    mouseCoordY = (mouseY - rect.top) / rect.height * (spanY[1] - spanY[0]) + spanY[0];

    // For later
    // Read the pixel color at the mouse position
    //const pixelData = new Uint8Array(4);
    //gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    //curr_ID = webgl_utils.getIdFromColor(pixelData) - 1;
    //console.log('Picked object ID:', curr_ID);


    isDragging = true;

    console.log(mouseCoordX, mouseCoordY)

  });

  canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      grid.update_zoom(e.deltaY);

      // Change span
      if (e.deltaY < 0) {
        // Zoom in, span shrinks
          spanX = spanX.map(x => x * (1 - spanSpeed));
          spanY = spanY.map(y => y * (1 - spanSpeed));
      } else {
        // Zoom out, span grows
          spanX = spanX.map(x => x * (1 + spanSpeed));
          spanY = spanY.map(y => y * (1 + spanSpeed));
      }

      // To make it more manageble
      if(spanX[1] - spanX[0] >= 2 * sizeX)
      {
        spanX[1] = middleX + sizeX;
        spanX[0] = middleX - sizeX;
        sizeX *= 2;
      }

      if(spanX[1] - spanX[0] <= 0.5 * sizeX)
      {
        spanX[1] = middleX + sizeX * 0.25;
        spanX[0] = middleX - sizeX * 0.25;
        sizeX *= 0.5;
      }

      if(spanY[1] - spanY[0] >= 2 * sizeY)
      {
        spanY[1] = middleY + sizeY;
        spanY[0] = middleY - sizeY;
        sizeY *= 2;
      }

      if(spanY[1] - spanY[0] <= 0.5 * sizeY)
      {
        spanY[1] = middleY + sizeY * 0.25;
        spanY[0] = middleY - sizeY * 0.25;
        sizeY *= 0.5;
      }


      grid.update_span(spanX, spanY);
      //console.log("log span: " + (spanX[1]-spanX[0]))

/*
      if (e.deltaY < 0) {
          console.log("Scrolled up");
      } else {
          console.log("Scrolled down");
      }
*/
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



main();