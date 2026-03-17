const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const { body, validationResult } = require("express-validator");

const DEFAULT_NOTIFICATION_PREFERENCES = {
  inApp: true,
  email: false,
  sms: false,
  reminder24h: true,
  reminder1h: true,
};

/*
  GET ALL USERS (For fetching doctors)
  GET /api/users
*/
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  SEARCH USERS (Role-aware: Doctors search patients, Patients search doctors)
  GET /api/users/search?q=query&specialization=spec
*/
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { q, specialization } = req.query;
    const userRole = req.user.role;
    
    // If user is a doctor, search for patients; if patient, search for doctors
    const searchRole = userRole === "doctor" ? "patient" : "doctor";
    let query = { role: searchRole };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
      ];
      
      // Add specialization search only for doctors
      if (searchRole === "doctor") {
        query.$or.push({ specialization: { $regex: q, $options: "i" } });
        query.$or.push({ bio: { $regex: q, $options: "i" } });
      }
    }

    if (specialization && searchRole === "doctor") {
      query.specialization = { $regex: specialization, $options: "i" };
    }

    const results = await User.find(query).select("-password");
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  GET FEATURED DOCTORS (Public - no auth required)
  GET /api/users/featured
*/
router.get("/featured", async (req, res) => {
  try {
    // Return all doctors for featured list so seeded doctors are visible
    let doctors = await User.find({ role: "doctor" }).select("-password");

    // Attempt to map profilePicture paths to actual files in frontend public folder
    // (local dev convenience: frontend public images are at ../frontend/public/images/doctors)
    const fs = require("fs");
    const path = require("path");
    const imagesDir = path.resolve(__dirname, "..", "..", "frontend", "public", "images", "doctors");

    doctors = doctors.map((doc) => {
      const docObj = doc.toObject();
      // If no profilePicture, try to infer from name
      const candidates = [];
      if (docObj.profilePicture) {
        // strip leading slash
        candidates.push(path.basename(docObj.profilePicture));
      }
      // Try variations based on name
      const nameOnly = docObj.name.replace(/^Dr\.?\s*/i, "").trim();
      candidates.push(`Dr. ${nameOnly}.jpg`);
      candidates.push(`${nameOnly}.jpg`);
      candidates.push(`${nameOnly.replace(/\s+/g, "%20")}.jpg`);

      for (const file of candidates) {
        const filePath = path.join(imagesDir, file);
        try {
          if (fs.existsSync(filePath)) {
            docObj.profilePicture = `/images/doctors/${file}`;
            break;
          }
        } catch (e) {
          // ignore
        }
      }

      return docObj;
    });

    res.json(doctors);
  } catch (error) {
    console.error("Fetch featured doctors error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  REGISTER
  POST /api/users/register
*/
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { name, email, password, role, specialization, bio, phone, profilePicture } = req.body;

    console.log("Register request received:");
    console.log("  Role:", role);
    console.log("  Has profilePicture:", !!profilePicture);
    if (profilePicture) {
      console.log("  ProfilePicture length:", profilePicture.length);
    }

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // For doctors, specialization is required
    if (role === "doctor" && !specialization) {
      return res.status(400).json({ message: "Specialization is required for doctors" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "patient",
      ...(specialization && { specialization }),
      ...(bio && { bio }),
      ...(phone && { phone }),
      ...(profilePicture && { profilePicture }),
    });

    await newUser.save();

    // On registration, do not auto-login — return created user id
    res.status(201).json({ message: "User registered successfully", id: newUser._id });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/*
  LOGIN
  POST /api/users/login
*/
router.post(
  "/login",
  [body("email").isEmail().withMessage("Valid email is required"), body("password").notEmpty().withMessage("Password is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create refresh token and store on user
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    user.refreshTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens.concat(refreshToken) : [refreshToken];
    await user.save();

    res.json({ token: accessToken, refreshToken });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  GET CURRENT USER PROFILE
  GET /api/users/profile
*/
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  GET USER BY ID (for viewing patient/doctor profile)
  GET /api/users/:id
*/
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  REFRESH TOKEN
  POST /api/users/refresh
  Body: { refreshToken }
*/
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Invalid refresh token - user not found" });

    if (!Array.isArray(user.refreshTokens) || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.json({ token: newAccessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

/*
  LOGOUT (revoke refresh token)
  POST /api/users/logout
  Body: { refreshToken }
*/
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });

  try {
    const payload = jwt.decode(refreshToken);
    if (!payload || !payload.id) return res.status(400).json({ message: "Invalid token" });
    const user = await User.findById(payload.id);
    if (!user) return res.status(200).json({ message: "Logged out" });

    user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
    await user.save();
    res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  UPDATE USER PROFILE
  PUT /api/users/profile
*/
router.put(
  "/profile",
  authMiddleware,
  [
    body("name").optional().isString(),
    body("phone").optional().isString(),
    body("workingHours.start").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body("workingHours.end").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body("slotIntervalMinutes").optional().isIn([15, 20, 30, 60]),
    body("bufferMinutes").optional().isIn([0, 5, 10, 15, 20, 30]),
    body("workingDays").optional().isArray(),
    body("workingDays.*").optional().isIn(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]),
    body("unavailableDates").optional().isArray(),
    body("unavailableDates.*").optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    body("notificationPreferences").optional().isObject(),
    body("notificationPreferences.inApp").optional().isBoolean(),
    body("notificationPreferences.email").optional().isBoolean(),
    body("notificationPreferences.sms").optional().isBoolean(),
    body("notificationPreferences.reminder24h").optional().isBoolean(),
    body("notificationPreferences.reminder1h").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const {
      name,
      bio,
      phone,
      profilePicture,
      specialization,
      qualifications,
      workingHours,
      slotIntervalMinutes,
      bufferMinutes,
      workingDays,
      unavailableDates,
      notificationPreferences,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio) updateData.bio = bio;
    if (phone) updateData.phone = phone;
    if (profilePicture) updateData.profilePicture = profilePicture;
    if (specialization) updateData.specialization = specialization;
    if (qualifications) updateData.qualifications = qualifications;
    if (req.user.role === "doctor") {
      if (workingHours && typeof workingHours === "object") {
        const nextStart = typeof workingHours.start === "string" ? workingHours.start.trim() : null;
        const nextEnd = typeof workingHours.end === "string" ? workingHours.end.trim() : null;
        if (nextStart || nextEnd) {
          const startMinutes = Number((nextStart || "09:00").split(":")[0]) * 60 + Number((nextStart || "09:00").split(":")[1]);
          const endMinutes = Number((nextEnd || "17:30").split(":")[0]) * 60 + Number((nextEnd || "17:30").split(":")[1]);
          if (endMinutes <= startMinutes) {
            return res.status(400).json({ message: "workingHours.end must be after workingHours.start" });
          }
          updateData.workingHours = {
            start: nextStart || "09:00",
            end: nextEnd || "17:30",
          };
        }
      }
      if (slotIntervalMinutes !== undefined) {
        updateData.slotIntervalMinutes = Number(slotIntervalMinutes);
      }
      if (bufferMinutes !== undefined) {
        updateData.bufferMinutes = Number(bufferMinutes);
      }
      if (Array.isArray(workingDays)) {
        const normalizedDays = Array.from(
          new Set(
            workingDays
              .map((value) => String(value || "").trim().toLowerCase())
              .filter((value) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(value))
          )
        );
        if (!normalizedDays.length) {
          return res.status(400).json({ message: "At least one working day is required" });
        }
        updateData.workingDays = normalizedDays;
      }
      if (Array.isArray(unavailableDates)) {
        const normalizedDates = Array.from(
          new Set(
            unavailableDates
              .map((value) => String(value || "").trim())
              .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
          )
        ).sort();
        updateData.unavailableDates = normalizedDates;
      }
    }

    if (notificationPreferences && typeof notificationPreferences === "object") {
      updateData.notificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...notificationPreferences,
      };
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;