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

const noise_levels = [1, 10, 25, 30, 40, 50, 60, 70, 80, 90, 99]
const data_levels_bytes = [8, 16, 32, 64, 128, 150, 200, 256, 500, 1024]

async function simulate() {
  let popup_text = document.getElementById("popup_text")
  let popup = document.getElementById("popup")
  updateProgress(0)
    if (pyodide_load === false) {
      popup_text.textContent = "Loading Pyodide..."
      popup.style.display = "flex";
      await delay(0.24)
      updateProgress(25)
      pyodide = await loadPyodide();
      updateProgress(75)
      pyodide_load = true
      await delay(500) // delay a bit to improve user experience :)
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
    for (let i = 10; i > -1; i--) {
      const row_label = document.createElement('div');
      row_label.className = 'cell';
      row_label.textContent = noise_levels[i] + '%';
      const gray = Math.round(255 - (i * 25.5));
      row_label.style.backgroundColor = `rgb(${gray}, ${gray}, ${gray})`;
      if (i < 5) {
        row_label.style.color = 'black';
      } else {
        row_label.style.color = 'white';
      }
      heatmap.appendChild(row_label);
      for (let j = 0; j < 10; j++) {
        let score = 0
        progress_count++
        updateProgress(progress_count)
        await delay(5)
        for (let k = 0; k < 100; k++){
          let data = data_generator(data_levels_bytes[j]*4) // *4 because 4 bits per byte
          pyodide.globals.set("input_bits", data);
          const result = pyodide.runPython("process(input_bits)");
          if (isBinary(result) === false) {
            alert("ERROR: Process function return value invalid")
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
        if (hue > 50) {
          cell.style.color = 'black';
        } else {
          cell.style.color = 'white';
        }
        cell.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        heatmap.appendChild(cell);
      }
    }
    let col_label = document.createElement('div');
    col_label.className = 'cell';
    col_label.style.backgroundColor = 'transparent';
    col_label.style.color = 'black';
    heatmap.appendChild(col_label);
    // Add column labels for data levels
    for (let i = 0; i < 10; i++) {
      const col_label = document.createElement('div');
      col_label.className = 'cell';
      col_label.textContent = data_levels_bytes[i] + ' bytes';
      const gray = Math.round(255 - (i * 25.5));
      if (i < 5) {
        col_label.style.color = 'black';
      } else {
        col_label.style.color = 'white';
      }
      col_label.style.backgroundColor = `rgb(${gray}, ${gray}, ${gray})`;
      heatmap.appendChild(col_label);
    }
    popup_text.textContent = "Done!"
    updateProgress(100)
    result_list.style.display = "flex"
}