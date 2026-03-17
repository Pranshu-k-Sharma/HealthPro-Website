import { useState } from "react";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const CONTACT_EMAIL = "sharmapranshu136@gmail.com";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSend = (e) => {
    e.preventDefault();

    const subject = `Contact Form - ${formData.name}`;
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    
    const mailtoLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoLink, "_blank");
    
    // Reset form
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="container mt-5 pt-5">
      <h2 className="text-center mb-4">Contact Us</h2>

      <form className="col-md-6 mx-auto" onSubmit={handleSend}>
        <input 
          className="form-control mb-3" 
          placeholder="Your Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
        <input 
          className="form-control mb-3" 
          placeholder="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <textarea 
          className="form-control mb-3" 
          placeholder="Message"
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          required
        ></textarea>
        <button type="submit" className="btn btn-primary w-100">Send</button>
      </form>
    </div>
  );
}

export default Contact;
