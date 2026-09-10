// Land Record Intelligence & Verification System - Client Scripts

document.addEventListener("DOMContentLoaded", () => {
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

    // --- 5. Manual Record Creation Modal ---
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener("click", () => {
            const addModal = document.getElementById("addModal");
            if (addModal) addModal.classList.remove("hidden");
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
});

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

    editModal.classList.remove("hidden");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
}

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
            resultsBox.innerHTML = `<div class="search-item">No records found</div>`;
        } else {
            data.forEach(r => {
                resultsBox.innerHTML += `
                    <a href="/records/${r.id}" class="search-item">
                        <strong>Dag: ${r.dag_number || 'N/A'}</strong> - ${r.owner_name || 'Unknown'} (${r.village || 'N/A'})
                    </a>
                `;
            });
        }
    } catch (err) {
        console.error("Search error:", err);
    }
}