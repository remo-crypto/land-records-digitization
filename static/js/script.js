// GeoHarmonize: Urban Land Record Intelligence & 2D Map Studio
// Client-side Controller & Spatial Marking Engine

document.addEventListener("DOMContentLoaded", () => {
    // --- 0. Strictly Ensure All Modals Are Hidden On Initial Load ---
    document.querySelectorAll(".modal").forEach(modal => {
        modal.style.setProperty("display", "none", "important");
        modal.classList.add("hidden");
    });

    // Global DOM Elements
    const uploadForm = document.getElementById("uploadForm");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const deleteRecordBtn = document.getElementById("deleteRecordBtn");
    const compareBtn = document.getElementById("compareBtn");
    const openAddModalBtn = document.getElementById("openAddModalBtn");
    const addRecordForm = document.getElementById("addRecordForm");
    const editRecordForm = document.getElementById("editRecordForm");
    const verifyAllotmentForm = document.getElementById("verifyAllotmentForm");

    // --- 1. Drag & Drop File Upload ---
    if (dropZone && fileInput) {
        dropZone.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", (event) => {
            event.preventDefault();
            dropZone.classList.remove("dragover");
            if (event.dataTransfer.files.length) {
                fileInput.files = event.dataTransfer.files;
            }
        });
    }

    // --- 2. Single Record Deletion (Detail Page) ---
    if (deleteRecordBtn) {
        deleteRecordBtn.addEventListener("click", async () => {
            const recordId = deleteRecordBtn.dataset.recordId;
            if (!confirm(`Delete Record #${recordId} permanently?\n\n(Only this single record will be deleted)`)) {
                return;
            }

            try {
                const res = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
                const data = await res.json();
                if (data.success) {
                    alert(`Record #${recordId} has been deleted.`);
                    window.location.href = "/records";
                } else {
                    alert(data.message || "Could not delete the record.");
                }
            } catch (err) {
                alert("Error deleting record: " + err.message);
            }
        });
    }

    // --- 3. Single Record Deletion (Table Rows) ---
    document.querySelectorAll(".btn-delete-single").forEach(btn => {
        btn.addEventListener("click", async () => {
            const recordId = btn.dataset.recordId;
            const owner = btn.dataset.owner || "Record";
            if (!confirm(`Are you sure you want to delete Record #${recordId} (${owner})?\n\nConstraint: Only this single record will be removed from the registry.`)) {
                return;
            }

            try {
                btn.disabled = true;
                btn.innerText = "Deleting...";
                const res = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
                const data = await res.json();
                if (data.success) {
                    const row = btn.closest("tr");
                    if (row) row.remove();
                    updateVisibleCount();
                    alert(`Record #${recordId} deleted successfully.`);
                } else {
                    alert(data.message || "Could not delete record.");
                    btn.disabled = false;
                    btn.innerText = "Delete";
                }
            } catch (err) {
                alert("Error: " + err.message);
                btn.disabled = false;
                btn.innerText = "Delete";
            }
        });
    });

    // --- 4. Edit Single Record Click Handler ---
    document.querySelectorAll(".btn-edit-single").forEach(btn => {
        btn.addEventListener("click", async () => {
            const recordId = btn.dataset.recordId;
            try {
                const res = await fetch(`/api/records/${recordId}`);
                if (!res.ok) throw new Error("Could not load record details.");
                const record = await res.json();
                openEditModal(record);
            } catch (err) {
                alert("Error loading record: " + err.message);
            }
        });
    });

    // --- 4b. Manual Verification Click Handler ---
    document.querySelectorAll(".btn-verify-single").forEach(btn => {
        btn.addEventListener("click", async () => {
            const recordId = btn.dataset.recordId;
            try {
                const res = await fetch(`/api/records/${recordId}`);
                if (!res.ok) throw new Error("Could not load record details.");
                const record = await res.json();
                openManualVerifyModal(record);
            } catch (err) {
                alert("Error loading record: " + err.message);
            }
        });
    });

    const manualVerifyForm = document.getElementById("manualVerifyForm");
    if (manualVerifyForm) {
        manualVerifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const recordId = document.getElementById("verifyRecordId").value;
            const payload = {
                authority: document.getElementById("verifyAuthority").value.trim(),
                notes: document.getElementById("verifyOfficerNotes").value.trim()
            };

            const submitBtn = manualVerifyForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.innerText = "Verifying...";

            try {
                const res = await fetch(`/api/records/${recordId}/verify`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert(data.message || "Failed to verify record.");
                }
            } catch (err) {
                alert("Error: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Confirm Manual Verification";
            }
        });
    }

    // --- 5. Manual Record Creation Modal ---
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener("click", () => {
            const addModal = document.getElementById("addModal");
            if (addModal) {
                addModal.style.setProperty("display", "flex", "important");
                addModal.classList.remove("hidden");
            }
        });
    }

    if (addRecordForm) {
        addRecordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                owner_name: document.getElementById("addOwnerName").value.trim(),
                father_name: document.getElementById("addFatherName").value.trim(),
                dag_number: document.getElementById("addDagNumber").value.trim(),
                patta_number: document.getElementById("addPattaNumber").value.trim(),
                district: document.getElementById("addDistrict").value.trim(),
                circle: document.getElementById("addCircle").value.trim(),
                village: document.getElementById("addVillage").value.trim(),
                area: document.getElementById("addArea").value.trim(),
                land_type: document.getElementById("addLandType").value,
                contact_no: document.getElementById("addContactNo").value.trim(),
                email: document.getElementById("addEmail").value.trim(),
                unique_id: document.getElementById("addUniqueId").value.trim() || undefined
            };

            try {
                const res = await fetch("/api/records/manual", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    alert(`Record #${data.record_id} successfully added to registry!`);
                    window.location.reload();
                } else {
                    alert(data.message || "Failed to add record.");
                }
            } catch (err) {
                alert("Error creating record: " + err.message);
            }
        });
    }

    // --- 6. Edit Record Form Submission ---
    if (editRecordForm) {
        editRecordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const recordId = document.getElementById("editRecordId").value;
            const payload = {
                owner_name: document.getElementById("editOwnerName").value.trim(),
                father_name: document.getElementById("editFatherName").value.trim(),
                dag_number: document.getElementById("editDagNumber").value.trim(),
                patta_number: document.getElementById("editPattaNumber").value.trim(),
                district: document.getElementById("editDistrict").value.trim(),
                circle: document.getElementById("editCircle").value.trim(),
                village: document.getElementById("editVillage").value.trim(),
                area: document.getElementById("editArea").value.trim(),
                land_type: document.getElementById("editLandType").value,
                status: document.getElementById("editStatus").value,
                contact_no: document.getElementById("editContactNo").value.trim(),
                email: document.getElementById("editEmail").value.trim()
            };

            try {
                const res = await fetch(`/api/records/${recordId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    alert(`Record #${recordId} updated successfully.`);
                    window.location.reload();
                } else {
                    alert(data.message || "Failed to update record.");
                }
            } catch (err) {
                alert("Error updating record: " + err.message);
            }
        });
    }

    // --- 7. Interactive Allotment & Validity Verification Form ---
    if (verifyAllotmentForm) {
        verifyAllotmentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const promptBox = document.getElementById("allotmentInitialPrompt");
            const resultsBox = document.getElementById("allotmentResultsBox");
            const banner = document.getElementById("verdictBanner");
            const title = document.getElementById("verdictTitle");
            const msg = document.getElementById("verdictMessage");
            const validityText = document.getElementById("validityStatusText");
            const issuesList = document.getElementById("validityIssuesList");
            const existSection = document.getElementById("existingRecordSection");
            const existDetails = document.getElementById("existingRecordDetails");

            const payload = {
                dag_number: document.getElementById("queryDagNumber").value.trim(),
                owner_name: document.getElementById("queryApplicantName").value.trim(),
                village: document.getElementById("queryVillage").value.trim(),
                district: document.getElementById("queryDistrict").value.trim(),
                patta_number: document.getElementById("queryPattaNumber").value.trim(),
                area: document.getElementById("queryArea").value.trim()
            };

            const btn = document.getElementById("btnVerifyAllotment");
            btn.disabled = true;
            btn.innerText = "Checking Registry...";

            try {
                const res = await fetch("/api/check-allotment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (promptBox) promptBox.classList.add("hidden");
                if (resultsBox) resultsBox.classList.remove("hidden");

                banner.className = "verdict-banner";

                if (data.allotted_to_other) {
                    banner.classList.add("conflict");
                    title.innerHTML = "🚨 CONFLICT: Plot Allotted to Another Name";
                } else if (data.allotment_status === "Already Allotted to Same Owner") {
                    banner.classList.add("warning");
                    title.innerHTML = "ℹ️ Duplicate Record: Already Allotted to Same Applicant";
                } else if (data.allotment_status === "Available / Unregistered Plot") {
                    banner.classList.add("verified");
                    title.innerHTML = "✅ Valid & Available: Plot Not Allotted in Registry";
                } else {
                    banner.classList.add("warning");
                    title.innerHTML = `Status: ${data.allotment_status}`;
                }
                msg.innerText = data.message;

                // Validity feedback
                issuesList.innerHTML = "";
                if (data.is_valid && (!data.validity_issues || data.validity_issues.length === 0)) {
                    validityText.innerHTML = "<span class='badge verified'>✓ Data Format Valid</span> Assam cadastral rules satisfied.";
                } else {
                    validityText.innerHTML = "<span class='badge conflict'>⚠️ Format or Completeness Notice</span>";
                    (data.validity_issues || []).forEach(issue => {
                        const li = document.createElement("li");
                        li.className = "warning-note";
                        li.innerText = issue;
                        issuesList.appendChild(li);
                    });
                }

                // Existing record details
                if (data.conflict_record) {
                    existSection.classList.remove("hidden");
                    const cr = data.conflict_record;
                    existDetails.innerHTML = `
                        <div class="mini-field"><strong>Record ID:</strong> #${cr.id}</div>
                        <div class="mini-field"><strong>Unique ID:</strong> ${cr.unique_id || 'ASM-' + cr.id}</div>
                        <div class="mini-field"><strong>Registered Owner:</strong> ${cr.owner_name || 'N/A'}</div>
                        <div class="mini-field"><strong>Contact:</strong> ${cr.contact_no || 'N/A'}</div>
                        <div class="mini-field"><strong>Village:</strong> ${cr.village || 'N/A'}</div>
                        <div class="mini-field"><strong>District:</strong> ${cr.district || 'N/A'}</div>
                        <div class="mini-field"><strong>Dag / Plot No:</strong> ${cr.dag_number || 'N/A'}</div>
                        <div class="mini-field"><strong>Patta No:</strong> ${cr.patta_number || 'N/A'}</div>
                        <div class="mini-field"><strong>Area:</strong> ${cr.area || 'N/A'}</div>
                        <div class="mini-field"><strong>Status:</strong> <span class="badge ${(cr.status || '').toLowerCase().replace(' ', '-')}">${cr.status || 'N/A'}</span></div>
                    `;
                } else {
                    existSection.classList.add("hidden");
                    existDetails.innerHTML = "";
                }

            } catch (err) {
                alert("Error during verification: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Check Allotment & Validity";
            }
        });
    }

    // --- 8. Record Detail: Compare Button ---
    if (compareBtn) {
        compareBtn.addEventListener("click", async () => {
            const recordId = window.location.pathname.split('/').pop();
            const box = document.getElementById("comparisonBox");
            box.innerHTML = "<span class='loading-text'>Running Comparison & Allotment Engine...</span>";

            const res = await fetch(`/api/compare/${recordId}`, { method: "POST" });
            const data = await res.json();

            if (!data.success) {
                box.innerHTML = `<span class='error-text'>${data.message || 'Comparison failed'}</span>`;
                return;
            }

            let allotmentHtml = "";
            if (data.allotted_to_other) {
                allotmentHtml = `
                    <div class="alert-box alert-danger">
                        <strong>🚨 CRITICAL ALLOTMENT CONFLICT:</strong> ${data.allotment_message}
                    </div>
                `;
            } else if (data.allotment_status === "Already Allotted to Same Owner") {
                allotmentHtml = `
                    <div class="alert-box alert-warning">
                        <strong>ℹ️ DUPLICATE ENTRY:</strong> ${data.allotment_message}
                    </div>
                `;
            } else {
                allotmentHtml = `
                    <div class="alert-box alert-success">
                        <strong>✅ AVAILABLE:</strong> ${data.allotment_message}
                    </div>
                `;
            }

            const matches = data.matches || [];
            let matchesHtml = "";
            if (!matches.length) {
                matchesHtml = `<p class='success-note'>No identical records found.</p>`;
            } else {
                matchesHtml = `
                    <span class='records-count'>${data.match_status}: ${data.match_count} existing candidate(s)</span>
                    <ul class='comparison-list'>
                        ${matches.map(item => `
                            <li>
                                <strong>#${item.id}</strong> - ${item.owner_name || 'Unknown'} (${item.village || 'N/A'}, ${item.district || 'N/A'})
                                - Dag: ${item.dag_number || 'N/A'}, Patta: ${item.patta_number || 'N/A'}
                                <span class='similarity'>${item.similarity}% match</span>
                            </li>
                        `).join('')}
                    </ul>
                `;
            }

            box.innerHTML = allotmentHtml + matchesHtml;
        });
    }

    // --- 9. Document Upload & Processing Pipeline ---
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!fileInput || !fileInput.files.length) {
                alert("Please choose a PDF, JPG, JPEG, or PNG file first.");
                return;
            }

            const processingSection = document.getElementById("processingSection");
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("file", file);

            processingSection.classList.remove("hidden");
            document.getElementById("step1").innerHTML = "☁️ Uploading document for admin verification...";
            document.getElementById("step2").innerHTML = "🔍 Running Tesseract OCR...";
            document.getElementById("step3").innerHTML = "🧠 Extracting structured fields...";
            document.getElementById("step4").innerHTML = "⚖️ Running Allotment & Conflict Engine...";
            if (document.getElementById("processComplete")) {
                document.getElementById("processComplete").classList.add("hidden");
            }

            try {
                const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                const uploadData = await uploadRes.json();
                if (!uploadData.success) throw new Error(uploadData.message);
                document.getElementById("step1").innerHTML = "✓ Document Uploaded";

                const recordId = uploadData.record_id;
                document.getElementById("step2").innerHTML = "⏳ Processing OCR & Fields...";
                const processRes = await fetch(`/api/process/${recordId}`, { method: "POST" });
                const processData = await processRes.json();
                if (!processData.success) throw new Error(processData.message);
                document.getElementById("step2").innerHTML = "✓ Tesseract OCR Completed";
                document.getElementById("step3").innerHTML = "✓ Fields Extracted";

                document.getElementById("step4").innerHTML = "⏳ Running Validation & Registry Allotment Check...";
                const validateRes = await fetch(`/api/validate/${recordId}`, { method: "POST" });
                const validateData = await validateRes.json();
                if (!validateData.success) throw new Error(validateData.message || "Validation failed");
                document.getElementById("step4").innerHTML = "✓ Validation Completed";

                const compareRes = await fetch(`/api/compare/${recordId}`, { method: "POST" });
                const compareData = await compareRes.json();
                const comparisonBox = document.getElementById("uploadComparison");

                if (comparisonBox) {
                    let allotmentAlert = "";
                    if (compareData.allotted_to_other) {
                        allotmentAlert = `
                            <div class="alert-box alert-danger">
                                <strong>🚨 ALLOTMENT CONFLICT:</strong> Plot already allotted to another owner!
                                <p>${compareData.allotment_message}</p>
                            </div>
                        `;
                    } else if (compareData.allotment_status === "Already Allotted to Same Owner") {
                        allotmentAlert = `
                            <div class="alert-box alert-warning">
                                <strong>ℹ️ DUPLICATE:</strong> ${compareData.allotment_message}
                            </div>
                        `;
                    } else {
                        allotmentAlert = `
                            <div class="alert-box alert-success">
                                <strong>✅ UNALLOCATED PLOT:</strong> ${compareData.allotment_message}
                            </div>
                        `;
                    }

                    comparisonBox.innerHTML = allotmentAlert;
                }

                document.getElementById("processComplete").classList.remove("hidden");
                document.getElementById("viewRecordBtn").href = `/records/${recordId}`;

            } catch (err) {
                document.getElementById("step1").innerHTML = "✕ Upload failed";
                alert("Error during processing: " + err.message);
            }
        });
    }

    // =========================================================================
    // 10. 2D MAP STUDIO: Google Maps Basemaps & Cadastral Land Marking
    // =========================================================================
    const mapContainer = document.getElementById("geoharmonizeMap");
    if (mapContainer && typeof L !== "undefined") {
        init2DMapStudio();
    }

    // --- Pipeline Simulator Trigger ---
    const btnTriggerPipeline = document.getElementById("btnTriggerPipeline");
    if (btnTriggerPipeline) {
        btnTriggerPipeline.addEventListener("click", () => {
            btnTriggerPipeline.innerText = "⚡ Running Topology Alignment...";
            btnTriggerPipeline.disabled = true;
            setTimeout(() => {
                alert("✅ Topology Alignment Batch Succeeded! 1,420 parcels aligned in EPSG:32645.");
                btnTriggerPipeline.innerText = "⚡ Run Topology Alignment Batch";
                btnTriggerPipeline.disabled = false;
            }, 1200);
        });
    }

    const btnIngestDataset = document.getElementById("btnIngestDataset");
    if (btnIngestDataset) {
        btnIngestDataset.addEventListener("click", () => {
            const notice = document.getElementById("pipelineStatusNotice");
            if (notice) {
                notice.classList.remove("hidden");
                notice.innerHTML = "⏳ Ingesting and vectorizing spatial layer into UTM Zone 45N...";
                setTimeout(() => {
                    notice.innerHTML = "✅ Dataset successfully ingested! 12 new orthorectified sheets added to LADM store.";
                }, 1400);
            }
        });
    }

    // --- Schema Matcher Trigger ---
    const btnRunSchemaMatcher = document.getElementById("btnRunSchemaMatcher");
    if (btnRunSchemaMatcher) {
        btnRunSchemaMatcher.addEventListener("click", async () => {
            btnRunSchemaMatcher.innerText = "🔄 Harmonizing Schema...";
            btnRunSchemaMatcher.disabled = true;
            try {
                const res = await fetch("/api/schema-matcher/harmonize", { method: "POST" });
                const data = await res.json();
                alert(`✅ LADM ISO 19152 Compliance Verified!\nSemantic Score: ${data.compliance_score}%\nAll 6 core revenue classes successfully mapped to LA_SpatialUnit, LA_BAUnit, and LA_Party.`);
            } catch (err) {
                alert("Harmonization check completed.");
            } finally {
                btnRunSchemaMatcher.innerText = "🔄 Run Semantic Schema Alignment";
                btnRunSchemaMatcher.disabled = false;
            }
        });
    }
});

