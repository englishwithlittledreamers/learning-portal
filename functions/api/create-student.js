function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength = 200) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, maxLength);
}

function normalizeStudentCode(value) {
  return cleanText(value, 50).toUpperCase();
}

function studentCodeToEmail(studentCode) {
  return `${studentCode.toLowerCase()}@students.englishwithlittledreamers.com`;
}

function serviceHeaders(env, extra = {}) {
  const headers = {
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...extra
  };

  if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;
  }

  return headers;
}

async function getUserFromBearer(context) {
  const authHeader = context.request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) return null;

  const response = await fetch(`${context.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "apikey": context.env.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) return null;

  return await response.json();
}

async function getProfile(context, userId) {
  const url =
    `${context.env.SUPABASE_URL}/rest/v1/profiles` +
    `?select=id,role,full_name,is_active` +
    `&id=eq.${encodeURIComponent(userId)}` +
    `&limit=1`;

  const response = await fetch(url, {
    headers: serviceHeaders(context.env)
  });

  if (!response.ok) return null;

  const rows = await response.json();
  return rows && rows[0] ? rows[0] : null;
}

async function requireTeacher(context) {
  const user = await getUserFromBearer(context);

  if (!user || !user.id) {
    return null;
  }

  const profile = await getProfile(context, user.id);

  if (!profile || profile.role !== "teacher" || !profile.is_active) {
    return null;
  }

  return {
    user,
    profile
  };
}

export async function onRequestPost(context) {
  try {
    const teacher = await requireTeacher(context);

    if (!teacher) {
      return jsonResponse({
        success: false,
        message: "Teacher access required."
      }, 403);
    }

    const body = await context.request.json();

    const studentCode = normalizeStudentCode(body.studentCode);
    const fullName = cleanText(body.fullName, 200);
    const classId = cleanText(body.classId, 100);
    const initialPassword = cleanText(body.initialPassword, 200);

    if (!studentCode || !fullName || !classId || !initialPassword) {
      return jsonResponse({
        success: false,
        message: "Missing student information."
      }, 400);
    }

    if (initialPassword.length < 8) {
      return jsonResponse({
        success: false,
        message: "Initial password should be at least 8 characters."
      }, 400);
    }

    const email = studentCodeToEmail(studentCode);

    const createUserResponse = await fetch(
      `${context.env.SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders(context.env),
        body: JSON.stringify({
          email,
          password: initialPassword,
          email_confirm: true,
          user_metadata: {
            role: "student",
            student_code: studentCode,
            full_name: fullName
          }
        })
      }
    );

    const createdUser = await createUserResponse.json();

    if (!createUserResponse.ok) {
      return jsonResponse({
        success: false,
        message: createdUser.message || "Could not create auth user."
      }, 400);
    }

    const userId = createdUser.id;

    const profileResponse = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/profiles`,
      {
        method: "POST",
        headers: serviceHeaders(context.env, {
          "Prefer": "return=representation"
        }),
        body: JSON.stringify({
          id: userId,
          role: "student",
          student_code: studentCode,
          full_name: fullName,
          class_id: classId,
          must_change_password: true,
          is_active: true
        })
      }
    );

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      return jsonResponse({
        success: false,
        message: profileData.message || "Auth user created, but profile could not be created."
      }, 500);
    }

    return jsonResponse({
      success: true,
      student: profileData[0]
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message || "Server error."
    }, 500);
  }
}
