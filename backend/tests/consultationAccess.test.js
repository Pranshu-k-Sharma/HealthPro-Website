const consultationRoutes = require("../routes/consultationRoutes");

describe("consultation access rules", () => {
  const { getConsultationAccess } = consultationRoutes.__testables;

  const baseAppointmentDate = new Date("2026-03-10T10:00:00.000Z");

  const makeAppointment = (overrides = {}) => ({
    patient: { _id: "patient-1" },
    doctor: { _id: "doctor-1" },
    status: "approved",
    appointmentDate: baseAppointmentDate,
    ...overrides,
  });

  it("allows patient when appointment is approved and within 14 days", () => {
    const appointment = makeAppointment();
    const result = getConsultationAccess(appointment, "patient-1");

    expect(result.allowed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.patientId).toBe("patient-1");
    expect(result.doctorId).toBe("doctor-1");
    expect(result.validUntil).toBeInstanceOf(Date);
  });

  it("denies access for users not part of appointment", () => {
    const appointment = makeAppointment();
    const result = getConsultationAccess(appointment, "random-user");

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.reason).toMatch(/not part of this appointment/i);
  });

  it("denies access when status is pending", () => {
    const appointment = makeAppointment({ status: "pending" });
    const result = getConsultationAccess(appointment, "patient-1");

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.reason).toMatch(/only after appointment acceptance/i);
  });

  it("denies access after 14-day validity window", () => {
    const oldAppointmentDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
    const appointment = makeAppointment({ appointmentDate: oldAppointmentDate });

    const result = getConsultationAccess(appointment, "doctor-1");

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.reason).toMatch(/expired/i);
    expect(result.validUntil).toBeInstanceOf(Date);
  });
});