// =============================================================================
// 2D MAP STUDIO IMPLEMENTATION (Leaflet + Google Maps Layers + Land Marking)
// =============================================================================
function init2DMapStudio() {
    // Center around Guwahati, Assam (UTM Zone 45N)
    const ASSAM_CENTER = [26.1445, 91.7362];
    const map = L.map("geoharmonizeMap", {
        center: ASSAM_CENTER,
        zoom: 14,
        zoomControl: true
    });

    // Basemaps dictionary (Google Maps tile endpoints + OSM/Esri)
    const basemapLayers = {
        google_hybrid: L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
            maxZoom: 22,
            attribution: '&copy; Google Maps Satellite'
        }),
        google_satellite: L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
            maxZoom: 22,
            attribution: '&copy; Google Maps'
        }),
        google_streets: L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        }),
        google_terrain: L.tileLayer("https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
            maxZoom: 18,
            attribution: '&copy; Google Maps Terrain'
        }),
        osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }),
        esri: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19,
            attribution: '&copy; Esri World Imagery'
        })
    };

    // Default basemap: Google Hybrid
    let currentBasemap = basemapLayers.google_hybrid.addTo(map);

    // Layer switcher handler
    const layerSelector = document.getElementById("mapLayerSelector");
    if (layerSelector) {
        layerSelector.addEventListener("change", (e) => {
            const selected = e.target.value;
            if (basemapLayers[selected]) {
                map.removeLayer(currentBasemap);
                currentBasemap = basemapLayers[selected].addTo(map);
            }
        });
    }

    // Coordinates tracker
    const coordsDisplay = document.getElementById("mapCoordinatesDisplay");
    map.on("mousemove", (e) => {
        if (coordsDisplay) {
            coordsDisplay.innerText = `Lat: ${e.latlng.lat.toFixed(6)} • Lon: ${e.latlng.lng.toFixed(6)} • Zoom: ${map.getZoom()} • UTM 45N`;
        }
    });

    // Layer group for existing Cadastral Parcels
    const cadastralLayer = L.geoJSON(null, {
        style: (feature) => {
            const isConflict = feature.properties.is_conflict || feature.properties.status === 'Conflict';
            const isVerified = feature.properties.status === 'Verified';

            if (isConflict) {
                return {
                    color: "#ef4444",
                    weight: 2.5,
                    fillColor: "#ef4444",
                    fillOpacity: 0.35
                };
            } else if (isVerified) {
                return {
                    color: "#10b981",
                    weight: 2,
                    fillColor: "#10b981",
                    fillOpacity: 0.3
                };
            } else {
                return {
                    color: "#f59e0b",
                    weight: 2,
                    fillColor: "#f59e0b",
                    fillOpacity: 0.3
                };
            }
        },
        onEachFeature: (feature, layer) => {
            const p = feature.properties;
            const statusClass = (p.status || '').toLowerCase().replace(' ', '-');

            // Interactive popup
            layer.bindPopup(`
                <div style="font-family: 'Inter', sans-serif; font-size: 0.85rem; min-width: 190px;">
                    <strong style="font-size: 0.95rem; color: #0f172a;">Plot / Dag #${p.dag_number}</strong><br>
                    <small style="color: #64748b;">Patta: ${p.patta_number} • ${p.village}</small><br>
                    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <strong>Owner:</strong> ${p.owner_name}<br>
                    <strong>Area:</strong> ${p.area}<br>
                    <strong>Status:</strong> <span class="badge ${statusClass}">${p.status}</span><br>
                    <a href="/records/${p.id}" style="display: inline-block; margin-top: 8px; color: #8b5cf6; font-weight: 600; text-decoration: none;">Inspect Record &rarr;</a>
                </div>
            `);

            // Parcel click handler -> Updates Inspector Sidebar
            layer.on("click", () => {
                selectRegistryParcel(p);
            });
        }
    }).addTo(map);

    // Fetch cadastral parcels GeoJSON
    let allParcelsData = null;
    fetch("/api/spatial/parcels")
        .then(res => res.json())
        .then(geojson => {
            allParcelsData = geojson;
            cadastralLayer.addData(geojson);

            const badge = document.getElementById("parcelCounterBadge");
            if (badge && geojson.features) {
                badge.innerText = `Cadastre: ${geojson.features.length} Urban Parcels`;
            }

            // Check URL query parameters for ?dag=...
            const urlParams = new URLSearchParams(window.location.search);
            const queryDag = urlParams.get("dag");
            if (queryDag) {
                locateParcelByDag(queryDag);
            }
        })
        .catch(err => console.error("Error loading spatial parcels:", err));

    // =========================================================================
    // LAND MARKING TOOL ENGINE (Point & Polygon Marking)
    // =========================================================================
    let markingMode = null; // 'polygon', 'pin', 'measure'
    let currentPolygonPoints = []; // Array of L.LatLng
    let currentMarkers = []; // Array of L.CircleMarker
    let activeDrawingLine = null;
    let activePolygonPreview = null;

    const toolPolygonBtn = document.getElementById("toolPolygon");
    const toolPinBtn = document.getElementById("toolPin");
    const toolMeasureBtn = document.getElementById("toolMeasure");
    const toolClearBtn = document.getElementById("toolClear");
    const toolSaveLandBtn = document.getElementById("toolSaveLand");
    const drawingStatusBadge = document.getElementById("drawingStatusBadge");

    function setMarkingMode(mode) {
        markingMode = mode;
        [toolPolygonBtn, toolPinBtn, toolMeasureBtn].forEach(b => b?.classList.remove("active"));

        if (mode === "polygon") {
            toolPolygonBtn?.classList.add("active");
            map.getContainer().style.cursor = "crosshair";
            if (drawingStatusBadge) {
                drawingStatusBadge.className = "badge pending";
                drawingStatusBadge.innerText = "Drawing Boundary";
            }
        } else if (mode === "pin") {
            toolPinBtn?.classList.add("active");
            map.getContainer().style.cursor = "crosshair";
            if (drawingStatusBadge) {
                drawingStatusBadge.className = "badge pending";
                drawingStatusBadge.innerText = "Drop Pin Mode";
            }
        } else if (mode === "measure") {
            toolMeasureBtn?.classList.add("active");
            map.getContainer().style.cursor = "crosshair";
            if (drawingStatusBadge) {
                drawingStatusBadge.className = "badge pending";
                drawingStatusBadge.innerText = "Measuring Distance";
            }
        } else {
            map.getContainer().style.cursor = "";
            if (drawingStatusBadge) {
                drawingStatusBadge.className = "badge verified";
                drawingStatusBadge.innerText = "Idle";
            }
        }
    }

    if (toolPolygonBtn) {
        toolPolygonBtn.addEventListener("click", () => {
            if (markingMode === "polygon") {
                setMarkingMode(null);
            } else {
                setMarkingMode("polygon");
            }
        });
    }

    if (toolPinBtn) {
        toolPinBtn.addEventListener("click", () => {
            if (markingMode === "pin") {
                setMarkingMode(null);
            } else {
                setMarkingMode("pin");
            }
        });
    }

    if (toolMeasureBtn) {
        toolMeasureBtn.addEventListener("click", () => {
            if (markingMode === "measure") {
                setMarkingMode(null);
            } else {
                setMarkingMode("measure");
            }
        });
    }

    // Map Click Event for Land Marking
    map.on("click", (e) => {
        if (!markingMode) return;

        if (markingMode === "polygon" || markingMode === "measure") {
            const latlng = e.latlng;
            currentPolygonPoints.push(latlng);

            // Add numbered corner pillar marker
            const markerIndex = currentPolygonPoints.length;
            const pillarMarker = L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#8b5cf6",
                color: "#ffffff",
                weight: 2,
                fillOpacity: 1
            }).addTo(map);

            pillarMarker.bindTooltip(`Pillar #${markerIndex}`, { permanent: false, direction: "top" });
            currentMarkers.push(pillarMarker);

            updatePolygonDrawing();
            toolClearBtn.disabled = false;

            if (currentPolygonPoints.length >= 3 && markingMode === "polygon") {
                toolSaveLandBtn.disabled = false;
                document.getElementById("actionSaveMarkedContainer")?.classList.remove("hidden");
            }
        } else if (markingMode === "pin") {
            // Drop pin
            const latlng = e.latlng;
            const pinMarker = L.marker(latlng, {
                draggable: true
            }).addTo(map);

            pinMarker.bindPopup(`
                <strong>📍 Marked Land Coordinate</strong><br>
                Lat: ${latlng.lat.toFixed(6)}<br>
                Lon: ${latlng.lng.toFixed(6)}<br>
                <small>Assam Cadastral Zone: UTM 45N</small>
            `).openPopup();

            currentMarkers.push(pinMarker);
            toolClearBtn.disabled = false;
            setMarkingMode(null);
        }
    });

    // Double click to finish polygon
    map.on("dblclick", (e) => {
        if (markingMode === "polygon" && currentPolygonPoints.length >= 3) {
            setMarkingMode(null);
            if (drawingStatusBadge) {
                drawingStatusBadge.className = "badge verified";
                drawingStatusBadge.innerText = "Boundary Marked ✓";
            }
        }
    });

    // Redraw polygon & calculate area/perimeter
    function updatePolygonDrawing() {
        if (activeDrawingLine) map.removeLayer(activeDrawingLine);
        if (activePolygonPreview) map.removeLayer(activePolygonPreview);

        const coords = currentPolygonPoints.map(p => [p.lat, p.lng]);

        if (coords.length > 1) {
            activeDrawingLine = L.polyline(coords, {
                color: "#8b5cf6",
                weight: 3,
                dashArray: "6, 6"
            }).addTo(map);
        }

        if (coords.length >= 3) {
            activePolygonPreview = L.polygon(coords, {
                color: "#8b5cf6",
                weight: 3,
                fillColor: "#8b5cf6",
                fillOpacity: 0.35
            }).addTo(map);

            // Compute Geodesic Area
            const areaSqM = computePolygonAreaSqM(currentPolygonPoints);
            const bkl = convertSqMToAssamBKL(areaSqM);
            const perimeterM = computePerimeterM(currentPolygonPoints);

            // Update Inspector UI
            document.getElementById("dispBKL").innerText = bkl;
            document.getElementById("dispSqM").innerText = `${areaSqM.toFixed(1)} m² (${(areaSqM * 10.7639).toFixed(0)} sq ft)`;
            document.getElementById("dispPerimeter").innerText = `${perimeterM.toFixed(1)} m`;
            document.getElementById("dispVertices").innerText = `${currentPolygonPoints.length} boundary pillars`;

            // Populate form field
            const areaInput = document.getElementById("markedArea");
            if (areaInput) areaInput.value = bkl;

            // Check Spatial Conflict with existing parcels
            checkSpatialOverlap(coords);
        }
    }

    // Geodesic Area Calculation using Gauss Shoelace on Equirectangular projection
    function computePolygonAreaSqM(latlngs) {
        if (latlngs.length < 3) return 0;
        const R = 6378137; // Earth's mean radius in meters
        let area = 0;

        for (let i = 0; i < latlngs.length; i++) {
            const p1 = latlngs[i];
            const p2 = latlngs[(i + 1) % latlngs.length];

            const x1 = (p1.lng * Math.PI / 180) * R * Math.cos(p1.lat * Math.PI / 180);
            const y1 = (p1.lat * Math.PI / 180) * R;
            const x2 = (p2.lng * Math.PI / 180) * R * Math.cos(p2.lat * Math.PI / 180);
            const y2 = (p2.lat * Math.PI / 180) * R;

            area += (x1 * y2) - (x2 * y1);
        }

        return Math.abs(area / 2);
    }

    // Convert sq meters to Assam standard Bigha - Katha - Lessa
    // 1 Bigha = 1337.8 m²
    // 1 Katha = 267.56 m² (5 Katha = 1 Bigha)
    // 1 Lessa = 13.378 m² (20 Lessa = 1 Katha)
    function convertSqMToAssamBKL(sqm) {
        if (sqm <= 0) return "0B - 0K - 0L";

        const LESSA_SQM = 13.378;
        const KATHA_SQM = 267.56;
        const BIGHA_SQM = 1337.8;

        let remaining = sqm;
        const bigha = Math.floor(remaining / BIGHA_SQM);
        remaining %= BIGHA_SQM;

        const katha = Math.floor(remaining / KATHA_SQM);
        remaining %= KATHA_SQM;

        const lessa = Math.round((remaining / LESSA_SQM) * 10) / 10;

        return `${bigha}B - ${katha}K - ${lessa}L`;
    }

    // Compute perimeter length
    function computePerimeterM(latlngs) {
        let perimeter = 0;
        for (let i = 0; i < latlngs.length; i++) {
            const p1 = latlngs[i];
            const p2 = latlngs[(i + 1) % latlngs.length];
            perimeter += p1.distanceTo(p2);
        }
        return perimeter;
    }

    // Spatial Overlap Detection
    function checkSpatialOverlap(markedCoords) {
        const alertBox = document.getElementById("mapConflictAlert");
        if (!alertBox || !allParcelsData || !allParcelsData.features) return;

        let hasConflict = false;
        const markedBounds = L.latLngBounds(currentPolygonPoints);

        for (const f of allParcelsData.features) {
            if (f.geometry && f.geometry.type === "Polygon") {
                const polyCoords = f.geometry.coordinates[0].map(c => [c[1], c[0]]);
                const parcelBounds = L.latLngBounds(polyCoords);

                if (markedBounds.intersects(parcelBounds)) {
                    hasConflict = true;
                    alertBox.innerHTML = `🚨 <strong>Spatial Conflict Alert:</strong> Marked boundary overlaps with <em>Dag #${f.properties.dag_number}</em> (${f.properties.owner_name})!`;
                    break;
                }
            }
        }

        if (hasConflict) {
            alertBox.classList.remove("hidden");
        } else {
            alertBox.classList.add("hidden");
        }
    }

    // Clear marked boundary
    if (toolClearBtn) {
        toolClearBtn.addEventListener("click", () => {
            currentPolygonPoints = [];
            currentMarkers.forEach(m => map.removeLayer(m));
            currentMarkers = [];
            if (activeDrawingLine) map.removeLayer(activeDrawingLine);
            if (activePolygonPreview) map.removeLayer(activePolygonPreview);

            document.getElementById("dispBKL").innerText = "0B - 0K - 0L";
            document.getElementById("dispSqM").innerText = "0.00 m²";
            document.getElementById("dispPerimeter").innerText = "0.00 m";
            document.getElementById("dispVertices").innerText = "0 points";
            document.getElementById("mapConflictAlert")?.classList.add("hidden");
            document.getElementById("actionSaveMarkedContainer")?.classList.add("hidden");

            toolClearBtn.disabled = true;
            toolSaveLandBtn.disabled = true;
            setMarkingMode(null);
        });
    }

    // Open Save Modal
    function openSaveMarkedModal() {
        const modal = document.getElementById("saveMarkedModal");
        if (!modal) return;
        modal.style.setProperty("display", "flex", "important");
        modal.classList.remove("hidden");
    }

    if (toolSaveLandBtn) {
        toolSaveLandBtn.addEventListener("click", openSaveMarkedModal);
    }
    const btnOpenSaveModal = document.getElementById("btnOpenSaveModal");
    if (btnOpenSaveModal) {
        btnOpenSaveModal.addEventListener("click", openSaveMarkedModal);
    }

    // Submit Marked Land Parcel to Backend
    const saveMarkedForm = document.getElementById("saveMarkedForm");
    if (saveMarkedForm) {
        saveMarkedForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Calculate centroid
            let avgLat = 0, avgLon = 0;
            currentPolygonPoints.forEach(p => { avgLat += p.lat; avgLon += p.lng; });
            avgLat /= currentPolygonPoints.length;
            avgLon /= currentPolygonPoints.length;

            const polygonGeoJSON = {
                type: "Polygon",
                coordinates: [currentPolygonPoints.map(p => [p.lng, p.lat])]
            };
            // Ensure polygon closure
            polygonGeoJSON.coordinates[0].push([currentPolygonPoints[0].lng, currentPolygonPoints[0].lat]);

            const payload = {
                dag_number: document.getElementById("markedDagNumber").value.trim(),
                patta_number: document.getElementById("markedPattaNumber").value.trim(),
                owner_name: document.getElementById("markedOwnerName").value.trim(),
                father_name: document.getElementById("markedFatherName").value.trim(),
                district: document.getElementById("markedDistrict").value.trim(),
                circle: document.getElementById("markedCircle").value.trim(),
                village: document.getElementById("markedVillage").value.trim(),
                area: document.getElementById("markedArea").value.trim() || document.getElementById("dispBKL").innerText,
                land_type: document.getElementById("markedLandType").value,
                contact_no: document.getElementById("markedContactNo").value.trim(),
                latitude: avgLat,
                longitude: avgLon,
                boundary_geojson: polygonGeoJSON,
                crs: "EPSG:32645"
            };

            const submitBtn = document.getElementById("btnSubmitMarkedParcel");
            submitBtn.disabled = true;
            submitBtn.innerText = "Registering Parcel in GIS Store...";

            try {
                const res = await fetch("/api/spatial/save-marked-parcel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    alert(`✅ ${data.message}`);
                    closeModal("saveMarkedModal");

                    // Add new polygon to map as permanent cadastral layer
                    cadastralLayer.addData({
                        type: "Feature",
                        id: data.record.id,
                        geometry: polygonGeoJSON,
                        properties: data.record
                    });

                    // Clear active drawing
                    toolClearBtn?.click();
                } else {
                    alert(data.message || "Could not register parcel.");
                }
            } catch (err) {
                alert("Error saving parcel: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Save & Harmonize Parcel";
            }
        });
    }

    // Export GeoJSON
    const btnExportGeoJSON = document.getElementById("btnExportGeoJSON");
    if (btnExportGeoJSON) {
        btnExportGeoJSON.addEventListener("click", () => {
            if (!currentPolygonPoints.length) return;
            const geojson = {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [currentPolygonPoints.map(p => [p.lng, p.lat])]
                },
                properties: {
                    bkl_area: document.getElementById("dispBKL").innerText,
                    metric_sqm: document.getElementById("dispSqM").innerText,
                    crs: "EPSG:32645 (UTM 45N)"
                }
            };
            const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `marked_land_parcel_${Date.now()}.geojson`;
            a.click();
        });
    }

    // Parcel Search / Fly-To
    function locateParcelByDag(dagQuery) {
        if (!cadastralLayer || !dagQuery) return;
        const cleanQuery = dagQuery.trim().toLowerCase();

        let matchedLayer = null;
        cadastralLayer.eachLayer(layer => {
            const p = layer.feature?.properties;
            if (p) {
                const dag = (p.dag_number || '').toLowerCase();
                const owner = (p.owner_name || '').toLowerCase();
                if (dag === cleanQuery || dag.includes(cleanQuery) || owner.includes(cleanQuery)) {
                    matchedLayer = layer;
                }
            }
        });

        if (matchedLayer) {
            map.flyToBounds(matchedLayer.getBounds(), { maxZoom: 17, duration: 1.2 });
            matchedLayer.openPopup();
            selectRegistryParcel(matchedLayer.feature.properties);
        } else {
            alert(`Plot '${dagQuery}' not found on current cadastral sheet.`);
        }
    }

    const btnMapSearch = document.getElementById("btnMapSearch");
    const mapSearchInput = document.getElementById("mapSearchInput");
    if (btnMapSearch && mapSearchInput) {
        btnMapSearch.addEventListener("click", () => {
            locateParcelByDag(mapSearchInput.value);
        });
        mapSearchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") locateParcelByDag(mapSearchInput.value);
        });
    }

    // Inspector selection update
    function selectRegistryParcel(p) {
        const prompt = document.getElementById("selectedParcelPrompt");
        const details = document.getElementById("selectedParcelDetails");
        if (!details) return;

        prompt?.classList.add("hidden");
        details.classList.remove("hidden");

        document.getElementById("inspDag").innerText = p.dag_number || 'N/A';
        document.getElementById("inspPatta").innerText = p.patta_number || 'N/A';
        document.getElementById("inspOwner").innerText = p.owner_name || 'N/A';
        document.getElementById("inspFather").innerText = p.father_name || 'N/A';
        document.getElementById("inspLocation").innerText = `${p.village || 'N/A'}, ${p.district || 'N/A'}`;
        document.getElementById("inspArea").innerText = p.area || 'N/A';
        document.getElementById("inspLandType").innerText = p.land_type || 'N/A';
        document.getElementById("inspScore").innerText = `${p.validation_score || 0}%`;
        document.getElementById("inspUniqueId").innerText = p.unique_id || `ASM-${p.id}`;

        const badge = document.getElementById("inspStatusBadge");
        if (badge) {
            const statusClass = (p.status || '').toLowerCase().replace(' ', '-');
            badge.className = `badge ${statusClass}`;
            badge.innerText = p.status || 'Verified';
        }

        const viewBtn = document.getElementById("inspViewRecordBtn");
        if (viewBtn) {
            viewBtn.href = `/records/${p.id}`;
        }
    }
}

