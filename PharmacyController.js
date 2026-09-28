const PharmacyController = {

    /* ==========================================
       INITIALIZE
    ========================================== */

    init: function() {

        this.loadUser();

        this.render();

    },


    /* ==========================================
       LOAD USER
    ========================================== */

    loadUser: function() {

        const user =
            JSON.parse(
                localStorage.getItem(
                    "loggedInUser"
                )
            );


        if (user) {

            document.getElementById(
                "userName"
            ).innerText =
                user.name ||
                "Pharmacy";

        }

    },


    /* ==========================================
       GET DELIVERED BATCHES
    ========================================== */

    getBatches: function() {

        const batches =
            JSON.parse(
                localStorage.getItem(
                    "dispatchedBatches"
                )
            ) || [];


        return batches.filter(
            function(batch) {

                return String(
                    batch.status || ""
                ).toUpperCase() ===
                "DELIVERED";

            }
        );

    },


    /* ==========================================
       CHECK TEMPERATURE
    ========================================== */

    temperatureOK: function(batch) {

        const current =
            Number(
                batch.currentTemperature
            );

        const min =
            Number(
                batch.minTemperature
            );

        const max =
            Number(
                batch.maxTemperature
            );


        return (
            !isNaN(current) &&
            !isNaN(min) &&
            !isNaN(max) &&
            current >= min &&
            current <= max
        );

    },


    /* ==========================================
       CHECK EXPIRY
    ========================================== */

    expiryOK: function(batch) {

        if (!batch.expiryDate) {

            return true;

        }


        return (
            new Date(
                batch.expiryDate
            ) >= new Date()
        );

    },


    /* ==========================================
       CHECK VALIDITY
    ========================================== */

    isValid: function(batch) {

        return (
            this.temperatureOK(batch) &&
            this.expiryOK(batch) &&
            String(
                batch.temperatureStatus || ""
            ).toUpperCase() !==
            "ANOMALY"
        );

    },


    /* ==========================================
       DISPLAY BATCHES
    ========================================== */

    render: function() {

        const batches =
            this.getBatches();


        const search =
            document.getElementById(
                "searchInput"
            ).value
             .toLowerCase()
             .trim();


        const table =
            document.getElementById(
                "pharmacyTable"
            );


        const empty =
            document.getElementById(
                "emptyState"
            );


        table.innerHTML = "";


        const filtered =
            batches.filter(
                function(batch) {

                    return String(
                        batch.batchId || ""
                    )
                    .toLowerCase()
                    .includes(search);

                }
            );


        if (
            filtered.length === 0
        ) {

            empty.style.display =
                "block";

        } else {

            empty.style.display =
                "none";

        }


        let valid = 0;
        let alerts = 0;


        filtered.forEach(
            batch => {

                const medicineValid =
                    this.isValid(batch);


                if (
                    medicineValid
                ) {

                    valid++;

                } else {

                    alerts++;

                }


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        <strong>
                            ${batch.batchId || "-"}
                        </strong>
                    </td>


                    <td>
                        ${
                            batch.medicineName ||
                            batch.medicine ||
                            "-"
                        }
                    </td>


                    <td>
                        ${batch.manufacturer || "-"}
                    </td>


                    <td>
                        ${batch.quantity || "-"}
                    </td>


                    <td>
                        ${batch.expiryDate || "-"}
                    </td>


                    <td>
                        ${
                            batch.currentTemperature ??
                            "-"
                        }
                        °C
                    </td>


                    <td>

                        <span class="${
                            medicineValid
                                ? "valid"
                                : "alert"
                        }">

                            ${
                                medicineValid
                                    ? "✓ VALID"
                                    : "⚠ ALERT"
                            }

                        </span>

                    </td>


                    <td>

                        <button
                            class="verify-btn"
                            onclick="PharmacyController.verifyBatch('${batch.batchId}')">

                            Verify

                        </button>

                    </td>

                `;


                table.appendChild(row);

            }
        );


        /*
           Update dashboard
        */

        document.getElementById(
            "totalBatches"
        ).innerText =
            filtered.length;


        document.getElementById(
            "validCount"
        ).innerText =
            valid;


        document.getElementById(
            "alertCount"
        ).innerText =
            alerts;

    },


    /* ==========================================
       VERIFY BATCH
    ========================================== */

    verifyBatch: function(batchId) {

        if (!batchId) {

            batchId =
                document.getElementById(
                    "verifyBatchId"
                ).value.trim();

        }


        if (!batchId) {

            alert(
                "Please enter Batch ID."
            );

            return;

        }


        const batches =
            JSON.parse(
                localStorage.getItem(
                    "dispatchedBatches"
                )
            ) || [];


        const batch =
            batches.find(
                function(item) {

                    return String(
                        item.batchId
                    ) === String(
                        batchId
                    );

                }
            );


        const result =
            document.getElementById(
                "verificationResult"
            );


        if (!batch) {

            result.innerHTML = `

                <div class="alert">

                    ❌ Batch not found.

                </div>

            `;

            return;

        }


        const tempOK =
            this.temperatureOK(
                batch
            );


        const expiryOK =
            this.expiryOK(
                batch
            );


        const valid =
            this.isValid(
                batch
            );


        result.innerHTML = `

            <div class="${
                valid
                    ? "valid"
                    : "alert"
            }">

                <h3>

                    ${
                        valid
                            ? "✓ Medicine Verified"
                            : "⚠ Medicine Alert"
                    }

                </h3>


                <p>
                    <strong>Batch ID:</strong>
                    ${batch.batchId}
                </p>


                <p>
                    <strong>Medicine:</strong>
                    ${
                        batch.medicineName ||
                        batch.medicine ||
                        "-"
                    }
                </p>


                <p>
                    <strong>Manufacturer:</strong>
                    ${
                        batch.manufacturer ||
                        "-"
                    }
                </p>


                <p>
                    <strong>From:</strong>
                    ${
                        batch.from ||
                        "-"
                    }
                </p>


                <p>
                    <strong>To:</strong>
                    ${
                        batch.to ||
                        "-"
                    }
                </p>


                <p>
                    <strong>Temperature:</strong>
                    ${
                        batch.currentTemperature ??
                        "-"
                    } °C

                    ${
                        tempOK
                            ? "✓"
                            : "⚠"
                    }

                </p>


                <p>
                    <strong>Expiry:</strong>
                    ${
                        batch.expiryDate ||
                        "-"
                    }

                    ${
                        expiryOK
                            ? "✓"
                            : "⚠"
                    }

                </p>


                <p>
                    <strong>Transport Status:</strong>
                    ${
                        batch.status ||
                        "-"
                    }
                </p>

            </div>

        `;

    },


    /* ==========================================
       LOGOUT
    ========================================== */

    logout: function() {

        localStorage.removeItem(
            "loggedInUser"
        );


        window.location.href =
            "login.html";

    }

};


/* ==============================================
   AUTO REFRESH
================================================ */

window.addEventListener(
    "storage",
    function(event) {

        if (
            event.key ===
            "dispatchedBatches"
        ) {

            PharmacyController.render();

        }

    }
);


/*
   Refresh when coming back to the page
*/

window.addEventListener(
    "focus",
    function() {

        PharmacyController.render();

    }
);