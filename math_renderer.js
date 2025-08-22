

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

    //

    //  Record that we are running MathJax and that no additional update

    //  is needed after that.

    //

    mjRunning = true;

    updatePending = false;

    //

    //  Forget about any old math expressions from the preview

    //

    MathJax.startup.document.clearMathItemsWithin([objectWithPreview]);

    //

    //  Reset any TeX labels or equation numbers

    MathJax.texReset();

    //  Start a new sandbox for new macro definitions (and remove any old ones)

    //MathJax.tex2mml('\\begingroupSandbox');

    //

    //  Update the preview HTML and typeset the math

    //
    objectWithPreview.innerHTML = newString;

    MathJax.typesetPromise()

      .then(() => {

        //

        //  MathJax has completed, so is no longer running

        //  If an update was needed while MathJax was running, update the

        //    preview again.

        //

        mjRunning = false;

        if (updatePending) updatePreview();

      })

      .catch((err) => console.error('Math typeset failed:', err));

  }