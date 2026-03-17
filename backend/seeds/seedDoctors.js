const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Sample doctors with local photo references
const sampleDoctors = [
  {
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@doctor.com",
    password: "password123",
    role: "doctor",
    specialization: "Cardiologist",
    experience: 8,
    phone: "+1-555-0101",
    bio: "Experienced cardiologist with 8 years of practice in cardiac care and management.",
    profilePicture: "/images/doctors/sarah.jpg",
    qualifications: ["MD", "Board Certified in Cardiology", "Fellowship in Clinical Cardiology"],
  },
  {
    name: "Dr. Michael Chen",
    email: "michael.chen@doctor.com",
    password: "password123",
    role: "doctor",
    specialization: "Dentist",
    experience: 10,
    phone: "+1-555-0102",
    bio: "General dentist specializing in cosmetic and restorative dentistry with 10 years experience.",
    profilePicture: "/images/doctors/michael.jpg",
    qualifications: ["DDS", "Board Certified Dentist", "Cosmetic Dentistry Specialist"],
  },
  {
    name: "Dr. Emily Williams",
    email: "emily.williams@doctor.com",
    password: "password123",
    role: "doctor",
    specialization: "Pediatrician",
    experience: 6,
    phone: "+1-555-0103",
    bio: "Dedicated pediatrician focused on child health, development, and preventive care.",
    profilePicture: "/images/doctors/emily.jpg",
    qualifications: ["MD", "Board Certified in Pediatrics", "Child Development Specialist"],
  },
  {
    name: "Dr. James Rodriguez",
    email: "james.rodriguez@doctor.com",
    password: "password123",
    role: "doctor",
    specialization: "Neurologist",
    experience: 12,
    phone: "+1-555-0104",
    bio: "Board-certified neurologist with expertise in neurological disorders and treatment.",
    profilePicture: "/images/doctors/james.jpg",
    qualifications: ["MD", "Board Certified in Neurology", "Advanced Neuro Imaging"],
  },
  {
    name: "Dr. Lisa Anderson",
    email: "lisa.anderson@doctor.com",
    password: "password123",
    role: "doctor",
    specialization: "General Practitioner",
    experience: 7,
    phone: "+1-555-0105",
    bio: "Primary care physician providing comprehensive health services and wellness programs.",
    profilePicture: "/images/doctors/lisa.jpg",
    qualifications: ["MD", "Board Certified Family Medicine", "Preventive Care Specialist"],
  },
];

async function seedDoctors() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-ui";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing doctor users (optional)
    const result = await User.deleteMany({ role: "doctor" });
    console.log(`🗑️  Deleted ${result.deletedCount} existing doctors`);

    // Hash passwords and insert doctors
    const doctorsToInsert = await Promise.all(
      sampleDoctors.map(async (doctor) => ({
        ...doctor,
        password: await bcrypt.hash(doctor.password, 10),
      }))
    );

    const insertedDoctors = await User.insertMany(doctorsToInsert);
    console.log(`✅ Successfully added ${insertedDoctors.length} sample doctors`);

    // Display inserted doctors
    console.log("\n📋 Inserted Doctors:");
    insertedDoctors.forEach((doc) => {
      console.log(`  - ${doc.name} (${doc.specialization})`);
      console.log(`    Email: ${doc.email}`);
      console.log(`    Photo: ${doc.profilePicture.substring(0, 50)}...`);
    });

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding doctors:", error);
    process.exit(1);
  }
}

seedDoctors();
