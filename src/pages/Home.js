import React from "react";
import doctor1 from "../assets/doctor1.png";
import doctor2 from "../assets/doctor2.png";
import doctor3 from "../assets/doctor3.png";
import Chatbot from "../components/Chatbot";

export default function Home() {
  return (
    <>
      {/* HERO / CAROUSEL SECTION */}
      <div className="hero-section">
        <div
          id="healthCarousel"
          className="carousel slide"
          data-bs-ride="carousel"
        >
          <div className="carousel-inner">

            <div className="carousel-item active">
              <div className="carousel-overlay"></div>
              <img
                src={doctor1}
                className="d-block mx-auto carousel-img"
                alt="Doctor consulting patient"
              />
              <div className="carousel-caption d-none d-md-block">
                <h3>Personal Doctor Consultation</h3>
                <p>
                  One-on-one consultations focused on understanding your health
                  and needs.
                </p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="carousel-overlay"></div>
              <img
                src={doctor2}
                className="d-block mx-auto carousel-img"
                alt="Medical staff helping patients"
              />
              <div className="carousel-caption d-none d-md-block">
                <h3>Support at Every Step</h3>
                <p>
                  Our trained staff ensures comfort, guidance, and care
                  throughout your visit.
                </p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="carousel-overlay"></div>
              <img
                src={doctor3}
                className="d-block mx-auto carousel-img"
                alt="Doctors and staff team"
              />
              <div className="carousel-caption d-none d-md-block">
                <h3>A Team You Can Trust</h3>
                <p>
                  Experienced doctors and dedicated staff committed to
                  excellence in healthcare.
                </p>
              </div>
            </div>

          </div>

          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#healthCarousel"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon"></span>
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#healthCarousel"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon"></span>
          </button>
        </div>
      </div>

      {/* HEALTH TIPS */}
      <section className="health-section container my-5">
        <h2 className="text-center mb-4">How to Keep Yourself Healthy</h2>

        <div className="row text-center">
          <div className="col-md-4">
            <h5>🥗 Eat Healthy</h5>
            <p>
              Maintain a balanced diet with fruits, vegetables, and proteins.
            </p>
          </div>

          <div className="col-md-4">
            <h5>🏃 Stay Active</h5>
            <p>
              Regular exercise improves both physical and mental health.
            </p>
          </div>

          <div className="col-md-4">
            <h5>🛌 Proper Rest</h5>
            <p>
              Good sleep helps your body recover and stay energetic.
            </p>
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="articles-section bg-light py-5">
        <div className="container">
          <h2 className="text-center mb-4">Health Articles</h2>

          <ul className="list-group">
            <li className="list-group-item">
              <a
                href="https://www.who.int"
                target="_blank"
                rel="noreferrer"
              >
                World Health Organization – Health Tips
              </a>
            </li>

            <li className="list-group-item">
              <a
                href="https://www.healthline.com"
                target="_blank"
                rel="noreferrer"
              >
                Healthline – Nutrition & Fitness
              </a>
            </li>

            <li className="list-group-item">
              <a
                href="https://www.nhs.uk"
                target="_blank"
                rel="noreferrer"
              >
                NHS – Medical Guidance
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* CHATBOT */}
      <Chatbot />
    </>
  );
}
