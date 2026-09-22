const state = { operation: null, jobId: null, pollHandle: null };

const operationTitle = document.getElementById("selectedTool");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const form = document.getElementById("toolForm");
const cards = [...document.querySelectorAll(".tool-card")];
const rangeField = document.getElementById("rangeField");
const rotateField = document.getElementById("rotateField");
const passwordField = document.getElementById("passwordField");

cards.forEach((card) => {
  card.addEventListener("click", () => setOperation(card.dataset.operation));
});

function setOperation(operation) {
  state.operation = operation;
  cards.forEach((card) => card.classList.toggle("active", card.dataset.operation === operation));
  operationTitle.textContent = `Selected tool: ${operation.toUpperCase()}`;
  rangeField.hidden = operation !== "split";
  rotateField.hidden = operation !== "rotate";
  passwordField.hidden = !(operation === "protect" || operation === "unlock");
  setStatus("Ready.");
  setProgress(0);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setProgress(value) {
  progressEl.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

async function submitForm(event) {
  event.preventDefault();
  if (!state.operation) {
    setStatus("Pick a tool first.");
    return;
  }

  const fileInput = document.getElementById("files");
  if (!fileInput.files.length) {
    setStatus("Choose at least one PDF file.");
    return;
  }

  const options = {};
  if (state.operation === "split") options.ranges = document.getElementById("ranges").value;
  if (state.operation === "rotate") options.degrees = Number(document.getElementById("degrees").value);
  if (state.operation === "protect" || state.operation === "unlock") {
    options.password = document.getElementById("password").value;
  }

  const fd = new FormData();
  fd.append("operation", state.operation);
  fd.append("options", JSON.stringify(options));
  [...fileInput.files].forEach((file) => fd.append("files", file));

  setStatus("Uploading and creating job...");
  setProgress(10);

  const response = await fetch("/api/jobs", { method: "POST", body: fd });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    setStatus(payload?.error?.message || "Unable to start processing.");
    setProgress(0);
    return;
  }

  state.jobId = payload.jobId;
  setStatus(`Job ${state.jobId.slice(0, 8)} created.`);
  pollStatus();
}

async function pollStatus() {
  if (!state.jobId) return;
  clearInterval(state.pollHandle);
  state.pollHandle = setInterval(async () => {
    const response = await fetch(`/api/jobs/${state.jobId}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setStatus(payload?.error?.message || "Failed to fetch job status.");
      clearInterval(state.pollHandle);
      return;
    }

    setProgress(payload.progress ?? 0);
    setStatus(`Status: ${payload.status}`);

    if (payload.status === "completed") {
      clearInterval(state.pollHandle);
      setStatus("Done. Downloading result...");
      window.location.assign(payload.downloadUrl);
    }

    if (payload.status === "failed") {
      clearInterval(state.pollHandle);
      setStatus(payload.error || "Job failed.");
    }
  }, 1200);
}

form.addEventListener("submit", submitForm);
