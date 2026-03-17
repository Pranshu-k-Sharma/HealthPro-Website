Place doctor photos here and reference them from the database.

- Recommended size: 400x400 (square), optimized JPG/PNG/WebP.
- File names: use simple, lowercase names like `sarah.jpg`, `michael.png`.

How to reference in the `profilePicture` field (stored in MongoDB):

- Use a relative public path that the frontend can serve, for example:
  `/images/doctors/sarah.jpg`

Notes:
- The frontend serves files in `public/` at the app root. When running the frontend dev server, the example path above resolves to something like `http://localhost:5173/images/doctors/sarah.jpg`.
- After adding files, update each doctor's `profilePicture` in the database to the matching path (or re-run your seeding script with updated paths).

Example update (MongoDB shell / GUI):

db.users.updateOne({ email: "sarah.johnson@doctor.com" }, { $set: { profilePicture: "/images/doctors/sarah.jpg" } })
