const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Appointment = require("../models/Appointment");

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/healthcare-ui";

async function seedAppointments() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);

    console.log("Fetching doctors and patients...");
    const doctors = await User.find({ role: "doctor" });
    const patients = await User.find({ role: "patient" });

    if (doctors.length === 0 || patients.length === 0) {
      console.log(
        "⚠️  No doctors or patients found. Please run seed:all first."
      );
      process.exit(1);
    }

    console.log(`Found ${doctors.length} doctors and ${patients.length} patients`);

    // Clear existing appointments
    await Appointment.deleteMany({});
    console.log("Cleared existing appointments");

    const appointmentData = [];
    const now = new Date();

    // Create appointments for each patient
    patients.forEach((patient, patientIdx) => {
      // Each patient gets 3-5 appointments
      const appointmentCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < appointmentCount; i++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];

        // Mix of past, present, and future appointments
        let appointmentDate;
        if (i === 0) {
          // Next appointment (3-7 days from now)
          appointmentDate = new Date(now.getTime() + (3 + Math.random() * 4) * 24 * 60 * 60 * 1000);
        } else if (i === 1) {
          // Upcoming appointment (8-15 days from now)
          appointmentDate = new Date(now.getTime() + (8 + Math.random() * 7) * 24 * 60 * 60 * 1000);
        } else {
          // Past appointment (1-30 days ago)
          appointmentDate = new Date(now.getTime() - (1 + Math.random() * 29) * 24 * 60 * 60 * 1000);
        }

        const status = appointmentDate < now ? "completed" : "pending";

        appointmentData.push({
          patient: patient._id,
          doctor: doctor._id,
          appointmentDate,
          status,
          notes: `Follow-up for patient health checkup - ${doctor.specialization || 'General'}`,
          prescription: null,
        });
      }
    });

    console.log(`Creating ${appointmentData.length} appointments...`);
    await Appointment.insertMany(appointmentData);

    console.log("✅ Appointments seeded successfully!");
    console.log(`Total appointments created: ${appointmentData.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding appointments:", error);
    process.exit(1);
  }
}

seedAppointments();
