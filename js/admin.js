let latestAdminResults = [];

async function loadAdminResults() {
  const password = document.getElementById("teacherPassword").value.trim();
  const container = document.getElementById("adminResults");

  if (!password) {
    alert("Please enter teacher password.");
    return;
  }

  container.innerHTML = "<p>Loading results...</p>";

  try {
    const response = await fetch("/api/admin-results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      container.innerHTML = `
        <div class="result-box">
          <p class="error">${data.message || "Could not load results."}</p>
        </div>
      `;
      return;
    }

    latestAdminResults = data.results || [];

    if (latestAdminResults.length === 0) {
      container.innerHTML = `
        <div class="result-box">
          <p>No results found.</p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="score-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Code</th>
            <th>Class</th>
            <th>Test</th>
            <th>Skill</th>
            <th>Correct</th>
            <th>Score</th>
            <th>Wrong Answers</th>
          </tr>
        </thead>
        <tbody>
    `;

    latestAdminResults.forEach(row => {
      const wrongAnswers = Array.isArray(row.wrong_answers)
        ? row.wrong_answers.join(", ")
        : "";

      html += `
        <tr>
          <td>${new Date(row.created_at).toLocaleString()}</td>
          <td>${row.student_name}</td>
          <td>${row.student_code}</td>
          <td>${row.class_name}</td>
          <td>${row.test_name}</td>
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
        <p class="error">Server error.</p>
      </div>
    `;
  }
}

function downloadCsv() {
  if (!latestAdminResults || latestAdminResults.length === 0) {
    alert("Please load results first.");
    return;
  }

  const headers = [
    "Date",
    "Student Name",
    "Student Code",
    "Class",
    "Test Code",
    "Test Name",
    "Course",
    "Skill",
    "Correct Answers",
    "Total Questions",
    "Score",
    "Wrong Answers",
    "Time Spent Seconds"
  ];

  const rows = latestAdminResults.map(row => {
    const wrongAnswers = Array.isArray(row.wrong_answers)
      ? row.wrong_answers.join(" | ")
      : "";

    return [
      new Date(row.created_at).toLocaleString(),
      row.student_name,
      row.student_code,
      row.class_name,
      row.test_code,
      row.test_name,
      row.course || "",
      row.skill || "",
      row.correct_answers,
      row.total_questions,
      row.score,
      wrongAnswers,
      row.time_spent_seconds || ""
    ];
  });

  const csvContent = [
    headers,
    ...rows
  ]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "test-results.csv";
  link.click();

  URL.revokeObjectURL(url);
}
