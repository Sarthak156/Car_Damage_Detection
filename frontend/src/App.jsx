import React, { useState, useRef, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Client } from "@gradio/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ✅ Your HuggingFace Space URL — update if you rename the space
const HF_SPACE = "sarthak156/DamageVision";

function App() {
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const imageRef                      = useRef(null);
  const [dimensions, setDimensions]   = useState({ naturalWidth: 1, naturalHeight: 1 });

  // ── DRAG & DROP ──────────────────────────────────────────────────────────
  const onDrop = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1
  });

  // ── HF GRADIO API REQUEST ────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const client = await Client.connect(HF_SPACE);

      // ✅ Pass a clean Blob — Gradio client handles base64 encoding internally
      const cleanBlob = new Blob([await file.arrayBuffer()], { type: file.type });

      const response = await client.predict("/predict", { image: cleanBlob });

      console.log("HF RAW RESPONSE:", response);

      if (!response?.data?.[0]) {
        throw new Error("Invalid response format from Hugging Face API.");
      }

      const payload = response.data[0];

      if (payload.error) {
        throw new Error(payload.error);
      }

      setResult(payload);
    } catch (error) {
      console.error("Gradio API Error:", error);
      const msg = error.message || JSON.stringify(error);
      alert(
        `Prediction failed!\n\nDetails: ${msg}\n\nCheck the HuggingFace Space → Logs tab for the full Python error.`
      );
    } finally {
      setLoading(false);
    }
  };

  // ── PDF EXPORT ────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const pdf      = new jsPDF("p", "mm", "a4");
      const pdfWidth  = pdf.internal.pageSize.getWidth();
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

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const handleImageLoad = (e) => {
    setDimensions({
      naturalWidth:  e.target.naturalWidth,
      naturalHeight: e.target.naturalHeight
    });
  };

  const getEstimatedCost = (damageType, severity) => {
    const type = damageType.toLowerCase();
    if (type === "scratch") {
      if (severity === "Minor")    return 1000;
      if (severity === "Moderate") return 3500;
      if (severity === "Severe")   return 10500;
    }
    if (type === "dent") {
      if (severity === "Minor")    return 2000;
      if (severity === "Moderate") return 5500;
      if (severity === "Severe")   return 14000;
    }
    if (severity === "Severe")   return 8000;
    if (severity === "Moderate") return 4500;
    if (severity === "Minor")    return 1500;
    return 1000;
  };

  const getSeverityStyles = (severity) => {
    if (severity === "Severe")   return { color: "#dc2626", bg: "#fee2e2", border: "#f87171" };
    if (severity === "Moderate") return { color: "#d97706", bg: "#fef3c7", border: "#fbbf24" };
    if (severity === "Minor")    return { color: "#16a34a", bg: "#dcfce7", border: "#4ade80" };
    return { color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" };
  };

  // ── DERIVED STATE ─────────────────────────────────────────────────────────
  let totalRepairCost  = 0;
  let highestSeverity  = "None";
  let avgConfidence    = 0;
  let inspectionStatus = "Clear";
  let insuranceRisk    = "Low";

  if (result?.detections?.length > 0) {
    result.detections.forEach((item) => {
      totalRepairCost += getEstimatedCost(item.damage_type, item.severity);
    });

    const severities = result.detections.map((d) => d.severity);
    if (severities.includes("Severe")) {
      highestSeverity  = "Severe";
      inspectionStatus = "Action Required - Major";
      insuranceRisk    = "High";
    } else if (severities.includes("Moderate")) {
      highestSeverity  = "Moderate";
      inspectionStatus = "Action Required - Minor";
      insuranceRisk    = "Medium";
    } else {
      highestSeverity  = "Minor";
      inspectionStatus = "Review Recommended";
      insuranceRisk    = "Low";
    }

    avgConfidence =
      result.detections.reduce((acc, curr) => acc + curr.confidence, 0) /
      result.detections.length;
  }

  // Stable report ID — regenerates only when result changes
  const reportId = useMemo(() => `REP-${Math.floor(Math.random() * 1000000)}`, [result]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "40px", fontFamily: "Arial, system-ui, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: "48px", marginBottom: "40px" }}>
        AI Car Damage Detection
      </h1>

      {/* UPLOAD ZONE */}
      <div
        {...getRootProps()}
        style={{
          border: "3px dashed #94a3b8",
          padding: "50px",
          borderRadius: "20px",
          textAlign: "center",
          background: "white",
          cursor: "pointer",
          maxWidth: "700px",
          margin: "0 auto"
        }}
      >
        <input {...getInputProps()} />
        <h2>Upload Car Image</h2>
        <p>Drag & Drop or Click</p>
      </div>

      {/* IMAGE PREVIEW */}
      {preview && (
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <img
            src={preview}
            alt="preview"
            style={{ width: "600px", maxWidth: "100%", borderRadius: "20px" }}
          />
          <br />
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              marginTop: "20px",
              padding: "15px 30px",
              border: "none",
              borderRadius: "12px",
              background: loading ? "#94a3b8" : "#2563eb",
              color: "white",
              fontSize: "18px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Analyzing…" : "Detect Damage"}
          </button>
        </div>
      )}

      {/* RESULTS */}
      {result && (
        <motion.div
          id="report-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: "50px",
            maxWidth: "1000px",
            marginInline: "auto",
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            color: "#1e293b",
            WebkitFontSmoothing: "antialiased"
          }}
        >
          {/* PAGE 1 */}
          <div
            id="pdf-page-1"
            style={{ background: "white", borderRadius: "24px", padding: "50px", boxShadow: "0 20px 40px rgba(0,0,0,0.06)", marginBottom: "30px" }}
          >
            {/* HEADER */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", borderBottom: "2px solid #f1f5f9", paddingBottom: "30px", flexWrap: "wrap", gap: "16px" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}></div>
                  <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>DamageVision AI</h1>
                </div>
                <p style={{ margin: 0, color: "#64748b", fontSize: "15px", fontWeight: "500" }}>
                  Automated Vehicle Inspection Report
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-block",
                    background: inspectionStatus.includes("Action") ? "#fee2e2" : "#dcfce7",
                    color: inspectionStatus.includes("Action") ? "#dc2626" : "#16a34a",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "14px",
                    fontWeight: "700",
                    marginBottom: "12px"
                  }}
                >
                  {inspectionStatus}
                </div>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
                  Report ID: <strong>{reportId}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                  Scanned: <strong>{new Date().toLocaleString()}</strong>
                </p>
              </div>
            </div>

            {/* SCAN SUMMARY */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", marginBottom: "40px" }}>
              {[
                { label: "Total Damages",   value: result.total_damages,                    color: "#1e293b" },
                { label: "Highest Severity",value: highestSeverity,                         color: getSeverityStyles(highestSeverity).color },
                { label: "Estimated Cost",  value: `₹${totalRepairCost.toLocaleString()}`,  color: "#16a34a" },
                { label: "AI Confidence",   value: `${(avgConfidence * 100).toFixed(1)}%`,  color: "#3b82f6" }
              ].map((stat, i) => (
                <div key={i} style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {stat.label}
                  </p>
                  <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", fontWeight: "800", color: stat.color }}>
                    {stat.value}
                  </h3>
                </div>
              ))}
            </div>

            {/* DETECTED ISSUES TABLE */}
            <div style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px", color: "#0f172a" }}>
                Detection Details
              </h2>
              <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "16px 24px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Damage Type</th>
                      <th style={{ padding: "16px 24px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Severity</th>
                      <th style={{ padding: "16px 24px", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Confidence Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detections.map((item, index) => {
                      const styles = getSeverityStyles(item.severity);
                      return (
                        <tr key={index} style={{ borderBottom: index === result.detections.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                          <td style={{ padding: "16px 24px", fontWeight: "600", color: "#334155", textTransform: "capitalize" }}>
                            {item.damage_type.replace(/_/g, " ")}
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <span style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, padding: "6px 12px", borderRadius: "999px", fontSize: "13px", fontWeight: "700" }}>
                              {item.severity}
                            </span>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                                <div style={{ width: `${item.confidence * 100}%`, height: "100%", background: styles.color, borderRadius: "999px" }}></div>
                              </div>
                              <span style={{ width: "40px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                                {(item.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {result.detections.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                          No damage detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ANALYSIS & RISK */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", marginBottom: "40px" }}>
              <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>📋</span> AI Analysis Notes
                </h3>
                <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: "1.6" }}>
                  The DamageVision AI model processed this image with an average confidence of{" "}
                  <strong>{(avgConfidence * 100).toFixed(1)}%</strong>.{" "}
                  {highestSeverity === "Severe"
                    ? "Critical damage detected — immediate attention required."
                    : "Detected issues are moderate to minor; a physical inspection is recommended to confirm AI findings."}
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>🛡️</span> Estimated Insurance Risk
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: insuranceRisk === "High" ? "#dc2626" : insuranceRisk === "Medium" ? "#d97706" : "#16a34a" }}>
                    {insuranceRisk} Risk
                  </span>
                </div>
                <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: "1.6" }}>
                  Based on {result.total_damages} detected damage(s), the estimated repair cost is{" "}
                  <strong>₹{totalRepairCost.toLocaleString()}</strong>.{" "}
                  {insuranceRisk === "High"
                    ? "High likelihood of a substantial claim."
                    : "Standard processing recommended."}
                </p>
              </div>
            </div>
          </div>

          {/* PAGE 2 */}
          <div
            id="pdf-page-2"
            style={{ background: "white", borderRadius: "24px", padding: "50px", boxShadow: "0 20px 40px rgba(0,0,0,0.06)", marginBottom: "30px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>Visual Inspection</h2>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
                Report ID: <strong>{reportId}</strong>
              </p>
            </div>

            {/* ANNOTATED IMAGE */}
            <div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "24px", borderRadius: "20px", textAlign: "center" }}>
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                  <img
                    ref={imageRef}
                    src={preview}
                    alt="Analyzed"
                    onLoad={handleImageLoad}
                    style={{ width: "100%", maxHeight: "500px", objectFit: "contain", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", display: "block" }}
                  />

                  {result.detections.map((item, index) => {
                    const box    = item.bounding_box;
                    const styles = getSeverityStyles(item.severity);
                    const left   = (box.x1 / dimensions.naturalWidth)  * 100;
                    const top    = (box.y1 / dimensions.naturalHeight) * 100;
                    const width  = ((box.x2 - box.x1) / dimensions.naturalWidth)  * 100;
                    const height = ((box.y2 - box.y1) / dimensions.naturalHeight) * 100;

                    return (
                      <div
                        key={index}
                        style={{
                          position: "absolute",
                          left: `${left}%`, top: `${top}%`,
                          width: `${width}%`, height: `${height}%`,
                          border: `2px solid ${styles.border}`,
                          backgroundColor: `${styles.bg}30`,
                          borderRadius: "6px",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)"
                        }}
                      >
                        <div
                          style={{
                            position: "absolute", top: "-32px", left: "-2px",
                            background: "white", color: styles.color,
                            border: `1px solid ${styles.border}`,
                            padding: "4px 10px", fontSize: "12px", fontWeight: "700",
                            borderRadius: "8px", whiteSpace: "nowrap",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                            zIndex: 10, display: "flex", alignItems: "center", gap: "6px"
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: styles.color }}></span>
                          <span style={{ textTransform: "capitalize" }}>{item.damage_type.replace(/_/g, " ")}</span>
                          <span style={{ color: "#cbd5e1" }}>|</span>
                          <span>{(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER & EXPORT */}
          <div
            data-html2canvas-ignore="true"
            style={{ textAlign: "center", borderTop: "2px solid #f1f5f9", paddingTop: "30px", marginTop: "20px" }}
          >
            <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "24px" }}>
              This report is generated automatically by DamageVision AI and is for informational purposes only.
            </p>
            <button
              onClick={downloadPDF}
              disabled={isExporting}
              style={{
                padding: "16px 36px",
                background: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: isExporting ? "not-allowed" : "pointer",
                boxShadow: "0 10px 20px rgba(15,23,42,0.15)",
                transition: "transform 0.2s",
                opacity: isExporting ? 0.7 : 1
              }}
              onMouseOver={(e) => { if (!isExporting) e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e)  => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {isExporting ? "Generating PDF…" : "Export Professional PDF"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default App;