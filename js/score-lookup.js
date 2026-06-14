async function searchScores() {
  const studentCode = document.getElementById("lookupStudentCode").value.trim();
  const lookupPin = document.getElementById("lookupPin").value.trim();
  const container = document.getElementById("scoreResults");

  if (!studentCode || !lookupPin) {
    alert("Please enter your student code and PIN.");
    return;
  }

  container.innerHTML = "<p>Loading scores...</p>";

  try {
    const response = await fetch("/api/search-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentCode,
        lookupPin
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      container.innerHTML = `
        <div class="result-box">
          <p class="error">${data.message || "Could not find scores."}</p>
        </div>
      `;
      return;
    }

    if (!data.results || data.results.length === 0) {
      container.innerHTML = `
        <div class="result-box">
          <h2>${data.student.studentName}</h2>
          <p>Class: ${data.student.className}</p>
          <p>No test results found yet.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-box">
        <h2>${data.student.studentName}</h2>
        <p><strong>Student code:</strong> ${data.student.studentCode}</p>
        <p><strong>Class:</strong> ${data.student.className}</p>
      </div>

      <table class="score-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Test</th>
            <th>Course</th>
            <th>Skill</th>
            <th>Correct</th>
            <th>Score</th>
            <th>Wrong Answers</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.results.forEach(row => {
      const date = new Date(row.created_at).toLocaleString();

      const wrongAnswers = Array.isArray(row.wrong_answers)
        ? row.wrong_answers.join(", ")
        : "";

      html += `
        <tr>
          <td>${date}</td>
          <td>${row.test_name}</td>
          <td>${row.course || ""}</td>
          <td>${row.skill || ""}</td>
          <td>${row.correct_answers}/${row.total_questions}</td>
          <td>${row.score}/10</td>
          <td>${wrongAnswers || "None"}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="result-box">
        <p class="error">Server error. Please try again later.</p>
      </div>
    `;
  }
}
