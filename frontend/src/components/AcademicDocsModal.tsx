import React, { useState } from 'react';
import { X, BookOpen, Layers, Cpu, Database, Compass, Award, CheckCircle2, ChevronRight } from 'lucide-react';

interface AcademicDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcademicDocsModal: React.FC<AcademicDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('1');

  if (!isOpen) return null;

  const sections = [
    { id: '1', title: '1. Introduction', icon: BookOpen },
    { id: '2', title: '2. Problem Statement', icon: BookOpen },
    { id: '3', title: '3. Primary Objectives', icon: CheckCircle2 },
    { id: '4', title: '4. System Overview', icon: Layers },
    { id: '5', title: '5. Technology Stack', icon: Cpu },
    { id: '6', title: '6. System Architecture', icon: Layers },
    { id: '7', title: '7. Proposed Methodology', icon: Compass },
    { id: '8', title: '8. Use Case & ER Design', icon: Database },
    { id: '9', title: '9. AI & Mobility Algorithms', icon: Cpu },
    { id: '10', title: '10. Outcomes & Impact', icon: Award },
    { id: '11', title: '11. IEEE References (2025-2026)', icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-between border-b border-orange-400">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-orange-400 uppercase tracking-widest">
              <BookOpen className="w-4 h-4" />
              <span>Project Viva & Presentation Defense Resource</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              VendorSaathi: Project Specifications & Research Foundations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Dual Pane: Left Menu & Right Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Navigation */}
          <div className="w-full md:w-72 bg-orange-50/50 border-r border-orange-100 p-4 overflow-y-auto space-y-1">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-bold transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{sec.title}</span>
                  </div>
                  {isSelected && <ChevronRight className="w-4 h-4" />}
                </button>
              );
            })}
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-sm leading-relaxed">
            
            {activeSection === '1' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="relative rounded-3xl overflow-hidden shadow-lg border border-orange-200">
                  <img 
                    src="/vendorsathi_hero.jpg" 
                    alt="VendorSaathi Mobile Street Commerce" 
                    className="w-full h-52 sm:h-64 object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                    <div className="flex items-center space-x-3 text-white">
                      <img 
                        src="/vendorsathi_logo.jpg" 
                        alt="Logo" 
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-md" 
                      />
                      <div>
                        <h4 className="font-black text-base drop-shadow">VendorSaathi (ವೆಂಡರ್‌ಸಾಥಿ)</h4>
                        <p className="text-xs text-orange-200 font-medium">Digital Operating System for Indian Street & Village Push-Cart Vendors</p>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 border-b pb-2">1. INTRODUCTION</h3>
                <p><strong>Why VendorSaathi?</strong></p>
                <p>
                  Local, street, and rural vendors (selling on push carts, mopeds, bicycles, and mini-trucks) are the backbone of local food distribution in Indian villages and towns. However, they lack digital tools to manage sales, stock, and credit (Udhaar).
                </p>
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-950 font-medium">
                  <strong>Core Innovation:</strong> Digital India bridge connecting rural customers directly with moving roadside carts through live GPS tracking, Kannada voice AI, and intelligent mobility anti-clustering.
                </div>
              </div>
            )}

            {activeSection === '2' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">2. PROBLEM STATEMENT</h3>
                <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                  <li><strong>Manual Friction:</strong> Sales, stock, customer debt (Udhaar) recorded on loose paper slips.</li>
                  <li><strong>Literacy Barrier:</strong> Conventional apps require typing in English, alienating rural vendors.</li>
                  <li><strong>Uncoordinated Mobility:</strong> Multiple vegetable vendors travel to the exact same village lane, causing oversaturation, price collapse, and fuel wastage.</li>
                  <li><strong>Customer Invisibility:</strong> Village households don't know when the vegetable/fruit cart is coming to their street.</li>
                </ul>
              </div>
            )}

            {activeSection === '3' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">3. PRIMARY OBJECTIVES</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Digitize daily sales, stock & Udhaar credit management.",
                    "Provide hands-free Kannada voice commerce.",
                    "Predict product demand using AI/ML regression.",
                    "Intelligent mobility & anti-clustering spatial coordination.",
                    "Offline-first outbox synchronization for zero data loss.",
                    "Real-time GPS order tracking and customer loyalty rewards."
                  ].map((obj, i) => (
                    <div key={i} className="p-3 bg-slate-50 border rounded-xl text-xs font-semibold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === '5' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">5. TECHNOLOGY & TOOLS</h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div><strong>Backend:</strong> Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL / SQLite.</div>
                  <div><strong>Customer Web:</strong> React, Vite, Tailwind CSS, Leaflet Maps, Web Speech API, Web Audio Synthesizer.</div>
                  <div><strong>Vendor Mobile:</strong> Flutter, Dart, Riverpod, Drift Offline DB, FlutterTTS.</div>
                  <div><strong>AI/ML & Voice:</strong> Scikit-Learn (Random Forest), XGBoost, Pandas, NumPy, gTTS, Web Speech Recognition.</div>
                  <div><strong>Maps & GIS:</strong> OpenStreetMap, Leaflet, OSRM (Open Source Routing Machine), Haversine Algorithm.</div>
                </div>
              </div>
            )}

            {activeSection === '6' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">6. SYSTEM ARCHITECTURE</h3>
                <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto">
                  CUSTOMER WEB (Next.js/React) &lt;---&gt; FASTAPI CENTRAL ENGINE &lt;---&gt; VENDOR FLUTTER APP<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;┌───────────────────────┬────────────────────────┴───────────────────────┐<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  PostgreSQL / SQLite&nbsp;&nbsp;&nbsp;&nbsp;Kannada Voice Assistant&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AI Demand & Mobility Radar<br/>
                  (Sales, Udhaar, Sync)&nbsp;&nbsp;(STT + NLU + Tool Registry + TTS)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(XGBoost + Anti-Clustering)
                </div>
              </div>
            )}

            {activeSection === '9' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">9. AI & MOBILITY ALGORITHMS</h3>
                <div className="space-y-3 text-xs sm:text-sm">
                  <p><strong>1. Anti-Clustering Spatial Scoring Formula:</strong></p>
                  <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs">
                    Score_i = w1*HistDemand + w2*PredDemand + w3*CustDensity - w4*ActiveCompetitors - w5*Distance ± Weather
                  </div>
                  <p><strong>2. Machine Learning Demand Forecaster:</strong></p>
                  <p>Trains on lag sales (t-1, t-7), day-of-week cyclical encoding, and weather precipitation penalty to recommend morning stocking quantities.</p>
                </div>
              </div>
            )}

            {activeSection === '11' && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black text-slate-900 border-b pb-2">11. ACADEMIC IEEE REFERENCES</h3>
                <ol className="list-decimal pl-5 space-y-2 text-xs">
                  <li>E. Dritsas and M. Trigka, “Machine Learning in E-Commerce: Trends, Applications, and Future Challenges,” <em>IEEE Access</em>, vol. 13, pp. 99048–99049, 2025.</li>
                  <li>G. Gupta, W. M. Lim, N. Chaudhuri, and D. Sharma, “Alexa, it’s not just us! Voice commerce through the lens of service providers and consumers,” <em>Journal of Service Management</em>, vol. 37, no. 1, pp. 105–140, 2026.</li>
                  <li>A. Wasilewski, Y. Chawla, and E. Pralat, “Enhanced E-Commerce Personalization Through AI-Powered Content Generation Tools,” <em>IEEE Access</em>, vol. 13, pp. 48083–48083, 2025.</li>
                  <li>M. S. Nule, P. Tondewad, and M. Dhanvijay, “E-Commerce Engineering Navigating Web Development Based Voice for Local,” in <em>Proc. IEEE 5th Int. Conf. on Cybernetics, Cognition and Machine Learning Applications (ICCCMLA)</em>, 2023, pp. 540–544.</li>
                  <li>A. S. Tulshan and S. N. Dhage, “Survey on Virtual Assistant: Google Assistant, Siri, Cortana, Alexa,” in <em>Proc. Int. Symp. Signal Processing and Intelligent Recognition Systems</em>, Springer, 2019, pp. 190–201.</li>
                  <li>D. S. Zwakman, D. Pal, and C. Arpnikanondt, “Usability Evaluation of AI-Based Voice Assistants: The Case of Amazon Alexa,” <em>Social Network Computing Sciences</em>, vol. 2, no. 1, 2021.</li>
                  <li>A. Natto, C. Begg, and G. McRobbie, “Simple Social Commerce for Microenterprises: Initial Investigations of a Global Phenomenon,” in <em>Proc. SAI Computing Conf.</em>, 2016, pp. 115–162.</li>
                  <li>C. N. Kiran and G. N. Kumar, “Reliable OSPM Schema for Secure Transaction Using Mobile Agent in Micropayment System,” in <em>Proc. 4th Int. Conf. on Computing, Communication and Networking Technologies (ICCCNT)</em>, 2013, pp. 1–7.</li>
                </ol>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
