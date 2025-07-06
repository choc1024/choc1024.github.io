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
  if (value > 100) {
    value = 100
  }
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

const noise_levels = [0, 10, 25, 30, 40, 50, 60, 70, 80, 90, 99]
const data_levels_bytes = [8, 16, 32, 64, 128, 150, 200, 256, 500, 1024]

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
    }
    await delay(500) // debugging delay
    popup.style.display = "flex";
    popup_text.textContent = "Simulating network noise..."
    let process = process_editor.getValue();
    let receive = receive_editor.getValue();
    let heatmap = document.getElementById('heatmap');
    let result_list = document.getElementById("results")
    heatmap.innerHTML = '';
    pyodide.runPython(process)
    pyodide.runPython(receive)
    let progress_count = 0
    for (let i = 11; i > 0; i--) {
      for (let j = 0; j < 10; j++) {
        let score = 0
        progress_count++
        updateProgress(progress_count)
        await delay(10)
        for (let k = 0; k < 100; k++){
          let data = data_generator(data_levels_bytes[j]*4)
          pyodide.globals.set("input_bits", data);
          const result = pyodide.runPython("process(input_bits)");
          if (isBinary(result) === false) {
            alert("Process function return value invalid")
            popup.style.display = "none";
            return
          }
          let flipped = flipBits(result, noise_levels[i])
          pyodide.globals.set("input_bits", flipped)
          let received_data = pyodide.runPython("receive(input_bits)")
          if (received_data === data) {
            score++
          }
        }
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = score + '%';
        const hue = score * 1.2;
        cell.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        heatmap.appendChild(cell);
      }
    }
    popup_text.textContent = "Done!"
    result_list.style.display = "flex"
    updateProgress(0)
}