import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  RSVP_WHATSAPP_NUMBER,
} from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const form = document.querySelector("#rsvp-form");
const status = document.querySelector(".rsvp-submit-status");
const submitButton = form?.querySelector(".rsvp-submit");
const attendanceSelect = form?.querySelector('[name="attending"]');
const attendanceRadios = form?.querySelectorAll('[name="attendance"]');

if (form && status && submitButton) {
  const syncAttendanceChoice = () => {
    const declined = form.querySelector('[name="attendance"]:checked')?.value === "Regretfully decline";
    attendanceSelect.disabled = declined;
    attendanceSelect.setAttribute("aria-disabled", String(declined));
  };

  attendanceRadios?.forEach((radio) => radio.addEventListener("change", syncAttendanceChoice));
  syncAttendanceChoice();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    status.classList.remove("is-error", "is-success");

    if (!form.reportValidity()) return;

    const values = new FormData(form);
    const attendance = String(values.get("attendance") || "");
    const eventAttendance = attendance === "Regretfully decline"
      ? "not-attending"
      : String(values.get("attending") || "service-reception");

    const guest = {
      guest_name: String(values.get("name") || "").trim(),
      phone_number: String(values.get("phone") || "").trim(),
      attendance,
      event_attendance: eventAttendance,
      note: String(values.get("note") || "").trim() || null,
    };

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";

    try {
      const { error } = await supabase.from("wedding_rsvps").insert(guest);
      if (error) throw error;

      const eventLabel = {
        "service-reception": "Service & reception",
        "wedding-service-only": "Wedding service only",
        "reception-only": "Reception only",
        "not-attending": "Not attending",
      }[eventAttendance];

      const message = [
        "New Balerie wedding RSVP",
        "",
        `Name: ${guest.guest_name}`,
        `Phone: ${guest.phone_number}`,
        `Response: ${attendance}`,
        `Attendance: ${eventLabel}`,
        guest.note ? `Message: ${guest.note}` : "",
      ].filter(Boolean).join("\n");

      status.textContent = "Your RSVP has been saved. Opening WhatsApp so you can send the couple a copy…";
      status.classList.add("is-success");
      form.reset();
      syncAttendanceChoice();

      const whatsappUrl = `https://wa.me/${RSVP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.location.assign(whatsappUrl);
    } catch (error) {
      console.error("RSVP submission failed:", error);
      status.textContent = "We couldn't save your RSVP. Please check your connection and try again, or contact the numbers above.";
      status.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send RSVP";
    }
  });
}
