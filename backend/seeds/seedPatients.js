const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Sample patients
const samplePatients = [
  {
    name: "John Smith",
    email: "john.smith@patient.com",
    password: "password123",
    role: "patient",
  },
  {
    name: "Alice Johnson",
    email: "alice.johnson@patient.com",
    password: "password123",
    role: "patient",
  },
  {
    name: "Robert Brown",
    email: "robert.brown@patient.com",
    password: "password123",
    role: "patient",
  },
];

async function seedPatients() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-ui";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing patient users (optional)
    const result = await User.deleteMany({ role: "patient" });
    console.log(`🗑️  Deleted ${result.deletedCount} existing patients`);

    // Hash passwords and insert patients
    const patientsToInsert = await Promise.all(
      samplePatients.map(async (patient) => ({
        ...patient,
        password: await bcrypt.hash(patient.password, 10),
      }))
    );

    const insertedPatients = await User.insertMany(patientsToInsert);
    console.log(`✅ Successfully added ${insertedPatients.length} sample patients`);

    // Display inserted patients
    console.log("\n📋 Inserted Patients:");
    insertedPatients.forEach((patient) => {
      console.log(`  - ${patient.name}`);
      console.log(`    Email: ${patient.email}`);
    });

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding patients:", error);
    process.exit(1);
  }
}

seedPatients();
