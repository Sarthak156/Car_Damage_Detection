import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Shield,
  Zap,
  Target,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Activity,
  Cpu,
  ChevronRight,
  ArrowDown
} from "lucide-react";

// Injecting global CSS for Industrial/Technical Neo-Brutalist aesthetic
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

  body {
    background-color: #f8fafc;
    /* Engineering grid background */
    background-image: 
      linear-gradient(#e2e8f0 1px, transparent 1px),
      linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
    background-size: 24px 24px;
    color: #0f172a;
    font-family: 'Inter', sans-serif;
    margin: 0;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, .display-font {
    font-family: 'Space Grotesk', sans-serif;
  }

  .tech-card {
    background: #ffffff;
    border: 2px solid #0f172a;
    box-shadow: 6px 6px 0px #0f172a;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .tech-btn {
    background: #0f172a;
    color: #ffffff;
    border: 2px solid #0f172a;
    box-shadow: 4px 4px 0px rgba(15, 23, 42, 0.3);
    border-radius: 4px;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.5px;
    transition: all 0.1s ease;
  }

  .tech-btn:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px rgba(15, 23, 42, 0);
  }

  .tech-btn-outline {
    background: #ffffff;
    color: #0f172a;
    border: 2px solid #0f172a;
    box-shadow: 4px 4px 0px rgba(15, 23, 42, 0.1);
    border-radius: 4px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    transition: all 0.1s ease;
  }

  .tech-btn-outline:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px rgba(15, 23, 42, 0);
  }

  .scanning-line {
    position: absolute;
    width: 100%;
    height: 4px;
    background: #3b82f6;
    box-shadow: 0 0 15px #3b82f6;
    animation: scan 2.5s ease-in-out infinite;
    z-index: 10;
  }

  @keyframes scan {
    0% { top: 0; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
`;

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  
  const imageRef = useRef(null);
  const reportRef = useRef(null);

  // Store image natural dimensions for responsive bounding boxes
  const [dimensions, setDimensions] = useState({
    naturalWidth: 1,
    naturalHeight: 1
  });

  const loadingMessages = [
    "Initializing AI Engine...",
    "CALIBRATING SENSORS...",
    "MAPPING IMPACT ZONES...",
    "QUANTIFYING SEVERITY...",
    "ESTIMATING REPAIR DATA...",
    "COMPILING FINAL REPORT..."
  ];

  // Rotate loading messages while processing
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // SCROLL UTILITY
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // DRAG & DROP
  const onDrop = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": []
    }
  });

  // API REQUEST
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "https://car-damage-detection-2j0f.onrender.com/predict",
        {
          method: "POST",
          body: formData
        }
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Prediction failed! Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (e) => {
    setDimensions({
      naturalWidth: e.target.naturalWidth,
      naturalHeight: e.target.naturalHeight
    });
  };

  // AI SUMMARY
  let highestSeverity = "Minor";
  if (result && result.detections.length > 0) {
    if (result.detections.some(item => item.severity === "Severe")) {
      highestSeverity = "Severe";
    } else if (result.detections.some(item => item.severity === "Moderate")) {
      highestSeverity = "Moderate";
    }
  }

  // REPAIR COST
  const repairCosts = {
    dent: 250,
    scratch: 120,
    crack: 180,
    lamp_broken: 400,
    glass_shatter: 600,
    tire_flat: 150
  };

  let totalRepairCost = 0;
  if (result && result.detections) {
    result.detections.forEach(item => {
      totalRepairCost += repairCosts[item.damage_type] || 100;
    });
  }

  // PDF EXPORT
  const downloadPDF = async () => {
    const input = reportRef.current;
    if (!input) return;
    
    // Pass background color explicitely for clean neo-brutalist white report capture
    const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: "#f8fafc" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    
    // Export as landscape to better fit the dashboard grid layout
    const pdf = new jsPDF("landscape", "mm", "a4");
    
    // Injecting Metadata
    pdf.setProperties({
      title: "DamageVision Damage Report",
      subject: "Car Damage Detection Results",
      author: "DamageVision AI",
      keywords: "car, damage, inspection, AI, report",
      creator: "DamageVision System"
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasRatio = canvas.width / canvas.height;
    
    // Calculate dimensions to completely fill the landscape PDF page while maintaining aspect ratio
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / canvasRatio;
    
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * canvasRatio;
    }
    
    // Center the captured content vertically/horizontally
    const xOffset = (pdfWidth - finalWidth) / 2;
    const yOffset = (pdfHeight - finalHeight) / 2;
    
    pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);
    pdf.save("DamageVision_Damage_Report.pdf");
  };

  const getSeverityColor = (severity) => {
    if (severity === "Severe") return "#ef4444"; // Red
    if (severity === "Moderate") return "#f59e0b"; // Amber
    return "#10b981"; // Emerald
  };

  return (
    <>
      <style>{globalStyles}</style>
      
      {/* Industrial Navbar */}
      <nav style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', background: '#ffffff', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <div style={{ background: '#0f172a', padding: '8px', borderRadius: '4px' }}>
            <Activity color="#ffffff" size={24} />
          </div>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase' }} className="display-font">
            DamageVision AI
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '15px', color: '#475569', fontWeight: '600', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
          <span onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} style={{ cursor: 'pointer', color: '#0f172a', borderBottom: '2px solid #0f172a' }}>Dashboard</span>
          <span onClick={() => scrollToSection('analysis-section')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#0f172a'} onMouseOut={e => e.target.style.color = '#475569'}>Analysis</span>
          {result && <span onClick={downloadPDF} style={{ cursor: 'pointer', color: '#3b82f6', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#2563eb'} onMouseOut={e => e.target.style.color = '#3b82f6'}>Export Report</span>}
        </div>
      </nav>

      <main style={{ minHeight: 'calc(100vh - 80px)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          
          {/* Default / Upload State */}
          {!result && !loading && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              
              {/* Hero Section */}
              <div style={{ textAlign: 'center', marginBottom: '50px', marginTop: '20px' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <span style={{ background: '#e0e7ff', color: '#1e40af', padding: '6px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '700', marginBottom: '20px', display: 'inline-block', border: '2px solid #1e40af', fontFamily: "'Space Grotesk', sans-serif" }}>
                    DIAGNOSTIC SYSTEM V2.4
                  </span>
                  <h1 style={{ fontSize: '56px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', letterSpacing: '-2px', textTransform: 'uppercase', lineHeight: '1.1' }} className="display-font">
                Car Damage Detection
                  </h1>
                  <p style={{ fontSize: '18px', color: '#475569', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6', fontWeight: '500' }}>
                    Upload imagery to initiate technical analysis. AI identifies impact points and computes projected maintenance metrics.
                  </p>
                </motion.div>
              </div>

              {/* Upload Zone */}
              <motion.div 
                {...getRootProps()} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="tech-card"
                style={{
                  border: isDragActive ? '2px solid #3b82f6' : '2px dashed #0f172a',
                  background: isDragActive ? '#eff6ff' : '#ffffff',
                  padding: preview ? '20px' : '50px 40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '700px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
              >
                <input {...getInputProps()} />
                
                {!preview ? (
                  <div>
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                      <UploadCloud size={64} color={isDragActive ? "#3b82f6" : "#0f172a"} style={{ margin: '0 auto 20px' }} />
                    </motion.div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }} className="display-font">
                      {isDragActive ? 'DROP TO UPLOAD' : 'DRAG & DROP IMAGERY HERE'}
                    </h3>
                    <p style={{ color: '#475569', marginBottom: '16px', fontWeight: '500' }}>or click to browse directory</p>
                    <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', color: '#475569', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                      ACCEPTED: JPG, PNG, WEBP [MAX 10MB]
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '2px solid #0f172a' }}>
                    <img src={preview} alt="Upload preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', padding: '8px 16px', borderRadius: '4px', color: '#ffffff', border: '2px solid #047857', marginBottom: '16px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>
                        <CheckCircle size={18} />
                        <span>IMAGERY SECURED</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {preview && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  className="tech-btn"
                  style={{
                    marginTop: '30px',
                    padding: '16px 40px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  INITIATE ANALYSIS <ChevronRight size={20} />
                </motion.button>
              )}

              {/* Feature Cards */}
              {!preview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '60px', width: '100%' }}>
                  {[
                    { icon: <Target color="#0f172a" size={24} />, title: 'YOLOv8 Architecture', desc: 'Computer vision framework executes precise spatial bounding for surface anomalies.' },
                    { icon: <Zap color="#0f172a" size={24} />, title: 'High-Speed Inference', desc: 'Optimized neural processing delivers real-time diagnostic output.' },
                    { icon: <Shield color="#0f172a" size={24} />, title: 'Automated Cost Matrix', desc: 'Algorithmic correlation between severity index and projected maintenance expenses.' }
                  ].map((f, i) => (
                    <motion.div key={i} whileHover={{ y: -4 }} className="tech-card" style={{ padding: '30px', borderTop: '6px solid #0f172a' }}>
                      <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '4px', display: 'inline-flex', marginBottom: '20px', border: '2px solid #e2e8f0' }}>
                        {f.icon}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#0f172a', textTransform: 'uppercase' }} className="display-font">{f.title}</h3>
                      <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Loading State with Scanning Effects */}
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
            >
              <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '40px' }}>
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px dashed #cbd5e1', borderTopColor: '#3b82f6' }}
                />
                <motion.div 
                  animate={{ rotate: -360 }} 
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '4px dotted #e2e8f0', borderBottomColor: '#0f172a' }}
                />
                <Activity size={48} color="#0f172a" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              </div>
              
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={loadingMessages[loadingMsgIdx]}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {loadingMessages[loadingMsgIdx]}
                </motion.h2>
              </AnimatePresence>
              <p style={{ color: '#64748b', fontWeight: '500' }}>Please standby. Processing image through neural network.</p>
            </motion.div>
          )}

          {/* Premium Results Dashboard */}
          {result && !loading && (
            <motion.div 
              key="results"
              id="analysis-section"
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              style={{ width: '100%', maxWidth: '1400px', paddingTop: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div>
                    <span style={{ fontWeight: '700', color: '#10b981', letterSpacing: '1px', fontSize: '14px', fontFamily: "'Space Grotesk', sans-serif" }}>ANALYSIS COMPLETE</span>
                  </div>
                  <h2 style={{ fontSize: '32px', color: '#0f172a', fontWeight: '800', margin: 0, textTransform: 'uppercase' }} className="display-font">Inspection Report</h2>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setFile(null); setPreview(null); setResult(null); }} 
                    className="tech-btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={18} /> NEW SCAN
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadPDF} 
                    className="tech-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', background: '#3b82f6', borderColor: '#1d4ed8' }}
                  >
                    <ArrowDown size={18} /> EXPORT PDF
                  </motion.button>
                </div>
              </div>

              {/* REPORT REF WRAPS BOTH COLUMNS SO HTML2CANVAS CAPTURES EVERYTHING */}
              <div ref={reportRef} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '30px', alignItems: 'start', padding: '20px', background: '#f8fafc', margin: '-20px', borderRadius: '8px' }}>
                
                {/* Visualizer & Bounding Boxes */}
                <div className="tech-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }} className="display-font">
                      <Target size={20} color="#0f172a" /> Spatial Visualizer
                    </h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> Severe
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> Moderate
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Minor
                      </span>
                    </div>
                  </div>

                  <div 
                    style={{ position: 'relative', width: '100%', border: '2px solid #0f172a', overflow: 'hidden', background: '#e2e8f0', display: 'flex', justifyContent: 'center' }}
                  >
                    <img 
                      ref={imageRef} 
                      src={preview} 
                    alt="Analyzed Car" 
                      onLoad={handleImageLoad}
                      style={{ maxWidth: '100%', height: 'auto', display: 'block' }} 
                    />
                    
                    <div className="scanning-line" />

                    {result.detections.map((item, index) => {
                      const box = item.bounding_box;
                      const color = getSeverityColor(item.severity);
                      
                      // Calculate position based on percentages for responsive layout stability
                      if(dimensions.naturalWidth === 0) return null;
                      const leftPercent = (box.x1 / dimensions.naturalWidth) * 100;
                      const topPercent = (box.y1 / dimensions.naturalHeight) * 100;
                      const widthPercent = ((box.x2 - box.x1) / dimensions.naturalWidth) * 100;
                      const heightPercent = ((box.y2 - box.y1) / dimensions.naturalHeight) * 100;

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + (index * 0.15), type: 'spring' }}
                          key={index}
                          style={{
                            position: "absolute",
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                            border: `3px solid ${color}`, // Solid sharp border
                            boxShadow: `0 0 0 1px #0f172a, inset 0 0 0 1px #0f172a`, // Double border effect
                            backgroundColor: `${color}15`,
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '-3px',
                            background: color,
                            color: '#fff',
                            padding: '4px 8px',
                            border: '2px solid #0f172a',
                            borderBottom: 'none',
                            fontSize: '11px',
                            fontWeight: '800',
                            fontFamily: "'Space Grotesk', sans-serif",
                            whiteSpace: 'nowrap',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            {item.damage_type.replace('_', ' ')} ({(item.confidence * 100).toFixed(0)}%)
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Analytics Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Summary Metric */}
                  <div className="tech-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: '#0f172a', color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} />
                      <span style={{ fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>EXECUTIVE SUMMARY</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px' }}>
                      <div>
                        <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Total Anomalies
                        </p>
                        <h4 style={{ fontSize: '48px', color: '#0f172a', fontWeight: '800', margin: 0, lineHeight: '1' }} className="display-font">
                          {result.total_damages}
                        </h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Projected Cost</p>
                        <h4 style={{ fontSize: '48px', color: '#3b82f6', fontWeight: '800', margin: 0, lineHeight: '1' }} className="display-font">
                          ${totalRepairCost}
                        </h4>
                      </div>
                    </div>
                    
                    <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '2px solid #e2e8f0' }}>
                      <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                        {result.total_damages > 0 
                          ? `System detects ${highestSeverity.toUpperCase()} structural degradation. Total of ${result.detections.length} damage signatures mathematically verified.` 
                          : "No structural anomalies detected. Car appears in optimal condition."}
                      </p>
                    </div>
                  </div>

                  {/* Detections Breakdown List */}
                  <div className="tech-card" style={{ padding: '24px', flex: 1, maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', textTransform: 'uppercase' }} className="display-font">
                      <AlertTriangle size={18} color="#0f172a" /> Anomaly Breakdown
                    </h3>
                    
                    {result.detections.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p>No damages found</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {result.detections.map((item, index) => {
                          const color = getSeverityColor(item.severity);
                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.8 + (index * 0.1) }}
                              key={index} 
                              style={{ background: '#ffffff', padding: '16px', border: `2px solid #e2e8f0`, position: 'relative', overflow: 'hidden', borderLeft: `6px solid ${color}` }}
                            >
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingLeft: '8px' }}>
                                <h4 style={{ color: '#0f172a', fontSize: '16px', margin: 0, textTransform: 'uppercase', fontWeight: '700' }} className="display-font">
                                  {item.damage_type.replace('_', ' ')}
                                </h4>
                                <span style={{ background: `${color}15`, color: color, padding: '4px 8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', border: `2px solid ${color}`, fontFamily: "'Space Grotesk', sans-serif" }}>
                                  {item.severity}
                                </span>
                              </div>
                              
                              <div style={{ paddingLeft: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
                                  <span>Neural Confidence</span>
                                  <span>{(item.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#e2e8f0', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.confidence * 100}%` }}
                                    transition={{ duration: 1, delay: 1 + (index * 0.1), ease: "easeOut" }}
                                    style={{ height: '100%', background: color }} 
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

export default App;