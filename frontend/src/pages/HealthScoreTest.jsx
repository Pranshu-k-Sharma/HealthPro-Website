import React, { useState } from "react";
import Layout from "../components/Layout";
import { Activity, Heart, ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function HealthScoreTest() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [score, setScore] = useState(null);
    const [formData, setFormData] = useState({
        age: "",
        gender: "",
        weight: "", // kg
        height: "", // cm
        sleep: "",
        water: "",
        exercise: "",
        stress: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateScore = () => {
        let newScore = 100;

        // BMI Calculation
        const h = parseFloat(formData.height) / 100;
        const w = parseFloat(formData.weight);
        const bmi = w / (h * h);

        if (bmi < 18.5) newScore -= 15;
        else if (bmi >= 25 && bmi <= 29.9) newScore -= 10;
        else if (bmi >= 30) newScore -= 20;

        // Sleep
        const sleep = parseInt(formData.sleep);
        if (sleep < 5) newScore -= 20;
        else if (sleep < 7) newScore -= 10;
        else if (sleep > 9) newScore -= 5;

        // Water
        const water = parseInt(formData.water);
        if (water < 4) newScore -= 15;
        else if (water < 6) newScore -= 5;

        // Exercise
        const exercise = parseInt(formData.exercise);
        if (exercise === 0) newScore -= 20;
        else if (exercise < 3) newScore -= 10;

        // Stress (1-10)
        const stress = parseInt(formData.stress);
        if (stress > 8) newScore -= 20;
        else if (stress > 6) newScore -= 10;

        const finalScore = Math.max(0, newScore);
        localStorage.setItem("localHealthScore", finalScore);

        setScore(finalScore);
        setStep(3); // Result step
    };

    const nextStep = (e) => {
        e.preventDefault();
        if (step === 1) setStep(2);
        else calculateScore();
    };

    const getHealthAdvice = () => {
        const advice = [];
        const h = parseFloat(formData.height) / 100;
        const w = parseFloat(formData.weight);
        const bmi = w / (h * h);

        if (bmi > 30) advice.push("Targeted Action: Your BMI indicates obesity. Prioritize consulting a dietitian for a structured deficit and start with low-impact exercises like walking or swimming daily.");
        else if (bmi > 25) advice.push("Targeted Action: You are slightly above ideal weight. Incorporating 30 minutes of cardio into your everyday routine can tremendously benefit your overall longevity.");
        else if (bmi < 18.5) advice.push("Targeted Action: Your BMI is under average. Focus on eating nutrient-dense foods (nuts, avocados, lean meats) and consider strength training to build healthy muscle mass.");
        else advice.push("Excellent Maintenance: Your Body Mass Index is sitting in the optimal, healthy range! Keep up your current diet structure.");

        const sleep = parseInt(formData.sleep);
        if (sleep < 5) advice.push("Critical Action: Sleeping less than 5 hours disrupts immunity and cognitive function. Adopt a strict bedtime routine prioritizing 7-8 hours immediately.");
        else if (sleep < 7) advice.push("Targeted Action: You're getting slightly less sleep than the recommended 7-8 hours. Try avoiding screens 1 hour before bed to improve your REM cycles.");
        else if (sleep > 9) advice.push("Targeted Action: Oversleeping can sometimes cause lethargy. Ensure your 9+ hours of sleep aren't masking underlying fatigue issues.");
        else advice.push("Excellent Maintenance: You have fantastic sleeping habits. Good quality sleep is the foundation of peak daytime energy.");

        const water = parseInt(formData.water);
        if (water < 4) advice.push("Critical Action: Dehydration warning. Your water intake is very low. Keep a water bottle with you permanently to sip consistently throughout the day.");
        else if (water < 6) advice.push("Targeted Action: You are almost there, but try to force at least 8 glasses of water a day to keep your kidneys functioning efficiently.");
        else advice.push("Excellent Maintenance: Perfect hydration levels. Your body and skin cells are thanking you!");

        const exercise = parseInt(formData.exercise);
        if (exercise === 0) advice.push("Critical Action: Zero exercise increases cardiovascular risks drastically. Start small today—a 15-minute brisk walk or stretching routine around your home.");
        else if (exercise < 3) advice.push("Targeted Action: Increase your activity! Aim for at least 3-4 days of physical workouts—even bodyweight exercises in the living room count.");
        else advice.push("Excellent Maintenance: Your exercise routine is rock solid. Maintaining 3+ workouts a week is a proven method to increase your lifespan.");

        const stress = parseInt(formData.stress);
        if (stress > 8) advice.push("Critical Action: Your stress levels are dangerously high! High cortisol breaks down your body. Practice 10 minutes of deep meditation right now, and seriously consider a digital detox.");
        else if (stress > 6) advice.push("Targeted Action: You are facing moderate-to-high stress. Incorporate mindfulness, slow reading, or yoga into your evening wind-down routine.");

        return advice;
    };

    return (
        <Layout>
            <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors mb-3 sm:mb-4 text-sm sm:text-base font-medium"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1" style={{ color: "#e5e7eb" }}>Health Score Assessment</h1>
                            <p className="text-blue-100 text-base sm:text-lg">Answer a few questions to get a personalized health snapshot</p>
                        </div>
                        <Activity size={48} className="opacity-20" />
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                {step < 3 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
                        {/* Progress */}
                        <div className="mb-8 flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Step {step} of 2</div>
                            <div className="flex gap-2">
                                <div className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                                <div className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                            </div>
                        </div>

                        <form onSubmit={nextStep}>
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in">
                                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Basic Statistics</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                                            <input type="number" name="age" value={formData.age} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="Years" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 bg-white">
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
                                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g., 70" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm)</label>
                                            <input type="number" name="height" value={formData.height} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g., 175" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Lifestyle Habits</h2>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Average Hours of Sleep/Night</label>
                                            <input type="number" name="sleep" value={formData.sleep} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g., 7" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Glasses of Water/Day</label>
                                            <input type="number" name="water" value={formData.water} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g., 8" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Exercise Days per Week</label>
                                            <input type="number" max="7" name="exercise" value={formData.exercise} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g., 3" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Stress Level (1-10)</label>
                                            <input type="number" min="1" max="10" name="stress" value={formData.stress} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="1 = Low, 10 = High" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex justify-between">
                                {step === 2 ? (
                                    <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors">
                                        Back
                                    </button>
                                ) : <div></div>}

                                <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg font-semibold text-lg">
                                    {step === 1 ? "Next Step" : "Generate Report"}
                                    {step === 1 && <ArrowRight size={20} />}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-500">
                        {/* Score Hero */}
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-center relative">
                            <div className={`h-32 ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                            <div className="mx-auto -mt-16 bg-white w-32 h-32 rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10 relative">
                                <span className={`text-4xl font-extrabold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {score}
                                </span>
                                <span className="text-xl text-gray-400 font-bold ml-1">/100</span>
                            </div>
                            <div className="p-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    {score >= 80 ? "Excellent Overall Outlook!" : score >= 60 ? "Good, but room for improvement." : "Critical Action Needed."}
                                </h2>
                                <p className="text-gray-600 text-lg">
                                    {score >= 80 ? "You are doing an incredible job maintaining a balanced, healthy lifestyle! Check your detailed report below to see what you're doing right." : score >= 60 ? "Your overall health score is decent, but taking small actions on your personalized advice below will help push you into the excellent bracket." : "Your health score indicates serious neglect of basic health principles. Please carefully read the critical actions below."}
                                </p>
                            </div>
                        </div>

                        {/* Personalized Advice */}
                        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Heart className="text-red-500" /> Personalized Healthcare Report
                            </h3>
                            <div className="space-y-4">
                                {getHealthAdvice().map((advice, idx) => {
                                    const isCritical = advice.includes("Critical Action");
                                    const isExcellent = advice.includes("Excellent Maintenance");
                                    return (
                                        <div key={idx} className={`flex gap-4 p-4 rounded-xl border ${isCritical ? 'bg-red-50 border-red-200' : isExcellent ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'}`}>
                                            <CheckCircle className={`shrink-0 mt-0.5 ${isCritical ? 'text-red-500' : isExcellent ? 'text-green-500' : 'text-blue-500'}`} />
                                            <p className="text-gray-800 font-medium leading-relaxed">
                                                <strong className={isCritical ? 'text-red-700' : isExcellent ? 'text-green-700' : 'text-blue-800'}>
                                                    {advice.split(':')[0]}:
                                                </strong>
                                                {advice.split(':')[1]}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-8 flex justify-center">
                                <button onClick={() => setStep(1)} className="text-blue-600 font-semibold hover:underline">
                                    Retake Assessment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default HealthScoreTest;
