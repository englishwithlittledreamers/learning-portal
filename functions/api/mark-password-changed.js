function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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

export async function onRequestPost(context) {
  const user = await getUserFromBearer(context);

  if (!user || !user.id) {
    return jsonResponse({
      success: false,
      message: "Not authenticated."
    }, 401);
  }

  const response = await fetch(
    `${context.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
    {
      method: "PATCH",
      headers: serviceHeaders(context.env),
      body: JSON.stringify({
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
    }
  );

  if (!response.ok) {
    return jsonResponse({
      success: false,
      message: "Could not update profile."
    }, 500);
  }

  return jsonResponse({
    success: true
  });
}
