/* =====================================================
   MEDICHAIN TRANSPORT CONTROLLER
===================================================== */

const TransportController = {

    selectedBatchId: null,


    /* =================================================
       INITIALIZE
    ================================================= */

    init: function() {

        this.checkUser();

        this.render();

        this.updateStats();

    },


    /* =================================================
       CHECK LOGIN
    ================================================= */

    checkUser: function() {

        const user =
            JSON.parse(
                localStorage.getItem(
                    "loggedInUser"
                )
            );


        if (!user) {

            alert(
                "Please login first."
            );

            window.location.href =
                "login.html";

            return;

        }


        document.getElementById(
            "userName"
        ).innerText =
            user.name ||
            "Transporter";

    },


    /* =================================================
       GET BATCHES
    ================================================= */

    getBatches: function() {

        return JSON.parse(
            localStorage.getItem(
                "dispatchedBatches"
            )
        ) || [];

    },


    /* =================================================
       SAVE BATCHES
    ================================================= */

    saveBatches: function(
        batches
    ) {

        localStorage.setItem(
            "dispatchedBatches",
            JSON.stringify(
                batches
            )
        );

    },


    /* =================================================
       RENDER TABLE
    ================================================= */

    render: function() {

        const batches =
            this.getBatches();


        const searchInput =
            document.getElementById(
                "searchInput"
            );


        const search =
            searchInput
                ? searchInput.value
                    .toLowerCase()
                    .trim()
                : "";


        const table =
            document.getElementById(
                "transportTable"
            );


        const empty =
            document.getElementById(
                "emptyState"
            );


        table.innerHTML = "";


        const filtered =
            batches.filter(
                function(batch) {

                    const batchId =
                        String(
                            batch.batchId ||
                            ""
                        ).toLowerCase();


                    const medicine =
                        String(
                            batch.medicineName ||
                            batch.medicine ||
                            ""
                        ).toLowerCase();


                    return (
                        batchId.includes(search) ||
                        medicine.includes(search)
                    );

                }
            );



        if (
            filtered.length === 0
        ) {

            empty.style.display =
                "block";

            this.updateStats();

            return;

        }


        empty.style.display =
            "none";



        filtered.forEach(
            batch => {

                this.createRow(
                    batch,
                    table
                );

            }
        );


        this.updateStats();

    },


    /* =================================================
       CREATE TABLE ROW
    ================================================= */

    createRow: function(
        batch,
        table
    ) {

        const status =
            String(
                batch.status ||
                batch.distributionStatus ||
                "DISPATCHED"
            )
            .trim()
            .toUpperCase();


        let statusClass =
            "dispatched";


        if (
            status ===
            "IN_TRANSPORT"
        ) {

            statusClass =
                "transport";

        }


        if (
            status ===
            "DELIVERED"
        ) {

            statusClass =
                "delivered";

        }



        let action = "";



        /* =============================================
           DISPATCHED
        ============================================= */

        if (
            status ===
            "DISPATCHED"
        ) {

            action = `

                <button
                    class="start-btn"
                    onclick="TransportController.openStartModal('${batch.batchId}')">

                    🚚 Start Transport

                </button>

            `;

        }



        /* =============================================
           IN TRANSPORT
        ============================================= */

        else if (
            status ===
            "IN_TRANSPORT"
        ) {

            action = `

                <button
                    class="monitor-btn"
                    onclick="TransportController.openTempModal('${batch.batchId}')">

                    🌡️ Monitor

                </button>


                <button
                    class="complete-btn"
                    onclick="TransportController.completeDelivery('${batch.batchId}')">

                    ✓ Complete Delivery

                </button>

            `;

        }



        /* =============================================
           DELIVERED
        ============================================= */

        else if (
            status ===
            "DELIVERED"
        ) {

            action = `

                <span class="status delivered">

                    ✓ Delivered

                </span>

            `;

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
                    batch.minTemperature ??
                    "-"
                }

                °C -

                ${
                    batch.maxTemperature ??
                    "-"
                }

                °C

            </td>


            <td>

                ${
                    batch.currentTemperature ??
                    "-"
                }

                °C

            </td>


            <td>

                <span
                    class="status ${statusClass}">

                    ${status}

                </span>

            </td>


            <td>

                ${action}

            </td>

        `;


        table.appendChild(
            row
        );

    },


    /* =================================================
       UPDATE STATISTICS
    ================================================= */

    updateStats: function() {

        const batches =
            this.getBatches();


        let dispatched =
            0;


        let transporting =
            0;


        let delivered =
            0;



        batches.forEach(
            batch => {

                const status =
                    String(
                        batch.status ||
                        batch.distributionStatus ||
                        ""
                    )
                    .toUpperCase();


                if (
                    status ===
                    "DISPATCHED"
                ) {

                    dispatched++;

                }


                else if (
                    status ===
                    "IN_TRANSPORT"
                ) {

                    transporting++;

                }


                else if (
                    status ===
                    "DELIVERED"
                ) {

                    delivered++;

                }

            }
        );


        document.getElementById(
            "dispatchedCount"
        ).innerText =
            dispatched;


        document.getElementById(
            "transportCount"
        ).innerText =
            transporting;


        document.getElementById(
            "deliveredCount"
        ).innerText =
            delivered;

    },


    /* =================================================
       OPEN START TRANSPORT MODAL
    ================================================= */

    openStartModal: function(
        batchId
    ) {

        const batches =
            this.getBatches();


        const batch =
            batches.find(
                b =>
                    String(
                        b.batchId
                    ) ===
                    String(
                        batchId
                    )
            );


        if (!batch) {

            alert(
                "Batch not found."
            );

            return;

        }


        this.selectedBatchId =
            batchId;


        document.getElementById(
            "startBatchId"
        ).innerText =
            batch.batchId;


        document.getElementById(
            "startMedicine"
        ).innerText =
            batch.medicineName ||
            batch.medicine ||
            "-";


        document.getElementById(
            "startTemp"
        ).innerText =

            `${batch.minTemperature ?? "-"} °C - 
             ${batch.maxTemperature ?? "-"} °C`;


        document.getElementById(
            "fromLocation"
        ).value = "";


        document.getElementById(
            "toLocation"
        ).value = "";


        document.getElementById(
            "startModal"
        ).style.display =
            "flex";

    },


    /* =================================================
       START TRANSPORT
    ================================================= */

    startTransport: function() {

        const from =
            document.getElementById(
                "fromLocation"
            ).value.trim();


        const to =
            document.getElementById(
                "toLocation"
            ).value.trim();



        if (!from) {

            alert(
                "Please enter From location."
            );

            return;

        }


        if (!to) {

            alert(
                "Please enter To location."
            );

            return;

        }



        const batches =
            this.getBatches();


        const index =
            batches.findIndex(
                b =>
                    String(
                        b.batchId
                    ) ===
                    String(
                        this.selectedBatchId
                    )
            );


        if (index === -1) {

            alert(
                "Batch not found."
            );

            return;

        }



        /* UPDATE TRANSPORT */

        batches[index].from =
            from;


        batches[index].to =
            to;


        batches[index].status =
            "IN_TRANSPORT";


        batches[index].transportStatus =
            "IN_TRANSPORT";


        batches[index].transportStartedAt =
            new Date().toLocaleString();



        this.saveBatches(
            batches
        );



        /* ALSO UPDATE medicineRecords */

        this.updateMedicineRecords(
            batches[index],
            "IN_TRANSPORT"
        );



        alert(
            "🚚 Transport started successfully!"
        );


        this.closeStartModal();


        this.render();

    },


    /* =================================================
       OPEN TEMPERATURE MODAL
    ================================================= */

    openTempModal: function(
        batchId
    ) {

        const batches =
            this.getBatches();


        const batch =
            batches.find(
                b =>
                    String(
                        b.batchId
                    ) ===
                    String(
                        batchId
                    )
            );


        if (!batch) {

            alert(
                "Batch not found."
            );

            return;

        }


        this.selectedBatchId =
            batchId;


        document.getElementById(
            "tempBatchId"
        ).innerText =
            batch.batchId;


        document.getElementById(
            "tempMedicine"
        ).innerText =
            batch.medicineName ||
            batch.medicine ||
            "-";


        document.getElementById(
            "tempFrom"
        ).innerText =
            batch.from || "-";


        document.getElementById(
            "tempTo"
        ).innerText =
            batch.to || "-";


        document.getElementById(
            "allowedTemp"
        ).innerText =

            `${batch.minTemperature ?? "-"} °C - 
             ${batch.maxTemperature ?? "-"} °C`;


        document.getElementById(
            "currentTemperature"
        ).value =
            batch.currentTemperature ??
            "";


        document.getElementById(
            "tempMessage"
        ).innerHTML = "";


        document.getElementById(
            "tempModal"
        ).style.display =
            "flex";

    },


    /* =================================================
       SAVE TEMPERATURE
    ================================================= */

    saveTemperature: function() {

        const value =
            document.getElementById(
                "currentTemperature"
            ).value;


        if (value === "") {

            alert(
                "Please enter temperature."
            );

            return;

        }


        const temperature =
            Number(value);


        const batches =
            this.getBatches();


        const index =
            batches.findIndex(
                b =>
                    String(
                        b.batchId
                    ) ===
                    String(
                        this.selectedBatchId
                    )
            );


        if (index === -1) {

            alert(
                "Batch not found."
            );

            return;

        }


        const batch =
            batches[index];


        const min =
            Number(
                batch.minTemperature
            );


        const max =
            Number(
                batch.maxTemperature
            );


        const normal =
            temperature >= min &&
            temperature <= max;



        /* SAVE TEMPERATURE */

        batch.currentTemperature =
            temperature;


        batch.temperatureStatus =
            normal
                ? "NORMAL"
                : "ANOMALY";


        batch.lastTemperatureUpdate =
            new Date().toLocaleString();



        this.saveBatches(
            batches
        );



        /* UPDATE medicineRecords */

        this.updateMedicineRecords(
            batch,
            "IN_TRANSPORT"
        );



        const message =
            document.getElementById(
                "tempMessage"
            );


        if (normal) {

            message.className =
                "message normal";


            message.innerHTML =
                "✓ NORMAL - Temperature is within allowed range.";

        }

        else {

            message.className =
                "message danger";


            message.innerHTML =
                "⚠ ANOMALY - Temperature is outside allowed range.";


            alert(
                "⚠ Temperature anomaly detected!"
            );

        }


        this.render();

    },


    /* =================================================
       COMPLETE DELIVERY
    ================================================= */

    completeDelivery: function(
        batchId
    ) {

        const batches =
            this.getBatches();


        const index =
            batches.findIndex(
                b =>
                    String(
                        b.batchId
                    ) ===
                    String(
                        batchId
                    )
            );


        if (index === -1) {

            alert(
                "Batch not found."
            );

            return;

        }


        const batch =
            batches[index];



        /*
           Optional safety check:
           temperature must be available
        */

        if (
            batch.currentTemperature ===
            undefined ||
            batch.currentTemperature ===
            null ||
            batch.currentTemperature ===
            ""
        ) {

            const proceed =
                confirm(
                    "Temperature has not been recorded. Complete delivery anyway?"
                );


            if (!proceed) {

                return;

            }

        }



        /* UPDATE STATUS */

        batch.status =
            "DELIVERED";


        batch.transportStatus =
            "DELIVERED";


        batch.deliveryCompletedAt =
            new Date().toLocaleString();



        this.saveBatches(
            batches
        );



        /* UPDATE ORIGINAL RECORD */

        this.updateMedicineRecords(
            batch,
            "DELIVERED"
        );



        alert(
            "✓ Delivery completed successfully!\n\nThe batch is now available in Pharmacy."
        );


        this.render();

    },


    /* =================================================
       UPDATE medicineRecords
    ================================================= */

    updateMedicineRecords: function(
        batch,
        status
    ) {

        const medicines =
            JSON.parse(
                localStorage.getItem(
                    "medicineRecords"
                )
            ) || [];


        const index =
            medicines.findIndex(
                medicine =>
                    String(
                        medicine.batchId
                    ) ===
                    String(
                        batch.batchId
                    )
            );


        if (
            index === -1
        ) {

            return;

        }


        medicines[index].from =
            batch.from;


        medicines[index].to =
            batch.to;


        medicines[index].status =
            status;


        medicines[index].transportStatus =
            status;


        if (
            batch.currentTemperature !==
            undefined
        ) {

            medicines[index].currentTemperature =
                batch.currentTemperature;

        }


        if (
            batch.temperatureStatus
        ) {

            medicines[index].temperatureStatus =
                batch.temperatureStatus;

        }


        if (
            batch.transportStartedAt
        ) {

            medicines[index].transportStartedAt =
                batch.transportStartedAt;

        }


        if (
            batch.deliveryCompletedAt
        ) {

            medicines[index].deliveryCompletedAt =
                batch.deliveryCompletedAt;

        }


        localStorage.setItem(
            "medicineRecords",
            JSON.stringify(
                medicines
            )
        );

    },


    /* =================================================
       CLOSE START MODAL
    ================================================= */

    closeStartModal: function() {

        document.getElementById(
            "startModal"
        ).style.display =
            "none";

    },


    /* =================================================
       CLOSE TEMP MODAL
    ================================================= */

    closeTempModal: function() {

        document.getElementById(
            "tempModal"
        ).style.display =
            "none";

    },


    /* =================================================
       LOGOUT
    ================================================= */

    logout: function() {

        localStorage.removeItem(
            "loggedInUser"
        );


        window.location.href =
            "login.html";

    }

};



/* =====================================================
   AUTOMATIC UPDATE
===================================================== */

window.addEventListener(
    "storage",
    function(event) {

        if (
            event.key ===
            "dispatchedBatches"
        ) {

            TransportController.render();

        }

    }
);



/*
   Refresh when returning to page
*/

window.addEventListener(
    "focus",
    function() {

        TransportController.render();

    }
);