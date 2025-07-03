const process_editor = CodeMirror.fromTextArea(document.getElementById("code_process"), {
    lineNumbers: true,
    mode: "python",
    theme: "default"
});
const receive_editor = CodeMirror.fromTextArea(document.getElementById("code_receive"), {
    lineNumbers: true,
    mode: "python",
    theme: "default"
});

function data_generator(length) {
  let data = '';
  for (let i = 0; i < length; i++) {
    data += Math.random() < 0.5 ? '0' : '1';
  }
  return data;
}

function delay(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

let pyodide_load = false
let pyodide = null

function updateProgress(value) {
  const bar = document.getElementById("progress-bar");
  console.log(value + "%")
  bar.style.width = value + "%";
}

function isBinary(str) {
  return /^[01]+$/.test(str);
}

function flipBits(str, percentage) {
  const length = str.length;
  const numToFlip = Math.floor(length * (percentage / 100));
  const indexes = new Set();

  // Pick unique random indexes
  while (indexes.size < numToFlip) {
    indexes.add(Math.floor(Math.random() * length));
  }

  // Convert to array to modify characters
  let arr = str.split("");

  for (let i of indexes) {
    arr[i] = arr[i] === "0" ? "1" : "0";
  }

  return arr.join("");
}

async function simulate() {
  let popup_text = document.getElementById("popup_text")
  let popup = document.getElementById("popup")
    if (pyodide_load === false) {
      popup_text.textContent = "Loading Pyodide..."
      popup.style.display = "flex";
      popup_text.textContent = "Loading Pyodide..."
      await delay(0.24)
      updateProgress(25)
      pyodide = await loadPyodide();
      console.log("pyodide loded")
      updateProgress(75)
      pyodide_load = true
      await delay(1000) // delay a bit to improve user experience :)
      updateProgress(100)
      await delay(500)
      updateProgress(0)
      popup_text.textContent = "Simulating network noise..."
    } else {
      popup.style.display = "flex";
      popup_text.textContent = "Simulating network noise..."
    }
    console.log("Started Simulation")
    let process = process_editor.getValue();
    let receive = receive_editor.getValue();
    let noise = document.getElementById("noise_slider").value
    let data_length = parseInt(document.getElementById("data_slider").value)
    await delay(750)
    pyodide.runPython(process)
    pyodide.runPython(receive)
    console.log("Starting for loop")
    let sucsessful_transfers = 0
    for (let i = 0; i < 100; i++) {
        updateProgress(i)
        data = data_generator(data_length);
        pyodide.globals.set("input", data);
        const result = pyodide.runPython("process(input)");
        if (isBinary(result) === false) {
          alert("Process function return value invalid")
          return
        }
        let flipped = flipBits(result, noise)
        pyodide.globals.set("input", flipped)
        let received_data = pyodide.runPython("receive(input)")
        if (received_data === data) {
          sucsessful_transfers++
        }
        await delay(25);
        
    }
    await delay(750)
    updateProgress(0)
    popup.style.display = "none";
    await delay(50)
    alert("Successful amount of data transfers: " + sucsessful_transfers)
}