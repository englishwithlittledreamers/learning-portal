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

    const password = cleanText(body.password, 200);
    const adminPassword = requireEnv(context, "TEACHER_ADMIN_PASSWORD");

    if (!password || password !== adminPassword) {
      return jsonResponse({
        success: false,
        message: "Incorrect password."
      }, 401);
    }

    const resultQuery =
      `test_results?select=created_at,student_code,student_name,class_name,test_code,test_name,course,skill,correct_answers,total_questions,score,wrong_answers,time_spent_seconds` +
      `&order=created_at.desc` +
      `&limit=500`;

    const results = await supabaseRequest(context, resultQuery, {
      method: "GET"
    });

    return jsonResponse({
      success: true,
      results
    });

  } catch (error) {
    console.error(error);

    return jsonResponse({
      success: false,
      message: "Server error."
    }, 500);
  }
}
