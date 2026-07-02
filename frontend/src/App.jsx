import React, { useState, useRef, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Client } from "@gradio/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
const HF_SPACE = "sarthak156/damagevision";

const SCAN_MESSAGES = [
  "SYSTEM_INIT_YOLO_V8...",
  "ISOLATING_IMPACT_VECTORS...",
  "MAPPING_DAMAGE_ZONES...",
  "CALCULATING_CONFIDENCE_MATRIX...",
  "GENERATING_DIAGNOSTICS_REPORT..."
];

const TechGrid = () => (
  <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none", backgroundColor: "#f4f4f0" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.1 }} />
  </div>
);

const brutalistShadow = "6px 6px 0px #000";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const imageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ naturalWidth: 1, naturalHeight: 1 });
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length);
      }, 2500);
    } else {
      setMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const onDrop = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1
  });




  const handleUpload = async () => {

    if (!file) return;

    setLoading(true);

    try {

      // CONVERT FILE TO BASE64

      const toBase64 = (file) =>
        new Promise((resolve, reject) => {

          const reader = new FileReader();

          reader.readAsDataURL(file);

          reader.onload = () =>
            resolve(reader.result);

          reader.onerror = error =>
            reject(error);
        });

      const base64Image =
        (await toBase64(file)).split(',')[1];

      // STEP 1

      const response = await fetch(
        "https://sarthak156-damagevision.hf.space/run/predict",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            data: [
              {
                "name": file.name,
                "data": `data:image/jpeg;base64,${base64Image}`,
                "is_file": true
              }
            ]


          })
        }
      );

      const event =
        await response.json();

      console.log(
        "EVENT:",
        event
      );

      // STEP 2

      const resultResponse =
        await fetch(
          `https://sarthak156-damagevision.hf.space/queue/join?fn_index=0&session_hash=${event.session_hash}`
        );

      const text =
        await resultResponse.text();

      console.log(text);

      const lines =
        text.split("\n");

      let finalPayload =
        null;

      for (const line of lines) {

        if (
          line.startsWith("data:")
        ) {

          try {

            const parsed =
              JSON.parse(
                line.replace(
                  "data:",
                  ""
                ).trim()
              );

            if (
              parsed.msg === "process_completed"
            ) {

              finalPayload =
                parsed.output.data[0];
            }

          } catch { }
        }
      }

      if (!finalPayload) {

        throw new Error(
          "No prediction received."
        );
      }

      // FILTER LOW CONFIDENCE

      if (finalPayload.detections) {
        finalPayload.detections = finalPayload.detections.filter(d => d.confidence > 0.25);
        finalPayload.total_damages = finalPayload.detections.length;
      }

      setResult(finalPayload);

    } catch (error) {
      console.error(error);
      alert(`Prediction failed:\n${error.message}`);
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

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const capturePage = async (elementId) => {
        const element = document.getElementById(elementId);
        if (!element) return null;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        return canvas.toDataURL("image/png");
      };

      const imgData1 = await capturePage("pdf-page-1");
      if (imgData1) {
        const props1 = pdf.getImageProperties(imgData1);
        pdf.addImage(imgData1, "PNG", 0, 0, pdfWidth, (props1.height * pdfWidth) / props1.width);
      }

      const imgData2 = await capturePage("pdf-page-2");
      if (imgData2) {
        pdf.addPage();
        const props2 = pdf.getImageProperties(imgData2);
        pdf.addImage(imgData2, "PNG", 0, 0, pdfWidth, (props2.height * pdfWidth) / props2.width);
      }

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Page ${i} of ${pageCount}`, pdfWidth / 2, pdfHeight - 10, { align: "center" });
      }

      pdf.save("DamageVision_Report.pdf");
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedCost = (damageType, severity) => {
    const type = damageType.toLowerCase();
    if (type === "scratch") {
      if (severity === "Minor") return 1000;
      if (severity === "Moderate") return 3500;
      if (severity === "Severe") return 10500;
    }
    if (type === "dent") {
      if (severity === "Minor") return 2000;
      if (severity === "Moderate") return 5500;
      if (severity === "Severe") return 14000;
    }
    if (severity === "Severe") return 8000;
    if (severity === "Moderate") return 4500;
    if (severity === "Minor") return 1500;
    return 1000;
  };

  const getSeverityStyles = (severity) => {
    if (severity === "Severe") return { color: "#fff", bg: "#ef4444", border: "#000" };
    if (severity === "Moderate") return { color: "#000", bg: "#f97316", border: "#000" };
    if (severity === "Minor") return { color: "#000", bg: "#eab308", border: "#000" };
    return { color: "#000", bg: "#e5e5e5", border: "#000" };
  };

  let totalRepairCost = 0;
  let highestSeverity = "None";
  let avgConfidence = 0;
  let inspectionStatus = "Clear";
  let insuranceRisk = "Low";

  if (result?.detections?.length > 0) {
    result.detections.forEach((item) => {
      totalRepairCost += getEstimatedCost(item.damage_type, item.severity);
    });

    const severities = result.detections.map((d) => d.severity);
    if (severities.includes("Severe")) {
      highestSeverity = "Severe";
      inspectionStatus = "Action Required - Major";
      insuranceRisk = "High";
    } else if (severities.includes("Moderate")) {
      highestSeverity = "Moderate";
      inspectionStatus = "Action Required - Minor";
      insuranceRisk = "Medium";
    } else {
      highestSeverity = "Minor";
      inspectionStatus = "Review Recommended";
      insuranceRisk = "Low";
    }

    avgConfidence =
      result.detections.reduce((acc, curr) => acc + curr.confidence, 0) /
      result.detections.length;
  }

  const reportId = useMemo(() => `REP-${Math.floor(Math.random() * 1000000)}`, [result]);

  return (
    <div style={{ minHeight: "100vh", color: "#000", fontFamily: '"Archivo", "Inter", system-ui, -apple-system, sans-serif' }}>
      <TechGrid />

      <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: "3px solid #000", background: "#fff" }}>
        <div style={{ fontSize: "24px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-1px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="square"><path d="M2 12h4l3-9 5 18 3-9h5" /></svg>
          DAMAGE_VISION<span style={{ color: "#3b82f6" }}>.SYS</span>
        </div>
        <div style={{ fontSize: "14px", fontFamily: "monospace", fontWeight: "bold", background: "#000", color: "#0f0", padding: "4px 12px", textTransform: "uppercase" }}>
          [ STATUS: ONLINE ]
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto", padding: "60px 20px" }}>

        {!result && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "inline-block", padding: "6px 16px", border: "2px solid #000", background: "#facc15", color: "#000", fontSize: "14px", fontWeight: "800", fontFamily: "monospace", marginBottom: "24px", boxShadow: "3px 3px 0px #000" }}>
                ENGINE: YOLOv8 // BUILD: 2.1
              </motion.div>
              <h1 style={{ fontSize: "72px", fontWeight: "900", marginBottom: "20px", color: "#000", textTransform: "uppercase", letterSpacing: "-2px", lineHeight: "0.95" }}>
                Automated <br /> Damage <br /> Diagnostics.
              </h1>
              <p style={{ fontSize: "18px", color: "#444", maxWidth: "600px", margin: "0 auto", lineHeight: "1.5", fontWeight: "500" }}>
                Upload structural vehicle imagery. Our computer vision protocol will isolate impact vectors, quantify severity, and compute repair estimates instantly.
              </p>
            </div>

            {!preview ? (
              <motion.div
                {...getRootProps()}
                whileHover={{ x: -4, y: -4, boxShadow: brutalistShadow }}
                style={{
                  border: "4px dashed #000", padding: "60px 40px", textAlign: "center", margin: "0 auto",
                  background: isDragActive ? "#facc15" : "#fff", cursor: "pointer", maxWidth: "800px",
                  transition: "background 0.2s", boxShadow: "4px 4px 0px rgba(0,0,0,0.1)"
                }}
              >
                <input {...getInputProps()} />
                <h2 style={{ fontSize: "32px", fontWeight: "900", textTransform: "uppercase", marginBottom: "12px", color: "#000" }}>
                  {isDragActive ? "[ INITIATE DROP ]" : "Insert Image File"}
                </h2>
                <p style={{ color: "#444", fontSize: "16px", marginBottom: "24px", fontWeight: "600" }}>
                  or click to browse from your computer
                </p>
                <span style={{ display: "inline-block", background: "#000", color: "#fff", padding: "6px 12px", fontSize: "14px", fontWeight: "700", fontFamily: "monospace", textTransform: "uppercase" }}>
                  FORMAT: JPG / PNG / WEBP
                </span>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: "800px", margin: "0 auto", background: "#fff", padding: "24px", border: "4px solid #000", boxShadow: brutalistShadow }}>
                <div style={{ position: "relative", overflow: "hidden", marginBottom: "24px", border: "3px solid #000", background: "#f0f0f0" }}>
                  <img src={preview} alt="preview" style={{ width: "100%", maxHeight: "500px", objectFit: "contain", display: "block" }} />
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <motion.button
                    whileTap={{ x: 4, y: 4, boxShadow: "0px 0px 0px #000" }}
                    onClick={() => { setPreview(null); setFile(null); }}
                    style={{ padding: "16px 32px", border: "3px solid #000", background: "#e5e5e5", color: "#000", cursor: "pointer", fontSize: "16px", fontWeight: "800", textTransform: "uppercase", boxShadow: "4px 4px 0px #000" }}
                  >
                    ABORT
                  </motion.button>
                  <motion.button
                    whileTap={{ x: 4, y: 4, boxShadow: "0px 0px 0px #000" }}
                    onClick={handleUpload}
                    style={{ flex: 1, padding: "16px 32px", border: "3px solid #000", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: "18px", fontWeight: "900", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "4px 4px 0px #000" }}
                  >
                    EXECUTE DIAGNOSTIC SCAN
                  </motion.button>
                </div>
              </motion.div>
            )}

            {!preview && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginTop: "60px" }}>
                {[
                  { label: "PRECISION", title: "YOLOv8 Vision", desc: "Advanced computer vision tailored for structural automotive damage recognition." },
                  { label: "VELOCITY", title: "Real-time Process", desc: "Instantaneous sub-second localized damage severity mapped directly in-browser." },
                  { label: "DOCUMENTATION", title: "Export Utility", desc: "Generate technical PDF summaries detailing analytical findings for adjusters." }
                ].map((feature, idx) => (
                  <div key={idx} style={{ background: "#fff", border: "3px solid #000", padding: "30px", boxShadow: brutalistShadow }}>
                    <div style={{ fontFamily: "monospace", fontWeight: "bold", color: "#3b82f6", marginBottom: "12px", borderBottom: "2px solid #000", paddingBottom: "8px", display: "inline-block" }}>
                      // {feature.label}
                    </div>
                    <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#000", marginBottom: "12px", textTransform: "uppercase" }}>{feature.title}</h3>
                    <p style={{ color: "#444", fontSize: "15px", lineHeight: "1.5", margin: 0, fontWeight: "500" }}>{feature.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ maxWidth: "700px", margin: "100px auto 0", background: "#000", color: "#0f0", padding: "40px", border: "4px solid #000", boxShadow: "8px 8px 0px #facc15", fontFamily: "monospace" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>█</motion.span> EXECUTING SCAN SEQUENCE
            </h2>
            <div style={{ fontSize: "18px", marginBottom: "20px" }}>
              {`> ${SCAN_MESSAGES[msgIdx]}`}
            </div>
            <div style={{ width: "100%", height: "24px", border: "2px solid #0f0", padding: "2px" }}>
              <motion.div style={{ height: "100%", background: "#0f0" }} animate={{ width: ["0%", "100%"] }} transition={{ duration: (SCAN_MESSAGES.length * 2.5) / 1000, ease: "linear" }} />
            </div>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div id="report-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: '"Archivo", "Inter", system-ui, sans-serif' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "40px", fontWeight: "900", margin: 0, textTransform: "uppercase", letterSpacing: "-1px" }}>Analysis Output</h2>
              <motion.button
                whileTap={{ x: 3, y: 3, boxShadow: "0px 0px 0px #000" }}
                onClick={() => { setResult(null); setPreview(null); setFile(null); }}
                style={{ padding: "10px 20px", border: "3px solid #000", background: "#fff", color: "#000", cursor: "pointer", fontSize: "14px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", boxShadow: "4px 4px 0px #000", textTransform: "uppercase" }}
              >
                [+] NEW SCAN
              </motion.button>
            </div>

            {/* PAGE 1: DATA */}
            <div id="pdf-page-1" style={{ background: "#fff", padding: "40px", border: "4px solid #000", marginBottom: "40px", boxShadow: brutalistShadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", borderBottom: "4px solid #000", paddingBottom: "30px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "900", color: "#000", letterSpacing: "-1px", textTransform: "uppercase" }}>DamageVision.SYS</h1>
                  </div>
                  <p style={{ margin: 0, color: "#444", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", fontStyle: "italic" }}>// Diagnostic Summary Report</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-block", background: inspectionStatus.includes("Action") ? "#ef4444" : "#10b981", color: inspectionStatus.includes("Action") ? "#fff" : "#000", border: "3px solid #000", padding: "8px 16px", fontSize: "16px", fontWeight: "900", marginBottom: "12px", textTransform: "uppercase", boxShadow: "4px 4px 0px #000" }}>
                    {inspectionStatus}
                  </div>
                  <p style={{ margin: 0, color: "#000", fontSize: "14px", fontFamily: "monospace", fontWeight: "bold" }}>REF: {reportId}</p>
                  <p style={{ margin: "4px 0 0 0", color: "#000", fontSize: "14px", fontFamily: "monospace", fontWeight: "bold" }}>TS: {new Date().toLocaleString()}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                {[
                  { label: "Detected Points", value: result.total_damages, color: "#000", bg: "#f4f4f0" },
                  { label: "Peak Severity", value: highestSeverity, color: getSeverityStyles(highestSeverity).color, bg: getSeverityStyles(highestSeverity).bg },
                  { label: "Est. Variance", value: `₹${totalRepairCost.toLocaleString()}`, color: "#000", bg: "#4ade80" },
                  { label: "AI Confidence", value: `${(avgConfidence * 100).toFixed(1)}%`, color: "#fff", bg: "#2563eb" }
                ].map((stat, i) => (
                  <div key={i} style={{ background: stat.bg, padding: "24px", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
                    <p style={{ margin: 0, color: stat.color === "#fff" ? "#e2e8f0" : "#444", fontSize: "14px", fontWeight: "700", textTransform: "uppercase", fontFamily: "monospace" }}>{stat.label}</p>
                    <h3 style={{ margin: "12px 0 0 0", fontSize: "32px", fontWeight: "900", color: stat.color, textTransform: "uppercase" }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: "40px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "20px", color: "#000", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ display: "inline-block", width: "16px", height: "16px", background: "#facc15", border: "2px solid #000" }} /> DETECTED ANOMALIES
                </h2>
                <div style={{ border: "3px solid #000", background: "#fff", boxShadow: "4px 4px 0px #000" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f0f0f0", borderBottom: "3px solid #000" }}>
                        <th style={{ padding: "16px 24px", color: "#000", fontSize: "14px", fontWeight: "800", textTransform: "uppercase", fontFamily: "monospace" }}>Damage Type</th>
                        <th style={{ padding: "16px 24px", color: "#000", fontSize: "14px", fontWeight: "800", textTransform: "uppercase", fontFamily: "monospace" }}>Severity Level</th>
                        <th style={{ padding: "16px 24px", color: "#000", fontSize: "14px", fontWeight: "800", textTransform: "uppercase", fontFamily: "monospace" }}>System Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.detections.map((item, index) => {
                        const styles = getSeverityStyles(item.severity);
                        return (
                          <tr key={index} style={{ borderBottom: index === result.detections.length - 1 ? "none" : "2px solid #000" }}>
                            <td style={{ padding: "20px 24px", fontWeight: "900", color: "#000", textTransform: "uppercase", fontSize: "16px" }}>
                              {item.damage_type.replace(/_/g, " ")}
                            </td>
                            <td style={{ padding: "20px 24px" }}>
                              <span style={{ background: styles.bg, color: styles.color, border: "2px solid #000", padding: "6px 14px", fontSize: "14px", fontWeight: "900", textTransform: "uppercase", boxShadow: "2px 2px 0px #000" }}>
                                {item.severity}
                              </span>
                            </td>
                            <td style={{ padding: "20px 24px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ flex: 1, height: "12px", background: "#e5e5e5", border: "2px solid #000", position: "relative" }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.confidence * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ height: "100%", background: "#000" }} />
                                </div>
                                <span style={{ width: "45px", fontSize: "16px", fontWeight: "900", fontFamily: "monospace", color: "#000" }}>
                                  {(item.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {result.detections.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ padding: "30px", textAlign: "center", color: "#000", fontWeight: "bold", fontFamily: "monospace" }}>
                            NO ANOMALIES DETECTED. STRUCTURAL INTEGRITY VERIFIED.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                <div style={{ background: "#f0f0f0", padding: "24px", border: "3px solid #000" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#000", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #000", paddingBottom: "8px", display: "inline-block" }}>
                    // SYSTEM NOTES
                  </h3>
                  <p style={{ margin: 0, color: "#000", fontSize: "15px", lineHeight: "1.6", fontWeight: "600" }}>
                    Scan processed with an average baseline confidence of <strong>{(avgConfidence * 100).toFixed(1)}%</strong>.{" "}
                    {highestSeverity === "Severe" ? "CRITICAL: Major structural compromise located. Immediate manual verification requested." : "STANDARD: Detected variations fall within moderate-to-minor parameters. Routine check advised."}
                  </p>
                </div>

                <div style={{ background: "#f0f0f0", padding: "24px", border: "3px solid #000" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#000", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #000", paddingBottom: "8px", display: "inline-block" }}>
                    // RISK ASSESSMENT
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "22px", fontWeight: "900", color: insuranceRisk === "High" ? "#ef4444" : insuranceRisk === "Medium" ? "#f97316" : "#10b981", textTransform: "uppercase" }}>
                      [{insuranceRisk} RISK TIER]
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "#000", fontSize: "15px", lineHeight: "1.6", fontWeight: "600" }}>
                    Analysis identifies {result.total_damages} flagged area(s). Calculated repair threshold sits at <strong>₹{totalRepairCost.toLocaleString()}</strong>.{" "}
                    {insuranceRisk === "High" ? "Elevated likelihood for high-value claim execution." : "Standard operational flow applicable."}
                  </p>
                </div>
              </div>
            </div>

            {/* PAGE 2: VISUAL */}
            <div id="pdf-page-2" style={{ background: "#fff", padding: "40px", border: "4px solid #000", marginBottom: "30px", boxShadow: brutalistShadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "4px solid #000", paddingBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "900", color: "#000", textTransform: "uppercase" }}>Visual Vector Map</h2>
                <p style={{ margin: 0, color: "#000", fontSize: "14px", fontFamily: "monospace", fontWeight: "bold" }}>REF: {reportId}</p>
              </div>

              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                <div style={{ flex: "1 1 300px", maxWidth: "500px", background: "#f0f0f0", padding: "16px", border: "3px solid #000" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#000", marginBottom: "16px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" }}>RAW.IMG</h3>
                  <img src={preview} alt="Original" style={{ width: "100%", display: "block", border: "2px solid #000" }} />
                </div>

                <div style={{ flex: "1 1 300px", maxWidth: "500px", background: "#f0f0f0", padding: "16px", border: "3px solid #000" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#3b82f6", marginBottom: "16px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" }}>
                    COMPUTED.IMG
                  </h3>
                  <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                    <img
                      ref={imageRef}
                      src={preview}
                      alt="Analyzed"
                      onLoad={handleImageLoad}
                      style={{ width: "100%", display: "block", border: "2px solid #000" }}
                    />
                    {result.detections.map((item, index) => {
                      const box = item.bounding_box;
                      const styles = getSeverityStyles(item.severity);
                      const left = (box.x1 / dimensions.naturalWidth) * 100;
                      const top = (box.y1 / dimensions.naturalHeight) * 100;
                      const width = ((box.x2 - box.x1) / dimensions.naturalWidth) * 100;
                      const height = ((box.y2 - box.y1) / dimensions.naturalHeight) * 100;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{
                            position: "absolute", left: `${left}%`, top: `${top}%`,
                            width: `${width}%`, height: `${height}%`,
                            border: `3px solid ${styles.bg}`, backgroundColor: "rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "-30px", left: "-3px",
                            background: styles.bg, color: styles.color, border: `3px solid ${styles.border}`,
                            padding: "4px 8px", fontSize: "12px", fontWeight: "900", whiteSpace: "nowrap",
                            zIndex: 10, display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase"
                          }}>
                            <span style={{ textTransform: "capitalize" }}>{item.damage_type.replace(/_/g, " ")}</span>
                            <span style={{ opacity: 0.6 }}>|</span>
                            <span>{(item.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div data-html2canvas-ignore="true" style={{ textAlign: "center", paddingTop: "20px", marginTop: "20px" }}>
              <motion.button
                whileTap={{ x: 4, y: 4, boxShadow: "0px 0px 0px #000" }}
                onClick={downloadPDF}
                disabled={isExporting}
                style={{
                  padding: "16px 40px", background: "#facc15", color: "#000", border: "4px solid #000",
                  fontSize: "18px", fontWeight: "900", textTransform: "uppercase", cursor: isExporting ? "not-allowed" : "pointer",
                  boxShadow: brutalistShadow, opacity: isExporting ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: "10px"
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                {isExporting ? "ENCODING DOCUMENT..." : "EXPORT TECHNICAL PDF"}
              </motion.button>
            </div>
          </motion.div>
        )}

        <footer style={{ marginTop: "80px", textAlign: "center", borderTop: "4px solid #000", paddingTop: "40px", color: "#000", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
          <p>DAMAGE_VISION.SYS // (C) {new Date().getFullYear()} // RESTRICTED ACCESS</p>
        </footer>
      </main>
    </div>
  );
}

export default App;