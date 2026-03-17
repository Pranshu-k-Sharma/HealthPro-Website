import React from "react";
import { Star, MapPin, Calendar, MessageSquare } from "lucide-react";

function DoctorCard({ doctor, compact = false, onBook = null }) {
  // Generate avatar from initials if no profile picture
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const initials = getInitials(doctor.name);
  const profileImage = doctor.profilePicture;

  if (compact) {
    // Compact card for featured doctors on login
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-white/40 group cursor-pointer">
        {/* Avatar */}
        <div className="flex justify-center mb-4 flex-shrink-0">
          {profileImage ? (
            <img
              src={profileImage}
              alt={doctor.name}
              className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full object-cover object-center border-4 border-blue-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-2xl border-4 border-[#E6F9F4] shadow-card">
              {initials}
            </div>
          )}
        </div>

        {/* Doctor Info */}
        <h3 className="text-lg font-bold text-gray-800 text-center">{doctor.name}</h3>

        {doctor.specialization && (
          <p className="text-sm text-blue-600 font-semibold text-center mt-1">
            {doctor.specialization}
          </p>
        )}

        {/* Experience Badge */}
        {doctor.experience > 0 && (
          <div className="flex justify-center mt-3">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
              {doctor.experience}+ years
            </span>
          </div>
        )}

        {/* Bio */}
        {doctor.bio && (
          <p className="text-xs text-gray-600 text-center mt-3 line-clamp-2">
            {doctor.bio}
          </p>
        )}

        {/* Action Button */}
        {onBook && (
          <button
            onClick={onBook}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all text-sm"
          >
            Book Appointment
          </button>
        )}
      </div>
    );
  }

  // Full card for detailed view
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-200">
      {/* Header with background */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-24"></div>

      <div className="px-6 pb-6">
        {/* Avatar overlapping header */}
        <div className="flex justify-center -mt-12 mb-4 flex-shrink-0">
          {profileImage ? (
            <img
              src={profileImage}
              alt={doctor.name}
              className="w-24 h-24 min-w-[96px] min-h-[96px] rounded-full object-cover object-center border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-card">
              {initials}
            </div>
          )}
        </div>

        {/* Doctor Details */}
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          Dr. {doctor.name}
        </h2>

        {doctor.specialization && (
          <p className="text-center text-blue-600 font-semibold mt-1">
            {doctor.specialization}
          </p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {doctor.experience > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Calendar size={18} className="text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Experience</p>
              <p className="text-lg font-bold text-blue-600">
                {doctor.experience}+
              </p>
            </div>
          )}

          {doctor.phone && (
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <MessageSquare size={18} className="text-green-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Contact</p>
              <p className="text-xs font-semibold text-green-600 truncate">
                {doctor.phone}
              </p>
            </div>
          )}
        </div>

        {/* Bio */}
        {doctor.bio && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">{doctor.bio}</p>
          </div>
        )}

        {/* Qualifications */}
        {doctor.qualifications && doctor.qualifications.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-brand-blue mb-2">Qualifications</h4>
            <div className="flex flex-wrap gap-2">
              {doctor.qualifications.map((qual, idx) => (
                <span
                  key={idx}
                  className="bg-[#E6F9F4] text-brand-green px-3 py-1 rounded-full text-xs font-semibold border border-brand-border"
                >
                  {qual}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {onBook && (
          <button
            onClick={onBook}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Book Appointment
          </button>
        )}
      </div>
    </div>
  );
}

export default DoctorCard;
