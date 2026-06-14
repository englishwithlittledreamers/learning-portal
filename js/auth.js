async function getCurrentUserAndProfile() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData || !userData.user) {
    return {
      user: null,
      profile: null
    };
  }

  const user = userData.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, role, student_code, full_name, class_id, must_change_password, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return {
      user,
      profile: null
    };
  }

  return {
    user,
    profile
  };
}

async function requireRole(allowedRoles) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user || !profile) {
    window.location.href = "/login.html";
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    alert("You do not have permission to access this page.");

    if (profile.role === "student") {
      window.location.href = "/student/dashboard.html";
    } else if (profile.role === "teacher") {
      window.location.href = "/teacher/dashboard.html";
    } else {
      window.location.href = "/login.html";
    }

    return null;
  }

  return {
    user,
    profile
  };
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/login.html";
}
