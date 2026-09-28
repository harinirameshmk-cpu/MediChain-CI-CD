var app = angular.module("medicineApp");

app.controller(
    "CustomerController",
    function($scope, MedicineService) {
        $scope.search = {
            batchId: '',
            medicineName: ''
        };
        $scope.blockchainResult = null;
        $scope.result = null;
        $scope.errorMessage = '';
        $scope.isSearching = false;

        $scope.verifyMedicine = function() {
            var batchId = $scope.search.batchId || $scope.customerBatchId;
            var medName = $scope.search.medicineName || $scope.customerMedicineName;

            if (!batchId) {
                alert("Please enter Batch ID first.");
                return;
            }

            $scope.isSearching = true;
            $scope.errorMessage = '';

            MedicineService.verifyMedicine(batchId, medName).then(function(res) {
                $scope.isSearching = false;
                if (res.data && res.data.success) {
                    $scope.result = res.data;
                    $scope.blockchainResult = {
                        manufacturer: res.data.medicine.manufacturer || "-",
                        distributionStatus: res.data.medicine.status || "VERIFIED",
                        status: res.data.verdict
                    };
                } else {
                    $scope.errorMessage = res.data.message || 'Verification failed.';
                }
            }, function(err) {
                $scope.isSearching = false;
                $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Batch not found in blockchain registry.';
            });
        };

        $scope.verifyBlockchain = function() {
            $scope.verifyMedicine();
        };
    }
);