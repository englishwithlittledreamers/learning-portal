function getStudentCredentials() {
  const studentCodeInput = document.getElementById("studentCode");
  const lookupPinInput = document.getElementById("lookupPin");

  const studentCode = studentCodeInput ? studentCodeInput.value.trim() : "";
  const lookupPin = lookupPinInput ? lookupPinInput.value.trim() : "";

  return {
    studentCode,
    lookupPin
  };
}

function validateStudentCredentials() {
  const { studentCode, lookupPin } = getStudentCredentials();

  if (!studentCode || !lookupPin) {
    alert("Please enter your student code and PIN before submitting.");
    return false;
  }

  return true;
}

async function saveTestResultToServer(result) {
  const response = await fetch("/api/save-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(result)
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Could not save score.");
  }

  return data;
}

function renderResultBox({
  correctAnswers,
  totalQuestions,
  score,
  wrongAnswers
}) {
  const resultBox = document.getElementById("result");

  if (!resultBox) return;

  resultBox.innerHTML = `
    <div class="result-box">
      <h2>Your Result</h2>
      <p><strong>Correct answers:</strong> ${correctAnswers}/${totalQuestions}</p>
      <p><strong>Score:</strong> ${score}/10</p>
      <p><strong>Wrong answers:</strong> ${
        wrongAnswers && wrongAnswers.length > 0
          ? wrongAnswers.join(", ")
          : "None"
      }</p>
      <p id="saveStatus">Saving your score...</p>
    </div>
  `;
}

function updateSaveStatus(message, type = "success") {
  const saveStatus = document.getElementById("saveStatus");

  if (!saveStatus) return;

  saveStatus.className = type;
  saveStatus.textContent = message;
}
