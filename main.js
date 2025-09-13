
import * as webgl_utils from './webgl-utils.js'
import {Grid} from './grid_class.js'
import * as mathRenderer from './math_renderer.js';
import * as gl_2dMath from './gl_2Dmath.js'


const MAX_IMG_SIZE = 1024;

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
  //webgl_utils.resizeCanvasToDisplaySize(gl.canvas);
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

  // The render cycle was here

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

  // -------------------------------- Load file ------------------------------
  let imageData = {};
  let svgText;
  let lockedRatio = true;
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const linkButton = document.getElementById('linkBtn');
  const linkedSVG = document.getElementById('linkedSVG');
  const unlikedSVG = document.getElementById('unlikedSVG');


  async function resizeImageToMax(img) {
    let w = img.width;
    let h = img.height;

    if (w <= MAX_IMG_SIZE && h <= MAX_IMG_SIZE) return img;

    const aspect = w/h;
    if (aspect > 1) {
      w = MAX_IMG_SIZE;
      h = Math.round(MAX_IMG_SIZE / aspect);
    } else {
      h = MAX_IMG_SIZE;
      w = Math.round(MAX_IMG_SIZE * aspect);
    }

    // draw into an offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const scaledImg = new Image();
    
    scaledImg.src = canvas.toDataURL("image/png");
    return scaledImg; // Promise
  }

  function loadImage(files) {
    if (files.length > 0) {
        const file = files[0];

        const imageTypes = [
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/bmp",
          "image/svg+xml"
        ];
        
        if(!imageTypes.includes(file.type)) {
          alert("Please drop a valid Image. Not GIF");
          return;
        }

        lockedRatio = true;
        linkedSVG.hidden = false;
        unlikedSVG.hidden = true;
          

        // We read the whole file to parse afterwards
        for (let e of document.querySelectorAll('.imageName')){
          e.innerHTML = file.name
        }


        if (file.type === "image/svg+xml") {

          const reader = new FileReader();
          reader.onload = (e) => {
            svgText = e.target.result;

            document.getElementById('inputResolution').classList.add('show-modal');            
          };
          reader.readAsText(file);
          
        } else {

          const img = new Image();
          img.onload = () => {
            resizeImageToMax(img).then((newImg) => {
              const resizedImg = newImg;
              document.getElementById('modal').classList.add('show-modal');

              // We are going to asume that 1px = 1 unit
              imageData = grid.save_Image_data(resizedImg);
              imageData.ratio = imageData.scale[0] / imageData.scale[1];
              document.getElementById('widthInput').value = imageData.scale[0];
              document.getElementById('heightInput').value = imageData.scale[1];
              document.getElementById('positionXInput').value = imageData.position[0];
              document.getElementById('positionYInput').value = imageData.position[1];
            });
          };
          //img.onerror = reject;
          img.src = URL.createObjectURL(file);
              
        }

        
    }
  }

  function truncateDecimals(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.trunc(num * factor) / factor;
  }

  const fixedDecimals = (x, n) => {
    x = truncateDecimals(x, n);
    const intPart = Math.floor(x);

    let currDec = x - intPart;
    for (let i = 0; i < 5; i++) {
      if(currDec === 0) return truncateDecimals(x, i);
      let nX = 10 * currDec;
      currDec = nX - Math.floor(nX);
    }
    
    return x;

  } 

  document.getElementById('ok-btnPoints').addEventListener('click', () => {
    const input = document.querySelector('.resolution-input');
    if (!input.checkValidity()) {
      input.reportValidity();
    }
    else {
      document.getElementById('inputResolution').classList.remove('show-modal');
      document.getElementById('modal').classList.add('show-modal');

      imageData = grid.create_paths(svgText, input.value);
      imageData.ratio = imageData.scale[0] / imageData.scale[1];
      document.getElementById('widthInput').value = fixedDecimals(imageData.scale[0], 6);
      document.getElementById('heightInput').value = fixedDecimals(imageData.scale[1], 6);
      document.getElementById('positionXInput').value = fixedDecimals(imageData.position[0], 6);
      document.getElementById('positionYInput').value = fixedDecimals(imageData.position[1], 6);
    }
  })

  document.getElementById('editBtn').addEventListener('click', () => {

    const info = grid.getImageMods();
    document.getElementById('modal').classList.add('show-modal');
    document.getElementById('widthInput').value = fixedDecimals(imageData.scale[0] * info.zoom, 6);
    document.getElementById('heightInput').value = fixedDecimals(imageData.scale[1] * info.zoom, 6);
    document.getElementById('positionXInput').value = fixedDecimals(info.center[0], 6);
    document.getElementById('positionYInput').value = fixedDecimals(info.center[1], 6);
    document.getElementById('rotationInput').value = fixedDecimals(imageData.rotation, 6);
  })

  function parseFloatDefault(x) {
    const n = parseFloat(x);
    return isNaN(n) ? 0 : n;
  }

  document.getElementById('ok-btn').addEventListener('click', () =>{
    const inputs = document.querySelectorAll(".form-input");
      let allValid = true;

      inputs.forEach(input => {
        if (!input.checkValidity()) {
          input.reportValidity();
          allValid = false;
        }
      });

      if (allValid) {

        const newWidth = parseFloatDefault(document.getElementById('widthInput').value);
        const newHeigth = parseFloatDefault(document.getElementById('heightInput').value);
        const newPosX = parseFloatDefault(document.getElementById('positionXInput').value);
        const newPosY = parseFloatDefault(document.getElementById('positionYInput').value)
        const angle = parseFloatDefault(document.getElementById('rotationInput').value);

        // If something bad Happened
        if (newHeigth === 0) {
          newHeigth = 1;
          newWidth = newHeigth * imageData.ratio;
        }


        imageData = {
          'scale': [newWidth, newHeigth],
          'position': [newPosX, newPosY],
          'rotation': angle,
          'ratio': imageData.ratio // Original one, does not change
        }

        /*const realBox =*/ grid.update_Image(imageData);
        // Rotations may change the real center
        //const centerX = (realBox.Left + realBox.Right)/2; 
        //const centerY = (realBox.Top + realBox.Bottom)/2;
        //console.log("Please", centerX, centerY)
        //imageData.position = [centerX, centerY]
        document.getElementById('editBtn').classList.add('show-modal');  
        document.getElementById('modal').classList.remove('show-modal');
      }
      else {
        grid.clean_paths();
      }

    
    
  })


  document.getElementById('closeModal').addEventListener("click", () => {
    document.getElementById('modal').classList.remove('show-modal');
  })
  document.getElementById('closeRes').addEventListener("click", () => {
    document.getElementById('inputResolution').classList.remove('show-modal');
  })

  window.addEventListener('mousedown', (e) => {
    const inputs = [document.getElementById('modal'),
                    document.getElementById('inputResolution'),
                    document.getElementById('editTime'),
                    document.getElementById("examples-loading"),]
    if (inputs.includes(e.target)) 
    {
      e.target.classList.remove('show-modal');
    }
  })


  // ------------------------- Preserve ratio (or not) when inputing size ---------------------

  widthInput.addEventListener('blur', () => {
    if (lockedRatio) {
      const newWidth = parseFloatDefault(widthInput.value);
      heightInput.value = fixedDecimals(newWidth / imageData.ratio, 6);
    }
    
  })

  heightInput.addEventListener('blur', () => {
    if (lockedRatio) {
      const newHeigth = parseFloatDefault(heightInput.value);
      widthInput.value = fixedDecimals(newHeigth * imageData.ratio, 6);
    }
  })
  linkButton.addEventListener('click', ()=>{
    lockedRatio = !lockedRatio;
    if(lockedRatio) {
      heightInput.value = fixedDecimals(widthInput.value / imageData.ratio, 6);
    }
    linkedSVG.hidden = !lockedRatio;
    unlikedSVG.hidden = lockedRatio;

  })



  document.getElementById('uploadBtn').addEventListener("click", () =>{
    document.getElementById('fileInput').click();
  })
  document.getElementById("fileInput").addEventListener("change", (event) => {
      loadImage(event.target.files);
  });
  canvas_input.addEventListener("drop", (event) => {
    event.preventDefault();
    loadImage(event.dataTransfer.files);
  });


  // --------------------- Preserve transformations ----------------------
  let lockedTrans = true;
  const lockedSVG = document.getElementById('lockedSVG')
  const unlockedSVG = document.getElementById('unlockedSVG')

  document.getElementById('lockBtn').addEventListener('click', () =>{
    lockedTrans = !lockedTrans;
    grid.updateLockPaths(lockedTrans, imageData);
    lockedSVG.hidden = !lockedTrans;
    unlockedSVG.hidden = lockedTrans;
  })


  // --------------------- Time variables and settings ----------------------
  let isPlaying = false;
  const playButtonSVG = document.getElementById('play-button');
  const pauseButtonSVG = document.getElementById('pause-button');
  const timeSettingsButton = document.getElementById('settings-button');
  const minT = document.getElementById("minT");
  const maxT = document.getElementById("maxT");
  const durationT = document.getElementById("durationT");
  const timeSlider = document.getElementById('time-progress');
  const timeInput = document.getElementById('time-input');
  const activatetimeInput = document.getElementById('time-input-activate');

  function setPlayStatus(status) {
    isPlaying = status;
    grid.setIsTimeStoppedStatus(!status);
    playButtonSVG.hidden = status;
    pauseButtonSVG.hidden = !status;
  }

  function updateGUI() {
    const data = grid.getTimeParameters();
    timeSlider.value = data.currentTime;
    timeInput.value = fixedDecimals(data.currentTime, 2);
  }


  timeSlider.addEventListener("mousedown", () => {
    setPlayStatus(false)
  });
  timeSlider.addEventListener("touchstart", () => {
    setPlayStatus(false)
  });

  timeSlider.addEventListener("input", () => {
    grid.updateCurrentTime(parseFloatDefault(timeSlider.value));
    timeInput.value = fixedDecimals(timeSlider.value, 2);
  });

  activatetimeInput.addEventListener("dblclick", () => {
    timeInput.disabled = false;
    activatetimeInput.hidden = true;       
    timeInput.focus();

    setPlayStatus(false);
  });

  timeInput.addEventListener("blur", () => {
    timeInput.disabled = true;       // enable editing
    activatetimeInput.hidden = false;

    let t_val = parseFloatDefault(timeInput.value);
    t_val = Math.max(Math.min(timeSlider.max, t_val), timeSlider.min);
    grid.updateCurrentTime(t_val);
    updateGUI()
  });


  document.getElementById('time-state-button').addEventListener('click', () =>{
    setPlayStatus(!isPlaying);
  });

  timeSettingsButton.addEventListener('click', () =>{

    const data = grid.getTimeParameters();
    minT.value = fixedDecimals(data.minTime, 6);
    maxT.value = fixedDecimals(data.maxTime, 6);
    durationT.value = fixedDecimals(data.duration, 6);

    document.getElementById('editTime').classList.add('show-modal');
  })

  document.getElementById('closeEditTime').addEventListener("click", () => {
    document.getElementById('editTime').classList.remove('show-modal');
  })

  const timeInputs = document.querySelectorAll(".time-input");
  timeInputs.forEach((input) => {
    input.addEventListener("input", () => {
      input.setCustomValidity("");
    })
  })

  document.getElementById('ok-btnTime').addEventListener("click", () => {

    timeInputs.forEach(input => input.setCustomValidity("")); // Clean

    let allValid = true;
    timeInputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        allValid = false;
      }
    });

    

    if (allValid) {

      if (minT.value >= maxT.value) {
        minT.setCustomValidity("Value of min t must be less than max t.");
        minT.reportValidity();
        allValid = false;
      }
      if (durationT.value == 0) {
        durationT.setCustomValidity("Duration cannot be equal to 0");
        durationT.reportValidity();
        allValid = false;
      }
    }

    if (allValid) {
      const newData = {}
      newData.maxTime = parseFloatDefault(maxT.value);
      newData.minTime = parseFloatDefault(minT.value);
      newData.duration = parseFloatDefault(durationT.value);
      grid.update_time_parameters(newData);

      timeSlider.max = newData.maxTime;
      timeSlider.min = newData.minTime;
      updateGUI();

      document.getElementById('editTime').classList.remove('show-modal');
      setPlayStatus(true);
    }
  })



  // -------------------------------- Expressions input  --------------------------------

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




  // ------------------------------- Examples input -----------------------------------
  const examplesForm =  document.getElementById("examples-loading");
  const examplesButton = document.getElementById("examples-button");
  const examplesContainer = document.getElementById("examples-container");
  let examplesInfo;
  await fetch('./resources/examples/examples_list.json').then(response => response.json()).then(examplesData  => {
    const ids = examplesData["id_list"];
    for (let id of ids) {
      const currData = examplesData[id];
      const button = document.createElement("button");
      button.classList.add("example-option");

      const img = document.createElement("img");
      img.src = currData["path"];
      img.alt = id;

      const label = document.createElement("span");
      label.textContent = currData["name"]

      button.appendChild(img);
      button.appendChild(label);

      button.addEventListener("click", () => {
        console.log(currData);
        examplesForm.classList.remove('show-modal');

        // Set the example
        input_f1.value = currData["f_1"];
        input_f1.dispatchEvent(new Event("input", { bubbles: true }));
        input_f2.value = currData["f_2"];
        input_f2.dispatchEvent(new Event("input", { bubbles: true }));

        for (let e of document.querySelectorAll('.imageName')){
          e.innerHTML = currData["name"]
        }

        const finish_setup = () => {
          imageData.ratio = imageData.scale[0] / imageData.scale[1];

          let w = 1, h = 1;

          if (currData["width"] && currData["height"]) {
            w = parseFloatDefault(currData["width"]);
            h = parseFloatDefault(currData["height"]);
          } else if(currData["width"]){
            w = parseFloatDefault(currData["width"]);
            h = w / imageData.ratio;
          } else if (currData["height"]) {
            h = parseFloatDefault(currData["height"]);
            w = h * imageData.ratio;
          }
          console.log(w, h)

          imageData = {
            'scale': [w, h],
            'position': [parseFloatDefault(currData["posX"]), parseFloatDefault(currData["posY"])],
            'rotation': parseFloatDefault(currData["rotation"]),
            'ratio': imageData.ratio // Original one, does not change
          }

          grid.update_Image(imageData);
          
          document.getElementById('editBtn').classList.add('show-modal');

          if (currData["uses_time"]) {
              const newData = {}
              newData.maxTime = parseFloatDefault(currData["maxT"]);
              newData.minTime = parseFloatDefault(currData["minT"]);
              newData.duration = parseFloatDefault(currData["duration"]);
              grid.update_time_parameters(newData);

              timeSlider.max = newData.maxTime;
              timeSlider.min = newData.minTime;
              updateGUI();
              setPlayStatus(true);
          }
        }

        if (currData["type"] === "svg") {
          fetch(currData["path"]).then(result => result.text()).then(data => {
            imageData = grid.create_paths(data, currData["nPoints"]);
            finish_setup(imageData);
          });
        }

        if (currData["type"] === "raster") {
          const img = new Image();
          img.onload = () => {
            resizeImageToMax(img).then((newImg) => {
              const resizedImg = newImg;
              // We are going to asume that 1px = 1 unit
              imageData = grid.save_Image_data(resizedImg);
              finish_setup(imageData);
            });
          }
          img.src = currData["path"];
        }


        ":)"


      });

      examplesContainer.appendChild(button);

    }
    
  });


  examplesButton.addEventListener("click", () => {
    examplesForm.classList.add('show-modal');
  })
  document.getElementById("close-examples").addEventListener("click", () => {
    examplesForm.classList.remove('show-modal');
  })



  // -------------------------------- Resize ----------------------------------

  const resizeObserver = new ResizeObserver(onResize);
  try {
    // only call us of the number of device pixels changed
    resizeObserver.observe(canvases[0], {box: 'device-pixel-content-box'});
    resizeObserver.observe(canvases[1], {box: 'device-pixel-content-box'});
  } catch (ex) {
    // device-pixel-content-box is not supported so fallback to this
    resizeObserver.observe(canvases[0], {box: 'content-box'});
    resizeObserver.observe(canvases[1], {box: 'content-box'});
  }

  const canvasToDisplaySizeMap = new Map([[canvases[0], [canvases[0].width, canvases[0].height]], 
                                          [canvases[1], [canvases[1].width, canvases[1].height]]]);

  function onResize(entries) {
    for (const entry of entries) {
      let width;
      let height;
      let dpr = window.devicePixelRatio;
      if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other paths are imperfect fallbacks
        // for browsers that don't provide anyway to do this
        width = entry.devicePixelContentBoxSize[0].inlineSize;
        height = entry.devicePixelContentBoxSize[0].blockSize;
        dpr = 1; // it's already in width and height
      } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
          width = entry.contentBoxSize[0].inlineSize;
          height = entry.contentBoxSize[0].blockSize;
        } else {
          width = entry.contentBoxSize.inlineSize;
          height = entry.contentBoxSize.blockSize;
        }
      } else {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }
      const displayWidth = Math.round(width * dpr);
      const displayHeight = Math.round(height * dpr);
      canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
    }
  }

  function resizeCanvasToDisplaySize(canvas) {
    // Get the size the browser is displaying the canvas in device pixels.
     const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

     // Check if the canvas is not the same size.
     const needResize = canvas.width  != displayWidth || 
                        canvas.height != displayHeight;
     
     if (needResize) {
       // Make the canvas the same size
       canvas.width  = displayWidth;
       canvas.height = displayHeight;
     }
     
     return needResize;

  }



  // --------- Render cycle ------
  let theta = 0.0;
  var timeThen  = 0;

  requestAnimationFrame(drawScene);
  function drawScene(timeNow)
  {
    // ---- Time -----
    let resized = false;
    for (const canvas of canvases) {
      resized = resizeCanvasToDisplaySize(canvas)
    }
    if (resized) {
      //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        //gl.viewport(0, 0, newWidth, newHeigth);
      grid.rebuildPixelContainer()
    }

    timeNow *= 0.001; //To seconds
    const deltaTime = timeNow - timeThen;
    timeThen = timeNow;


    if (isPlaying) {
      updateGUI();
    }
    //Render to the screen
    grid.draw(deltaTime);

    requestAnimationFrame(drawScene);
  }

}





main();
