import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboard = document.querySelector("#dashboard");
const dashboardMessage = document.querySelector("#dashboard-message");
const rows = document.querySelector("#guest-rows");
let allRsvps = [];

const eventLabels = {
  "service-reception": "Service & reception",
  "wedding-service-only": "Wedding service only",
  "reception-only": "Reception only",
  "not-attending": "Not attending",
};

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function render() {
  const search = document.querySelector("#search").value.trim().toLowerCase();
  const attendanceFilter = document.querySelector("#filter-attendance").value;
  const eventFilter = document.querySelector("#filter-event").value;
  const filtered = allRsvps.filter((guest) => {
    const matchesSearch = !search || [guest.guest_name, guest.phone_number, guest.note]
      .some((value) => String(value || "").toLowerCase().includes(search));
    return matchesSearch
      && (attendanceFilter === "all" || guest.attendance === attendanceFilter)
      && (eventFilter === "all" || guest.event_attendance === eventFilter);
  });

  rows.innerHTML = filtered.length ? filtered.map((guest) => {
    const accepted = guest.attendance === "Joyfully accept";
    const date = new Date(guest.created_at).toLocaleString(undefined, {
      dateStyle: "medium", timeStyle: "short",
    });
    return `<tr>
      <td>${escapeHtml(guest.guest_name)}</td>
      <td>${escapeHtml(guest.phone_number)}</td>
      <td><span class="pill ${accepted ? "yes" : "no"}">${accepted ? "Accepting" : "Declining"}</span></td>
      <td>${escapeHtml(eventLabels[guest.event_attendance] || guest.event_attendance)}</td>
      <td>${escapeHtml(guest.note || "—")}</td>
      <td>${escapeHtml(date)}</td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="empty">No matching RSVPs yet.</td></tr>';
}

function updateStats() {
  const accepted = allRsvps.filter((guest) => guest.attendance === "Joyfully accept");
  const declined = allRsvps.filter((guest) => guest.attendance === "Regretfully decline");
  document.querySelector("#stat-total").textContent = allRsvps.length;
  document.querySelector("#stat-yes").textContent = accepted.length;
  document.querySelector("#stat-no").textContent = declined.length;
  document.querySelector("#stat-attending").textContent = accepted.length;
}

async function loadRsvps() {
  showMessage(dashboardMessage, "");
  rows.innerHTML = '<tr><td colspan="6" class="empty">Loading responses…</td></tr>';
  const { data, error } = await supabase
    .from("wedding_rsvps")
    .select("id,guest_name,phone_number,attendance,event_attendance,note,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    showMessage(dashboardMessage, `Could not load RSVPs: ${error.message}`);
    rows.innerHTML = '<tr><td colspan="6" class="empty">Unable to load responses.</td></tr>';
    return;
  }
  allRsvps = data || [];
  updateStats();
  render();
  document.querySelector("#last-updated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(loginMessage, "");
  const button = document.querySelector("#login-button");
  button.disabled = true;
  button.textContent = "Signing in…";
  const values = new FormData(loginForm);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(values.get("email") || "").trim(),
    password: String(values.get("password") || ""),
  });
  button.disabled = false;
  button.textContent = "Sign in";
  if (error) {
    showMessage(loginMessage, error.message);
    return;
  }
  if (data.user?.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    showMessage(loginMessage, "This account has not been authorised to access the Balerie dashboard.");
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadRsvps();
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  dashboard.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
});

document.querySelector("#refresh").addEventListener("click", loadRsvps);
document.querySelector("#search").addEventListener("input", render);
document.querySelector("#filter-attendance").addEventListener("change", render);
document.querySelector("#filter-event").addEventListener("change", render);

document.querySelector("#export-csv").addEventListener("click", () => {
  const headers = ["Guest name", "Phone", "Response", "Attendance", "Note", "Submitted at"];
  const records = allRsvps.map((guest) => [
    guest.guest_name, guest.phone_number, guest.attendance,
    eventLabels[guest.event_attendance] || guest.event_attendance,
    guest.note || "", guest.created_at,
  ]);
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...records].map((record) => record.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "balerie-rsvp-guests.csv";
  link.click();
  URL.revokeObjectURL(url);
});

const { data: { session } } = await supabase.auth.getSession();
if (session?.user?.app_metadata?.role === "admin") {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadRsvps();
} else if (session) {
  await supabase.auth.signOut();
}
