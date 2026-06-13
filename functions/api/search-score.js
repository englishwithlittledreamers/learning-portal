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

    if (!studentCode || !lookupPin) {
      return jsonResponse({
        success: false,
        message: "Please enter your student code and PIN."
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

    const resultQuery =
      `test_results?select=created_at,test_code,test_name,course,skill,correct_answers,total_questions,score,wrong_answers,time_spent_seconds` +
      `&student_code=eq.${encodeURIComponent(studentCode)}` +
      `&order=created_at.desc` +
      `&limit=100`;

    const results = await supabaseRequest(context, resultQuery, {
      method: "GET"
    });

    return jsonResponse({
      success: true,
      student: {
        studentCode: student.student_code,
        studentName: student.student_name,
        className: student.class_name
      },
      results
    });

  } catch (error) {
    console.error(error);

    return jsonResponse({
      success: false,
      message: "Server error. Please contact your teacher."
    }, 500);
  }
}
