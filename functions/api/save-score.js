const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders
  });
}

function cleanText(value, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function requireEnv(context, name) {
  const value = context.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function supabaseRequest(context, path, options = {}) {
  const SUPABASE_URL = requireEnv(context, "SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = requireEnv(context, "SUPABASE_SERVICE_ROLE_KEY");

  const url = `${SUPABASE_URL}/rest/v1/${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    console.error("Supabase error:", response.status, data);
    throw new Error("Database request failed.");
  }

  return data;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const studentCode = cleanText(body.studentCode, 50);
    const lookupPin = cleanText(body.lookupPin, 50);

    const testCode = cleanText(body.testCode, 80);
    const testName = cleanText(body.testName, 200);
    const course = cleanText(body.course, 100);
    const skill = cleanText(body.skill, 100);

    const correctAnswers = toNumber(body.correctAnswers);
    const totalQuestions = toNumber(body.totalQuestions);
    const score = toNumber(body.score);

    const wrongAnswers = Array.isArray(body.wrongAnswers)
      ? body.wrongAnswers
      : [];

    const answers = body.answers && typeof body.answers === "object"
      ? body.answers
      : {};

    const timeSpentSeconds = body.timeSpentSeconds
      ? Math.max(0, Math.floor(toNumber(body.timeSpentSeconds)))
      : null;

    if (!studentCode || !lookupPin) {
      return jsonResponse({
        success: false,
        message: "Missing student code or PIN."
      }, 400);
    }

    if (!testCode || !testName) {
      return jsonResponse({
        success: false,
        message: "Missing test information."
      }, 400);
    }

    if (!totalQuestions || totalQuestions <= 0) {
      return jsonResponse({
        success: false,
        message: "Invalid total questions."
      }, 400);
    }

    if (correctAnswers < 0 || correctAnswers > totalQuestions) {
      return jsonResponse({
        success: false,
        message: "Invalid score data."
      }, 400);
    }

    const studentQuery =
      `students?select=student_code,student_name,class_name,is_active` +
      `&student_code=eq.${encodeURIComponent(studentCode)}` +
      `&lookup_pin=eq.${encodeURIComponent(lookupPin)}` +
      `&is_active=eq.true`;

    const students = await supabaseRequest(context, studentQuery, {
      method: "GET"
    });

    if (!students || students.length === 0) {
      return jsonResponse({
        success: false,
        message: "Student code or PIN is incorrect."
      }, 403);
    }

    const student = students[0];

    const row = {
      student_code: student.student_code,
      student_name: student.student_name,
      class_name: student.class_name,

      test_code: testCode,
      test_name: testName,
      course: course || null,
      skill: skill || null,

      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      score,

      wrong_answers: wrongAnswers,
      answers,
      time_spent_seconds: timeSpentSeconds
    };

    const inserted = await supabaseRequest(context, "test_results", {
      method: "POST",
      headers: {
        "Prefer": "return=representation"
      },
      body: JSON.stringify(row)
    });

    return jsonResponse({
      success: true,
      message: "Score saved successfully.",
      result: inserted && inserted[0] ? inserted[0] : null
    });

  } catch (error) {
    console.error(error);

    return jsonResponse({
      success: false,
      message: "Server error. Please contact your teacher."
    }, 500);
  }
}
