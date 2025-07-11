
import * as webgl_utils from './webgl-utils.js'
import {Grid} from './grid_class.js'


// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}


var animate_method = 0;
var animation_duration = 5;




var spanSpeed = 0.05;
var spanText = document.getElementById('span_text');
spanText.style.fontSize = "x-large"; 


/*

TODO: 

  -> MAKE THE SHADERS FOR THE SECOND CANVAS

- Add user being able to input span
- Add UI element for the span of the axis
- Formula parser for expressions of the form
  x = f(x,y)
  y = g(x,y)
  maybe be able to define other expressions?
---- MVP ----
- Add the option to add pictures and edit them
*/


async function main() {
  const canvas_input = document.querySelector("#Grid01");
  const canvas_output = document.querySelector("#Grid02");
  //canvas.width = 400;
  //canvas.height = 300;

  // Check if we should keep this
  /*
  const canvas_gui = document.querySelector("#GUI01");
  const ctx = canvas_gui.getContext("2d");
  ctx.fillStyle = "rgb(255 255 255)";
  ctx.fillRect(0, 0, 40, canvas_gui.height);
  ctx.fillRect(0, 0, canvas_gui.width, 40);
  */

  const gl = canvas_input.getContext("webgl2");
  if (!gl) {
    throw new Error("Error. No se pudo cargar WebGL2");
  }

    // For rendering to float
  const ext = gl.getExtension("EXT_color_buffer_float");
  if (!ext) {
    alert("need EXT_color_buffer_float");
    return;
  }

  // Canvas stuff
  webgl_utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // [-1, 1] maps to [0, canvas.width/height]
  // Clear the canvas
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);


  // Get element where the text is going to be displayed
  const text_container_input = document.querySelector("#text_overlay_input");


  // ------------------------- Construct necesary VAOS ------------------------

  // Send this to the build
  var spanX = [-1,1];
  var spanY = [-1,1];

  var sizeX = 2;
  var middleX = 0;
  var sizeY = 2;
  var middleY = 0;

  spanX = spanX.map(x => x *  gl.canvas.width / gl.canvas.height );
  sizeX = spanX[1] - spanX[0];
  sizeY = spanY[1] - spanY[0];

  middleX = (spanX[1] + spanX[0])/2;
  middleY = (spanY[1] + spanY[0])/2;


  const grid = new Grid(gl, canvas_output.getContext("2d"), text_container_input, spanSpeed);
  await grid.build(spanX, spanY); // Add here the span it will have in the begginnig


  


  let theta = 0.0;


  //Mouse stuff
  let mouseX = -1;
  let mouseY = -1;
  let mouseClientX = -1;
  let mouseClientY = -1;
  var isDragging = false;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = 1 / (canvas_input.width * devicePixelRatio);
  const pixelHeight = 1 / (canvas_input.height * devicePixelRatio);

  // To move objects
  var pixelX;
  var pixelY;
  var mouseCoordX;
  var mouseCoordY;

  

  
  // New buffer to select objects. Could be useful for future features
  var curr_ID = -1;
  //var select_obj =   webgl_utils.buildFrameBuffer_ColorOnly(gl, 0, 1,1);




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
    grid.draw();


    // ---------- Animation stuff --------
    //Time in the curve
    const t = (timeNow % animation_duration) / animation_duration



    // Render to one pixel so we can determine which object is being click
    //gl.bindFramebuffer(gl.FRAMEBUFFER, select_obj.ID); gl.clear(gl.COLOR_BUFFER_BIT);
    //gl.viewport(0, 0, 1, 1);
    // Render things to pick


    // UI elements
    //spanText.textContent = "width from " + spanX[0].toFixed(4) + " to " + spanX[1].toFixed(4) + "\n" +
    //"height from " + spanY[0].toFixed(4) + " to " + spanY[1].toFixed(4);


    theta += 1 * deltaTime;
    requestAnimationFrame(drawScene);
  }


  // -------------------- Inputs -----------------------------


  canvas_input.addEventListener('mousemove', (e) => {
     const rect = canvas_input.getBoundingClientRect();


     if(isDragging)
     {
        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;

        let dx = currentMouseX - mouseX;
        let dy = currentMouseY - mouseY;

        // Normalize them
        dx /= rect.width; // With aspect transformation
        dy /= rect.height;


        grid.update_offset(dx, dy);

        // Update mouse position
        mouseX = currentMouseX;
        mouseY = currentMouseY;
        //mouseCoordX = (currentMouseX - rect.left) / rect.width * (spanX[1] - spanX[0]) + spanX[0];
        //mouseCoordY = (currentMouseY - rect.top) / rect.height * (spanY[1] - spanY[0]) + spanY[0];
        
     }
  });

  canvas_input.addEventListener('mousedown', (e) => {
    
    const rect = canvas_input.getBoundingClientRect();
    mouseX = e.clientX;
    mouseY = e.clientY;

    //mouseCoordX = (mouseX - rect.left) / rect.width * (spanX[1] - spanX[0]) + spanX[0];
    //mouseCoordY = (mouseY - rect.top) / rect.height * (spanY[1] - spanY[0]) + spanY[0];

    // For later
    // Read the pixel color at the mouse position
    //const pixelData = new Uint8Array(4);
    //gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    //curr_ID = webgl_utils.getIdFromColor(pixelData) - 1;
    //console.log('Picked object ID:', curr_ID);


    isDragging = true;

    //console.log(mouseCoordX, mouseCoordY)

  });

  canvas_input.addEventListener("wheel", (e) => {
      e.preventDefault();
      grid.update_zoom(e.deltaY);
  });


  canvas_input.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas_input.addEventListener("dragover", (event) => {
    event.preventDefault(); // Required to allow dropping
    console.log("Drop here")
  });

  // Load file
  canvas_input.addEventListener("drop", (event) => {
    event.preventDefault();

    if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        
        // Check if it's an SVG file
        if (file.type !== "image/svg+xml") {
            alert("Please drop a valid XML file.");
            return;
        }


        const reader = new FileReader();
        reader.onload = (e) => {
            const svgText = e.target.result;
            grid.create_discrete_paths(svgText, 100); // CHANGE LATER TO ADD DEFINITION
        };
        // We read the whole file to parse afterwards
        reader.readAsText(file);
    }
  });


  const input_f1 = document.getElementById("f1");
  const input_f2 = document.getElementById("f2");

  input_f1.addEventListener("input", (event) => {grid.update_f1(event.target.value)})
  input_f2.addEventListener("input", (event) => {grid.update_f2(event.target.value)})



/*
  //document.getElementById('time_button').addEventListener('click', () => {
  //    animate_method = 0;
  //  });

  //document.getElementById('length_button').addEventListener('click', () => {
  //  animate_method = 1;
  //});

  const numberInput = document.getElementById('numberInput');

  document.getElementById('enter_button').addEventListener('click', () => {
    if(numberInput.value < 0.1) alert('The animation time is too low!');
    else animation_duration = numberInput.value;
  });
*/
}



main();
