// app.js

import { LABELS_JSON, RULES_JSON, loadJSON, evaluateRules, formatResult } from "../inference engine/inference_engine.js"; 
// Catatan: Pastikan inference_engine.js dapat dijangkau dari app.js. Sesuaikan path jika perlu.

let symptoms = {}, rules = [], labels = {};
let certaintyValues = [];

async function init() {
    const container = document.getElementById("questions");
    try {
        // 1. Muat Data dari Inference Engine
        labels = await loadJSON(LABELS_JSON);
        symptoms = labels.symptoms;
        rules = await loadJSON(RULES_JSON);
        
        // Opsi CF untuk radio button
        certaintyValues = labels.certainty_options || [
            { value: 0.0, text: "Tidak" }, 
            { value: 0.2, text: "Sedikit Yakin (20%)" },
            { value: 0.4, text: "Cukup Yakin (40%)" },
            { value: 0.6, text: "Yakin (60%)" },
            { value: 0.8, text: "Sangat Yakin (80%)" },
            { value: 1.0, text: "Pasti (100%)" }
        ]; 
        
        container.innerHTML = "";
        
        // 2. Buat Elemen Pertanyaan Dinamis
        for (const [code, symptom] of Object.entries(symptoms)) {
            const qDiv = document.createElement("div");
            qDiv.className = "question";

            const sympLabel = document.createElement("label");
            sympLabel.className = "symptom";
            sympLabel.textContent = `${code}. ${symptom}`;
            qDiv.appendChild(sympLabel);

            const optionsDiv = document.createElement("div");
            optionsDiv.className = "options";
            
            certaintyValues.forEach(({value, text}) => {
                const id = `${code}_${value}`;
                
                const input = document.createElement("input");
                input.type = "radio";
                input.id = id;
                input.name = code;
                input.value = value.toFixed(1);
                input.className = "option-input";
                
                if (value === 0.0) {
                    input.checked = true;
                }
                
                const label = document.createElement("label");
                label.htmlFor = id;
                label.className = "option-label";
                label.textContent = text;
                
                optionsDiv.appendChild(input);
                optionsDiv.appendChild(label);
            });
            
            qDiv.appendChild(optionsDiv);
            container.appendChild(qDiv);
        }
        
        // 3. Setup Listener Modal
        setupModalListeners(); 

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = 
            `<div class="error" style="text-align:center; color:red;">Gagal memuat data: ${error.message}. Pastikan file JSON ada di folder 'Rule' dan path di inference_engine.js sudah benar.</div>`;
    }
}

async function onDiagnose() {
    try {
        const userCF = {};
        
        // Kumpulkan Input Pengguna
        for (const code of Object.keys(symptoms)) {
          const selectedOption = document.querySelector(`input[name="${code}"]:checked`);
          userCF[code] = selectedOption ? Number(selectedOption.value) : 0; 
        }

        // Evaluasi dengan Inference Engine
        const results = evaluateRules(rules, userCF);
        const formattedResults = formatResult(results, labels.diseases);
        
        // Tampilkan Hasil di Modal
        const modalContent = document.getElementById("modalResultContent");
        modalContent.innerHTML = "";
        
        if (formattedResults.length === 0) {
          modalContent.innerHTML = "<p>Tidak dapat menentukan diagnosis berdasarkan gejala yang dipilih.</p>";
        } else {
          formattedResults.forEach(result => {
            modalContent.innerHTML += `
              <div class="result-item">
                <strong>Penyakit:</strong> ${result.penyakit}<br>
                <strong>Nilai CF:</strong> ${result.cf.toFixed(3)}<br>
                <strong>Persentase:</strong> ${result.percentage}%<br>
                <strong>Interpretasi:</strong> ${result.interpretation}
              </div>`;
          });
        }
        
        document.getElementById("resultModal").style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
        console.error("Error in diagnosis:", error);
        document.getElementById("modalResultContent").innerHTML = 
          `<div class="error" style="color:red;">Terjadi kesalahan: ${error.message}</div>`;
        document.getElementById("resultModal").style.display = "block";
      }
}

function setupModalListeners() {
    const modal = document.getElementById("resultModal");
    const span = document.getElementsByClassName("close-btn")[0];

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function onReset() {
    Object.keys(symptoms).forEach(code => {
        const defaultOption = document.querySelector(`input[name="${code}"][value="0.0"]`);
        if (defaultOption) {
            defaultOption.checked = true;
        }
    });   
    
    document.getElementById("resultModal").style.display = "none";
    document.getElementById("modalResultContent").innerHTML = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Listener Utama
window.onDiagnose = onDiagnose;
window.onReset = onReset;
window.addEventListener("load", init);