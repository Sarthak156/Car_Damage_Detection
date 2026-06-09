import { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function App() {

  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const imageRef = useRef(null);

  const reportRef = useRef(null);


  // DRAG & DROP
  const onDrop = (acceptedFiles) => {

    const selectedFile = acceptedFiles[0];

    setFile(selectedFile);

    setPreview(
      URL.createObjectURL(selectedFile)
    );

    setResult(null);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({

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

      alert("Prediction failed!");

    } finally {

      setLoading(false);
    }
  };


  // IMAGE SCALE
  const displayedWidth =
    imageRef.current?.width || 700;

  const displayedHeight =
    imageRef.current?.height || 700;

  const naturalWidth =
    imageRef.current?.naturalWidth || 700;

  const naturalHeight =
    imageRef.current?.naturalHeight || 700;

  const scaleX =
    displayedWidth / naturalWidth;

  const scaleY =
    displayedHeight / naturalHeight;


  // AI SUMMARY
  let summary = "";

  let highestSeverity = "Minor";

  if (result && result.detections.length > 0) {

    const damageTypes =
      result.detections.map(
        item => item.damage_type
      );

    if (
      result.detections.some(
        item => item.severity === "Severe"
      )
    ) {

      highestSeverity = "Severe";

    } else if (

      result.detections.some(
        item => item.severity === "Moderate"
      )

    ) {

      highestSeverity = "Moderate";
    }

    summary = `
      ${result.total_damages}
      damage(s) detected.

      Primary damages include:
      ${damageTypes.join(", ")}.

      Overall severity level:
      ${highestSeverity}.

      Damage analysis completed successfully.
    `;
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

      totalRepairCost +=
        repairCosts[item.damage_type] || 100;
    });
  }


  // PDF EXPORT
  const downloadPDF = async () => {

    const input = reportRef.current;

    const canvas =
      await html2canvas(input);

    const imgData =
      canvas.toDataURL("image/png");

    const pdf = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const pdfWidth =
      pdf.internal.pageSize.getWidth();

    const pdfHeight =
      ((canvas.height * pdfWidth)
      / canvas.width) * 0.90;

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


  return (

    <div
      ref={reportRef}

      style={{
        padding: "30px",

        fontFamily: "Arial",

        textAlign: "center",

        backgroundColor: "#f5f7fb",

        minHeight: "100vh",

        color: "#111827"
      }}
    >

      {/* TITLE */}
      <h1
        style={{
          fontSize: "48px",

          marginBottom: "20px"
        }}
      >
        AI Car Damage Detection
      </h1>


      {/* UPLOAD ZONE */}
      <div
        {...getRootProps()}

        style={{

          border:
            isDragActive
              ? "3px solid #2563eb"
              : "3px dashed #9ca3af",

          padding: "40px",

          borderRadius: "20px",

          backgroundColor: "white",

          cursor: "pointer",

          maxWidth: "600px",

          margin: "0 auto",

          transition: "0.3s",

          boxShadow:
            "0px 4px 15px rgba(0,0,0,0.1)"
        }}
      >

        <input {...getInputProps()} />

        <h2>
          Upload Car Image
        </h2>

        <p>
          Drag & drop a car image here
        </p>

        <p>
          or click to browse
        </p>

      </div>

      <br />


      {/* DETECT BUTTON */}
      <button
        onClick={handleUpload}

        disabled={loading}

        style={{

          padding: "12px 25px",

          fontSize: "18px",

          borderRadius: "10px",

          border: "none",

          cursor: "pointer",

          backgroundColor:
            loading
              ? "#9ca3af"
              : "#2563eb",

          color: "white",

          transition: "0.3s",

          boxShadow:
            "0px 4px 10px rgba(0,0,0,0.1)"
        }}
      >

        {loading
          ? "Analyzing Car..."
          : "Detect Damage"}

      </button>


      {/* PDF BUTTON */}
      <br />
      <br />

      {result && (

        <button
          onClick={downloadPDF}

          style={{

            padding: "12px 25px",

            fontSize: "18px",

            borderRadius: "10px",

            border: "none",

            cursor: "pointer",

            backgroundColor: "#16a34a",

            color: "white",

            boxShadow:
              "0px 4px 10px rgba(0,0,0,0.1)"
          }}
        >

          Download PDF Report

        </button>
      )}

      <br />
      <br />


      {/* IMAGE SECTION */}
      {preview && (

        <div
          style={{
            position: "relative",

            display: "inline-block"
          }}
        >

          <img
            ref={imageRef}

            src={preview}

            alt="Preview"

            width="700"

            style={{
              borderRadius: "15px",

              boxShadow:
                "0px 4px 20px rgba(0,0,0,0.15)"
            }}
          />


          {/* BOUNDING BOXES */}
          {result &&
            result.detections.map(
              (item, index) => {

                const box =
                  item.bounding_box;

                return (

                  <div
                    key={index}

                    style={{

                      position: "absolute",

                      left:
                        `${box.x1 * scaleX}px`,

                      top:
                        `${box.y1 * scaleY}px`,

                      width:
                        `${(box.x2 - box.x1) * scaleX}px`,

                      height:
                        `${(box.y2 - box.y1) * scaleY}px`,

                      border:
                        item.severity === "Severe"
                          ? "4px solid red"
                          : item.severity === "Moderate"
                            ? "4px solid orange"
                            : "4px solid limegreen",

                      borderRadius:
                        "8px",

                      boxSizing:
                        "border-box"
                    }}
                  >

                    {/* LABEL */}
                    <div
                      style={{

                        backgroundColor:
                          item.severity === "Severe"
                            ? "red"
                            : item.severity === "Moderate"
                              ? "orange"
                              : "limegreen",

                        color: "white",

                        padding: "5px 10px",

                        fontSize: "14px",

                        fontWeight: "bold",

                        position: "absolute",

                        top: "-38px",

                        left: "0px",

                        borderRadius: "5px",

                        whiteSpace: "nowrap"
                      }}
                    >

                      {item.damage_type}
                      {" "}
                      (
                      {(item.confidence * 100).toFixed(0)}
                      %
                      )

                    </div>

                  </div>
                );
              }
            )
          }

        </div>
      )}

      <br />
      <br />


      {/* AI SUMMARY */}
      {result && (

        <div
          style={{
            backgroundColor: "white",

            padding: "25px",

            borderRadius: "20px",

            maxWidth: "800px",

            margin: "30px auto",

            textAlign: "left",

            boxShadow:
              "0px 4px 15px rgba(0,0,0,0.1)"
          }}
        >

          <h2
            style={{
              color: "#2563eb",

              marginBottom: "15px"
            }}
          >
            AI Inspection Summary
          </h2>

          <p
            style={{
              lineHeight: "1.8",

              fontSize: "18px"
            }}
          >
            {summary}
          </p>

        </div>
      )}


      {/* REPAIR COST */}
      {result && (

        <div
          style={{
            backgroundColor: "white",

            padding: "25px",

            borderRadius: "20px",

            maxWidth: "800px",

            margin: "30px auto",

            boxShadow:
              "0px 4px 15px rgba(0,0,0,0.1)"
          }}
        >

          <h2
            style={{
              color: "#16a34a",

              marginBottom: "15px"
            }}
          >
            Estimated Repair Cost
          </h2>

          <h1
            style={{
              fontSize: "48px",

              margin: "10px 0",

              color: "#111827"
            }}
          >
            $
            {totalRepairCost}
          </h1>

          <p
            style={{
              color: "#6b7280",

              fontSize: "18px"
            }}
          >
            Approximate repair estimate
            based on detected damages
          </p>

        </div>
      )}


      {/* DASHBOARD */}
      {result && (

        <div>

          <h2
            style={{
              marginBottom: "20px"
            }}
          >
            Detection Dashboard
          </h2>


          {/* SUMMARY CARD */}
          <div
            style={{
              display: "flex",

              justifyContent: "center",

              gap: "20px",

              flexWrap: "wrap"
            }}
          >

            <div
              style={{
                backgroundColor: "white",

                padding: "20px",

                borderRadius: "15px",

                width: "220px",

                boxShadow:
                  "0px 4px 15px rgba(0,0,0,0.1)"
              }}
            >

              <h3>Total Damages</h3>

              <p
                style={{
                  fontSize: "32px",

                  fontWeight: "bold",

                  color: "#2563eb"
                }}
              >
                {result.total_damages}
              </p>

            </div>

          </div>

          <br />


          {/* DETECTION CARDS */}
          {result.detections.map(
            (item, index) => (

              <div
                key={index}

                style={{
                  backgroundColor: "white",

                  padding: "20px",

                  margin: "15px auto",

                  borderRadius: "15px",

                  maxWidth: "500px",

                  textAlign: "left",

                  boxShadow:
                    "0px 4px 15px rgba(0,0,0,0.1)"
                }}
              >

                <h3
                  style={{
                    color: "#2563eb"
                  }}
                >
                  {item.damage_type}
                </h3>

                <p>
                  Severity:
                  {" "}
                  <strong>
                    {item.severity}
                  </strong>
                </p>

                <p>
                  Confidence:
                  {" "}
                  {(item.confidence * 100).toFixed(1)}
                  %
                </p>


                {/* CONFIDENCE BAR */}
                <div
                  style={{
                    backgroundColor: "#e5e7eb",

                    borderRadius: "10px",

                    overflow: "hidden",

                    height: "18px"
                  }}
                >

                  <div
                    style={{
                      width:
                        `${item.confidence * 100}%`,

                      backgroundColor: "#22c55e",

                      height: "100%"
                    }}
                  />

                </div>

              </div>
            )
          )}

        </div>
      )}

    </div>
  );
}

export default App;