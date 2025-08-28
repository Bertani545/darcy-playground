
import * as webgl_utils from './webgl-utils.js'
import {Grid} from './grid_class.js'
import * as mathRenderer from './math_renderer.js';


// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}


var animate_method = 0;
var animation_duration = 5;


// Check ratio



var spanSpeed = 0.05;
//var spanText = document.getElementById('span_text');
//spanText.style.fontSize = "x-large"; 


/*

MAYBE TODO: 

- Add the option to add pictures and edit them
*/


async function main() {
  const canvas_input = document.querySelector("#Grid01");
  const canvas_output = document.querySelector("#Grid02");
  const gl = canvas_input.getContext("webgl2");
  const ctx = canvas_output.getContext("2d");
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

/*
  spanX = spanX.map(x => x *  gl.canvas.width / gl.canvas.height );
  sizeX = spanX[1] - spanX[0];
  sizeY = spanY[1] - spanY[0];

  middleX = (spanX[1] + spanX[0])/2;
  middleY = (spanY[1] + spanY[0])/2;
*/

  const canvases = [document.getElementById("Grid01"), document.getElementById("Grid02")];
   for (const canvas of canvases) {
     
     const rect = canvas.getBoundingClientRect();
     const dpr = window.devicePixelRatio || 1;
     canvas.width = rect.width * dpr;
     canvas.height = rect.height * dpr;

   }

  const grid = new Grid(gl, ctx, text_container_input, spanSpeed);
  await grid.build(); // Add here the span it will have in the begginnig


  


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

  function getTouchPos(touchEvent) {
    return {
    x: touchEvent.touches[0].clientX,
    y: touchEvent.touches[0].clientY
  };
  }

  function dragMechanics(clientPos) {
    const rect = canvas_input.getBoundingClientRect();


     if(isDragging)
     {
        const currentMouseX = clientPos.x;
        const currentMouseY = clientPos.y;

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
  }

  let lastDistance = null;
  function getDistanceTouches(touches) {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }


  canvas_input.addEventListener('mousemove', (e) => {
     dragMechanics({x:e.clientX, y:e.clientY})
     e.preventDefault()
  });
  canvas_input.addEventListener("touchmove", (e) => {

    if (e.touches.length === 1) {
      dragMechanics(getTouchPos(e))
    }
    if (e.touches.length === 2) {
      const distance = getDistanceTouches(e.touches);

      if (lastDistance !== null) {
        const delta = lastDistance - distance;
        
        if (delta !== 0) {
          // Only care about the sign
          if (delta > 0) grid.update_zoom(1); // zoom in
          else grid.update_zoom(-1);           // zoom out
        }
      }

      lastDistance = distance;
    }

    
    e.preventDefault()
  }, {passive:false})

  function clickMechanics(clientPos) {
    const rect = canvas_input.getBoundingClientRect();
    mouseX = clientPos.x;
    mouseY = clientPos.y;

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
  }


  canvas_input.addEventListener('mousedown', (e) => {
    clickMechanics({x: e.clientX, y: e.clientY})
    preventDefault()
  });
  canvas_input.addEventListener('touchstart', (e) => {
    if (e.touches.length < 2) lastDistance = null;
    clickMechanics(getTouchPos(e))
    preventDefault()
  });


  function stopMovement() {
    isDragging = false;
  }


  canvas_input.addEventListener('mouseup', () => {
    stopMovement()
    e.preventDefault()
  });
  canvas_input.addEventListener('touchend', () => {
    stopMovement()
    if (e.touches.length < 2) lastDistance = null;
    e.preventDefault()
  });


  canvas_input.addEventListener("wheel", (e) => {
    e.preventDefault();
    grid.update_zoom(e.deltaY);
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
            alert("Please drop a valid SVG file.");
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

  const renderf1 = document.getElementById("renderMath1");
  const renderf2 = document.getElementById("renderMath2");

  


  input_f1.addEventListener("input", (event) => {
    const newTexOuput = "\\[" + grid.update_f1(event.target.value) + "\\]";
    mathRenderer.startUpdate(renderf1, newTexOuput);
  })
  
  input_f2.addEventListener("input", (event) => {
    const newTexOuput = "\\[" + grid.update_f2(event.target.value) + "\\]";
    mathRenderer.startUpdate(renderf2, newTexOuput);
  });



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

window.addEventListener('resize', () => {
     if (window.matchMedia("(orientation: portrait)").matches) {
        console.log("Portrait")
     }

     if (window.matchMedia("(orientation: landscape)").matches) {
        console.log("Landscape")
     }


     for (const canvas of canvases) {
       
       const rect = canvas.getBoundingClientRect();
       const dpr = window.devicePixelRatio || 1;
       canvas.width = rect.width * dpr;
       canvas.height = rect.height * dpr;

     }

     //webgl_utils.resizeCanvasToDisplaySize(gl.canvas);
     gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)




      grid.rebuildPixelContainer() // Must change a lot later
      grid.update_text_labels()
      grid.update_ratio()

      console.log("ratio", grid.ratio)
      //grid.draw();


      
    });


}





main();
