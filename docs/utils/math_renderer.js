

let mjRunning = false;           // true when MathJax is running
let updatePending = false; 




export function startUpdate(objectWithPreview, newString) {
    if (mjRunning) {
      updatePending = true;
    } else {
      updatePreview(objectWithPreview, newString);
    }
  }



function updatePreview(objectWithPreview, newString) {
  if (!objectWithPreview) return;

  // Clear old math items
  MathJax.startup.document.clearMathItemsWithin([objectWithPreview]);
  MathJax.texReset();

  // Update HTML
  objectWithPreview.innerHTML = newString;

  // Typeset the new content
  MathJax.typesetPromise([objectWithPreview])
    .then(() => {
      //console.log("MathJax typeset complete");
    })
    .catch(err => console.error("Math typeset failed:", err));
}