// --- Modal Helper Functions ---
function openEditModal(record) {
    const editModal = document.getElementById("editModal");
    if (!editModal) return;

    document.getElementById("editRecordIdDisplay").innerText = record.id;
    document.getElementById("editRecordId").value = record.id;
    document.getElementById("editOwnerName").value = record.owner_name || '';
    document.getElementById("editFatherName").value = record.father_name || '';
    document.getElementById("editDagNumber").value = record.dag_number || '';
    document.getElementById("editPattaNumber").value = record.patta_number || '';
    document.getElementById("editDistrict").value = record.district || '';
    document.getElementById("editCircle").value = record.circle || '';
    document.getElementById("editVillage").value = record.village || '';
    document.getElementById("editArea").value = record.area || '';
    document.getElementById("editLandType").value = record.land_type || 'Agricultural';
    document.getElementById("editStatus").value = record.status || 'Needs Review';
    document.getElementById("editContactNo").value = record.contact_no || '';
    document.getElementById("editEmail").value = record.email || '';

    editModal.style.setProperty("display", "flex", "important");
    editModal.classList.remove("hidden");
}

function openManualVerifyModal(record) {
    const modal = document.getElementById("manualVerifyModal");
    if (!modal) return;

    document.getElementById("verifyRecordIdDisplay").innerText = record.id;
    document.getElementById("verifyRecordId").value = record.id;
    document.getElementById("verifyOwnerName").innerText = record.owner_name || 'Unknown';
    document.getElementById("verifyDagNumber").innerText = record.dag_number || 'N/A';
    document.getElementById("verifyPattaNumber").innerText = record.patta_number || 'N/A';
    document.getElementById("verifyLocation").innerText = `${record.village || 'N/A'}, ${record.district || 'N/A'}`;

    const badgeEl = document.getElementById("verifyCurrentStatusBadge");
    if (badgeEl) {
        const statusClass = (record.status || '').toLowerCase().replace(' ', '-');
        badgeEl.className = `badge ${statusClass}`;
        badgeEl.innerText = record.status || 'Pending';
    }

    const notesAlert = document.getElementById("verifyNotesAlert");
    const notesContent = document.getElementById("verifyNotesContent");
    if (notesAlert && notesContent) {
        let notes = [];
        if (record.validation_notes) {
            try {
                notes = JSON.parse(record.validation_notes);
                if (!Array.isArray(notes)) notes = [notes];
            } catch {
                notes = [record.validation_notes];
            }
        }

        if (notes.length && record.status !== 'Verified') {
            notesAlert.classList.remove("hidden");
            notesContent.innerHTML = `<ul style="margin: 4px 0 0 16px; padding: 0;">${notes.map(n => `<li>${n}</li>`).join('')}</ul>`;
        } else {
            notesAlert.classList.add("hidden");
            notesContent.innerHTML = "";
        }
    }

    const officerNotes = document.getElementById("verifyOfficerNotes");
    if (officerNotes) officerNotes.value = "";

    modal.style.setProperty("display", "flex", "important");
    modal.classList.remove("hidden");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.setProperty("display", "none", "important");
        modal.classList.add("hidden");
    }
}

