import React, { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Client } from "@gradio/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function App() {

  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const imageRef = useRef(null);

  const [dimensions, setDimensions] = useState({
    naturalWidth: 1,
    naturalHeight: 1
  });

  // DRAG & DROP

  const onDrop = (acceptedFiles) => {

    const selectedFile = acceptedFiles[0];

    if (selectedFile) {

      setFile(selectedFile);

      setPreview(
        URL.createObjectURL(selectedFile)
      );

      setResult(null);
    }
  };

  const { getRootProps, getInputProps } =
    useDropzone({

      onDrop,

      accept: {
        "image/*": []
      }
    });

  // HF API REQUEST

  const handleUpload = async () => {

    if (!file) return;

    setLoading(true);

    try {

      const client =
        await Client.connect(
          "sarthak156/DamageVision"
        );

      const response =
        await client.predict(
          "/predict",
          {
            image: file
          }
        );

      console.log(
        "HF RESPONSE:",
        response
      );

      setResult(
        response.data[0]
      );

    } catch (error) {

      console.error(error);

      alert(
        "Prediction failed!"
      );

    } finally {

      setLoading(false);
    }
  };

  // PDF EXPORT

  const downloadPDF = async () => {

    const input =
      document.getElementById(
        "report-section"
      );

    const canvas =
      await html2canvas(input);

    const imgData =
      canvas.toDataURL(
        "image/png"
      );

    const pdf = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const pdfWidth =
      pdf.internal.pageSize.getWidth();

    const pdfHeight =
      (canvas.height * pdfWidth) /
      canvas.width;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      pdfWidth,
      pdfHeight
    );

    pdf.save(
      "car_damage_report.pdf"
    );
  };

  // IMAGE DIMENSIONS

  const handleImageLoad = (e) => {

    setDimensions({

      naturalWidth:
        e.target.naturalWidth,

      naturalHeight:
        e.target.naturalHeight
    });
  };

  // COST ESTIMATION

  const repairCosts = {

    dent: 250,

    scratch: 120,

    crack: 180,

    lamp_broken: 400,

    glass_shatter: 600,

    tire_flat: 150
  };

  let totalRepairCost = 0;

  if (
    result &&
    result.detections
  ) {

    result.detections.forEach(
      item => {

        totalRepairCost +=
          repairCosts[
            item.damage_type
          ] || 100;
      }
    );
  }

  // SEVERITY COLORS

  const getSeverityColor =
    (severity) => {

      if (
        severity === "Severe"
      ) return "#ef4444";

      if (
        severity === "Moderate"
      ) return "#f59e0b";

      return "#22c55e";
    };

  return (

    <div
      style={{
        minHeight: "100vh",

        background: "#f1f5f9",

        padding: "40px",

        fontFamily: "Arial"
      }}
    >

      <h1
        style={{
          textAlign: "center",

          fontSize: "48px",

          marginBottom: "40px"
        }}
      >
        AI Car Damage Detection
      </h1>

      {/* UPLOAD ZONE */}

      <div
        {...getRootProps()}
        style={{
          border:
            "3px dashed #94a3b8",

          padding: "50px",

          borderRadius: "20px",

          textAlign: "center",

          background: "white",

          cursor: "pointer",

          maxWidth: "700px",

          margin: "0 auto"
        }}
      >

        <input
          {...getInputProps()}
        />

        <h2>
          Upload Car Image
        </h2>

        <p>
          Drag & Drop or Click
        </p>

      </div>

      {/* IMAGE */}

      {preview && (

        <div
          style={{
            marginTop: "30px",

            textAlign: "center"
          }}
        >

          <img
            src={preview}

            alt="preview"

            style={{
              width: "600px",

              borderRadius: "20px"
            }}
          />

          <br />

          <button
            onClick={
              handleUpload
            }

            style={{
              marginTop: "20px",

              padding:
                "15px 30px",

              border: "none",

              borderRadius:
                "12px",

              background:
                "#2563eb",

              color: "white",

              fontSize: "18px",

              cursor: "pointer"
            }}
          >

            {loading
              ? "Analyzing..."
              : "Detect Damage"}

          </button>

        </div>
      )}

      {/* RESULTS */}

      {result && (

        <motion.div

          id="report-section"

          initial={{
            opacity: 0
          }}

          animate={{
            opacity: 1
          }}

          style={{
            marginTop: "50px",

            maxWidth: "1200px",

            marginInline: "auto"
          }}
        >

          <h2
            style={{
              textAlign: "center",

              marginBottom:
                "30px"
            }}
          >
            Detection Results
          </h2>

          {/* IMAGE */}

          <div
            style={{
              position:
                "relative",

              display:
                "inline-block",

              width: "100%"
            }}
          >

            <img
              ref={imageRef}

              src={preview}

              alt="Analyzed"

              onLoad={
                handleImageLoad
              }

              style={{
                width: "100%",

                borderRadius:
                  "20px"
              }}
            />

            {/* BOXES */}

            {result.detections.map(
              (
                item,
                index
              ) => {

                const box =
                  item.bounding_box;

                const color =
                  getSeverityColor(
                    item.severity
                  );

                const left =
                  (box.x1 /
                    dimensions.naturalWidth) *
                  100;

                const top =
                  (box.y1 /
                    dimensions.naturalHeight) *
                  100;

                const width =
                  ((box.x2 -
                    box.x1) /
                    dimensions.naturalWidth) *
                  100;

                const height =
                  ((box.y2 -
                    box.y1) /
                    dimensions.naturalHeight) *
                  100;

                return (

                  <div
                    key={index}

                    style={{
                      position:
                        "absolute",

                      left:
                        `${left}%`,

                      top:
                        `${top}%`,

                      width:
                        `${width}%`,

                      height:
                        `${height}%`,

                      border:
                        `4px solid ${color}`,

                      borderRadius:
                        "10px"
                    }}
                  >

                    <div
                      style={{
                        background:
                          color,

                        color:
                          "white",

                        padding:
                          "5px 10px",

                        fontSize:
                          "14px",

                        fontWeight:
                          "bold",

                        position:
                          "absolute",

                        top:
                          "-35px",

                        left:
                          "0",

                        borderRadius:
                          "8px"
                      }}
                    >

                      {
                        item.damage_type
                      }

                      {" "}

                      (
                      {(
                        item.confidence *
                        100
                      ).toFixed(0)}
                      %)

                    </div>

                  </div>
                );
              }
            )}

          </div>

          {/* DASHBOARD */}

          <div
            style={{
              marginTop: "40px",

              background:
                "white",

              padding: "30px",

              borderRadius:
                "20px"
            }}
          >

            <h2>
              Total Damages:
              {" "}
              {
                result.total_damages
              }
            </h2>

            <h1
              style={{
                color:
                  "#16a34a"
              }}
            >
              Estimated Repair Cost:
              {" "}
              $
              {
                totalRepairCost
              }
            </h1>

            {/* DAMAGE CARDS */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px,1fr))",

                gap: "20px",

                marginTop: "30px"
              }}
            >

              {result.detections.map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={index}

                    style={{
                      background:
                        "#f8fafc",

                      padding:
                        "20px",

                      borderRadius:
                        "15px",

                      borderLeft:
                        `8px solid ${getSeverityColor(item.severity)}`
                    }}
                  >

                    <h3>
                      {
                        item.damage_type
                      }
                    </h3>

                    <p>
                      Confidence:
                      {" "}
                      {(
                        item.confidence *
                        100
                      ).toFixed(1)}
                      %
                    </p>

                    <p>
                      Severity:
                      {" "}
                      {
                        item.severity
                      }
                    </p>

                  </div>
                )
              )}

            </div>

            {/* PDF BUTTON */}

            <div
              style={{
                textAlign:
                  "center",

                marginTop:
                  "30px"
              }}
            >

              <button
                onClick={
                  downloadPDF
                }

                style={{
                  padding:
                    "15px 30px",

                  background:
                    "#16a34a",

                  color:
                    "white",

                  border:
                    "none",

                  borderRadius:
                    "12px",

                  fontSize:
                    "18px",

                  cursor:
                    "pointer"
                }}
              >

                Export PDF Report

              </button>

            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
}

export default App;

