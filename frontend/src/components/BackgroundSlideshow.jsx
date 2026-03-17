import React, { useEffect, useState } from "react";

const defaultImages = [
  "/images/doctors/Dr. Sarah Johnson.jpg",
  "/images/doctors/Dr. Lisa Anderson.jpg",
  "/images/doctors/Dr. James Rodriguez.jpg",
  "/images/doctors/Dr. Emily Williams.jpg",
  "/images/doctors/Dr. Michael Chen.jpg",
];

function BackgroundSlideshow({ images = defaultImages, interval = 4000, className = "rounded-3xl overflow-hidden" }) {
  const [index, setIndex] = useState(0);

  // Default captions (title + short description) matching defaultImages order
  const defaultCaptions = [
    { title: "Expert Physicians", desc: "Board-certified specialists across major fields." },
    { title: "Advanced Diagnostics", desc: "On-site labs and imaging for fast results." },
    { title: "Patient-Centered Care", desc: "Holistic plans tailored to each patient." },
    { title: "24/7 Support", desc: "Round-the-clock assistance and telemedicine." },
    { title: "Modern Facilities", desc: "Comfortable, safe, and accessible clinics." },
  ];

  const captions = images === defaultImages ? defaultCaptions : images.map(() => ({ title: "Our Services", desc: "Quality care from experienced teams." }));

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  return (
    <div className={`relative w-full max-w-2xl aspect-[4/3] min-h-[200px] mx-auto ${className}`}>
      {images.map((src, i) => (
        <div key={src + i} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}>
          <img src={src} alt={`slide-${i}`} className="w-full h-full object-cover object-[center_25%]" />

          {/* Caption overlay */}
          <div className="absolute left-5 sm:left-5 bottom-4 sm:bottom-5 md:bottom-6 bg-black/50 text-white rounded-lg px-4 py-3 max-w-xs">
            <h4 className="font-semibold text-lg text-brand-green">{captions[i]?.title}</h4>
            <p className="text-sm mt-1">{captions[i]?.desc}</p>
          </div>
        </div>
      ))}

      {/* Gradient to make text readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Indicators */}
      <div className="absolute right-4 bottom-4 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-3 h-3 rounded-full transition-all ${i === index ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default BackgroundSlideshow;