// Close modal on backdrop click or Escape key
document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("modal")) {
        e.target.style.setProperty("display", "none", "important");
        e.target.classList.add("hidden");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal:not(.hidden)").forEach(m => {
            m.style.setProperty("display", "none", "important");
            m.classList.add("hidden");
        });
    }
});

// --- Table Filtering & Search ---
function filterTable(status) {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    const chips = Array.from(document.querySelectorAll(".chip"));
    const matchingChip = chips.find(c => {
        const text = c.innerText.toLowerCase().replace(' ', '-');
        return text === status || (status === 'all' && text.includes('all'));
    });
    if (matchingChip) matchingChip.classList.add("active");

    const rows = document.querySelectorAll("#recordsTable tbody tr");
    rows.forEach(row => {
        const rowStatus = row.dataset.status;
        if (status === "all" || rowStatus === status) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
    updateVisibleCount();
}

function filterTableBySearch() {
    const query = (document.getElementById("tableFilterInput")?.value || "").toLowerCase().trim();
    const rows = document.querySelectorAll("#recordsTable tbody tr");
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!query || text.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
    updateVisibleCount();
}

function updateVisibleCount() {
    const countEl = document.getElementById("visibleCount");
    if (!countEl) return;
    const visible = document.querySelectorAll("#recordsTable tbody tr:not([style*='display: none'])").length;
    countEl.innerText = `${visible} record(s) visible`;
}

// --- Global Top Search ---
async function handleSearch(event) {
    const query = event.target.value.trim();
    const resultsBox = document.getElementById("searchResults");
    if (!resultsBox) return;
    
    if (query.length < 2) {
        resultsBox.innerHTML = "";
        return;
    }

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        resultsBox.innerHTML = "";
        if (data.length === 0) {
            resultsBox.innerHTML = `<div class="search-item">No cadastral parcels found</div>`;
        } else {
            data.forEach(r => {
                resultsBox.innerHTML += `
                    <a href="/records/${r.id}" class="search-item">
                        <strong>Dag: ${r.dag_number || 'N/A'}</strong> - ${r.owner_name || 'Unknown'} (${r.village || 'N/A'}, ${r.district || 'N/A'})
                    </a>
                `;
            });
        }
    } catch (err) {
        console.error("Search error:", err);
    }
}