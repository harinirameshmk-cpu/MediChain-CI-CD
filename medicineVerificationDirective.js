var app = angular.module("medicineApp");


app.directive(
    "medicineVerification",
    function() {

        return {

            restrict: "E",

            scope: true,

            template: `

                <section class="section">

                    <h2>
                        🔍 Verify Medicine
                    </h2>


                    <p>
                        Enter the medicine name and
                        Batch ID to verify its authenticity.
                    </p>


                    <div class="form-group">

                        <label>
                            Medicine Name
                        </label>


                        <input
                            type="text"
                            ng-model="medicineName"
                            placeholder="Enter Medicine Name">

                    </div>


                    <div class="form-group">

                        <label>
                            Batch ID
                        </label>


                        <div class="form-row">

                            <input
                                type="text"
                                ng-model="batchId"
                                placeholder="Enter Batch ID">


                            <button
                                ng-click="verifyMedicine()">

                                🔍 Verify Medicine

                            </button>

                        </div>

                    </div>


                    <!-- VALID -->

                    <div
                        class="result success"
                        ng-if="verificationResult === 'VALID'">

                        <h3 class="success-title">

                            ✓ Medicine is Authentic

                        </h3>


                        <p>

                            <strong>
                                Batch ID:
                            </strong>

                            {{verifiedBatch.batchId}}

                        </p>


                        <p>

                            <strong>
                                Medicine:
                            </strong>

                            {{
                                verifiedBatch.medicineName ||
                                verifiedBatch.medicine
                            }}

                        </p>


                        <p>

                            <strong>
                                Manufacturer:
                            </strong>

                            {{verifiedBatch.manufacturer}}

                        </p>


                        <p>

                            <strong>
                                Quantity:
                            </strong>

                            {{verifiedBatch.quantity}}

                        </p>


                        <p>

                            <strong>
                                Expiry:
                            </strong>

                            {{verifiedBatch.expiryDate}}

                        </p>


                        <p>

                            <strong>
                                Status:
                            </strong>

                            DELIVERED ✓

                        </p>

                    </div>


                    <!-- INVALID -->

                    <div
                        class="result warning"
                        ng-if="verificationResult === 'INVALID'">

                        <h3 class="warning-title">

                            ⚠ Medicine Verification Alert

                        </h3>


                        <p>

                            This medicine could not
                            be completely verified.

                        </p>


                        <p>

                            <strong>
                                Batch ID:
                            </strong>

                            {{verifiedBatch.batchId}}

                        </p>


                        <p>

                            <strong>
                                Status:
                            </strong>

                            {{verifiedBatch.status}}

                        </p>

                    </div>


                    <!-- NOT FOUND -->

                    <div
                        class="result warning"
                        ng-if="verificationResult === 'NOT_FOUND'">

                        <h3 class="warning-title">

                            ❌ Medicine Not Found

                        </h3>


                        <p>

                            No medicine batch was found
                            with this Batch ID.

                        </p>

                    </div>

                </section>

            `,


            link: function(
                scope,
                element,
                attrs
            ) {


                scope.verifyMedicine =
                    function() {


                        if (!scope.medicineName) {

                            alert(
                                "Please enter Medicine Name."
                            );

                            return;

                        }


                        if (!scope.batchId) {

                            alert(
                                "Please enter Batch ID."
                            );

                            return;

                        }


                        /*
                         * Send Batch ID to
                         * CustomerController
                         */

                        scope.$parent.customerBatchId =
                            scope.batchId;


                        /*
                         * Get dispatched batches
                         */

                        var batches =
                            JSON.parse(
                                localStorage.getItem(
                                    "dispatchedBatches"
                                )
                            ) || [];


                        /*
                         * Find batch
                         */

                        var batch =
                            batches.find(
                                function(item) {

                                    return String(
                                        item.batchId
                                    ).toLowerCase()
                                    ===
                                    String(
                                        scope.batchId
                                    ).toLowerCase();

                                }
                            );


                        /*
                         * Batch not found
                         */

                        if (!batch) {

                            scope.verificationResult =
                                "NOT_FOUND";

                            scope.verifiedBatch =
                                null;

                            return;

                        }


                        /*
                         * Medicine name
                         */

                        var storedMedicine =
                            String(
                                batch.medicineName ||
                                batch.medicine ||
                                ""
                            )
                            .toLowerCase()
                            .trim();


                        var enteredMedicine =
                            String(
                                scope.medicineName
                            )
                            .toLowerCase()
                            .trim();


                        /*
                         * Medicine mismatch
                         */

                        if (
                            storedMedicine !==
                            enteredMedicine
                        ) {

                            scope.verificationResult =
                                "INVALID";

                            scope.verifiedBatch =
                                batch;

                            return;

                        }


                        /*
                         * Only DELIVERED
                         * medicine can be verified
                         */

                        if (
                            String(
                                batch.status || ""
                            ).toUpperCase()
                            !==
                            "DELIVERED"
                        ) {

                            scope.verificationResult =
                                "INVALID";

                            scope.verifiedBatch =
                                batch;

                            return;

                        }


                        /*
                         * VALID
                         */

                        scope.verificationResult =
                            "VALID";

                        scope.verifiedBatch =
                            batch;

                    };

            }

        };

    }
);