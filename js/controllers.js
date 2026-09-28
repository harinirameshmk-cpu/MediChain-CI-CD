/**
 * MediChain AngularJS Controllers
 * Implements pure AngularJS data binding and REST API orchestration for all 5 roles + Customer Verification
 */

/* =========================================================
   NAVBAR CONTROLLER (Used across all role dashboards)
   ========================================================= */
app.controller('NavbarController', ['$scope', '$window', 'AuthService', 'AlertService', function($scope, $window, AuthService, AlertService) {
    $scope.user = AuthService.getUser() || { name: 'User', role: 'guest' };
    $scope.alerts = [];
    $scope.unreadCount = 0;
    $scope.showNotifDropdown = false;

    $scope.toggleNotif = function($event) {
        if ($event) $event.stopPropagation();
        $scope.showNotifDropdown = !$scope.showNotifDropdown;
    };

    $scope.logout = function() {
        AuthService.logout();
    };

    $scope.loadAlerts = function() {
        if (!$scope.user || $scope.user.role === 'guest') return;
        AlertService.getAlerts($scope.user.role).then(function(res) {
            if (res.data && res.data.success) {
                $scope.alerts = res.data.alerts || [];
                $scope.unreadCount = $scope.alerts.length;
            }
        }, function(err) {
            console.error("Alert load error:", err);
        });
    };

    // Close dropdown on click outside
    angular.element($window).on('click', function() {
        $scope.$apply(function() {
            $scope.showNotifDropdown = false;
        });
    });

    $scope.loadAlerts();
    // Poll alerts periodically
    var pollInterval = setInterval(function() {
        $scope.loadAlerts();
    }, 12000);

    $scope.$on('$destroy', function() {
        clearInterval(pollInterval);
    });
}]);

/* =========================================================
   LOGIN CONTROLLER
   ========================================================= */
app.controller('LoginController', ['$scope', 'AuthService', function($scope, AuthService) {
    $scope.credentials = {
        email: '',
        password: '',
        role: ''
    };
    $scope.errorMessage = '';
    $scope.successMessage = '';
    $scope.isLoading = false;

    // Quick fill helper for demo/testing
    $scope.fillDemo = function(role) {
        $scope.credentials.role = role;
        switch (role) {
            case 'manufacturer':
                $scope.credentials.email = 'manufacturer@medichain.com';
                $scope.credentials.password = 'manu12345';
                break;
            case 'distributor':
                $scope.credentials.email = 'distributor@medichain.com';
                $scope.credentials.password = 'dist12345';
                break;
            case 'transporter':
                $scope.credentials.email = 'transporter@medichain.com';
                $scope.credentials.password = 'trans12345';
                break;
            case 'pharmacy':
                $scope.credentials.email = 'pharmacy@medichain.com';
                $scope.credentials.password = 'pharm12345';
                break;
            case 'customer':
                $scope.credentials.email = 'customer@medichain.com';
                $scope.credentials.password = 'customer12345';
                break;
            case 'admin':
                $scope.credentials.email = 'admin@medichain.com';
                $scope.credentials.password = 'admin12345';
                break;
        }
        $scope.errorMessage = '';
    };

    $scope.handleLogin = function() {
        $scope.errorMessage = '';
        $scope.successMessage = '';

        if (!$scope.credentials.email || !$scope.credentials.password || !$scope.credentials.role) {
            $scope.errorMessage = 'Please enter your email, password, and select your role.';
            return;
        }

        $scope.isLoading = true;
        AuthService.login($scope.credentials).then(function(res) {
            $scope.isLoading = false;
            if (res.data && res.data.success) {
                $scope.successMessage = 'Login successful! Redirecting to your dashboard...';
                AuthService.setSession(res.data.token, res.data.user);
                setTimeout(function() {
                    AuthService.redirectToDashboard(res.data.user.role);
                }, 800);
            } else {
                $scope.errorMessage = res.data.message || 'Login failed. Please verify your credentials.';
            }
        }, function(err) {
            $scope.isLoading = false;
            $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Network error: could not connect to server.';
        });
    };
}]);

/* =========================================================
   REGISTER CONTROLLER
   ========================================================= */
app.controller('RegisterController', ['$scope', 'AuthService', function($scope, AuthService) {
    $scope.user = {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        organization: ''
    };
    $scope.errorMessage = '';
    $scope.successMessage = '';
    $scope.isLoading = false;

    $scope.selectRole = function(role) {
        $scope.user.role = role;
    };

    $scope.handleRegister = function() {
        $scope.errorMessage = '';
        $scope.successMessage = '';

        if (!$scope.user.name || !$scope.user.email || !$scope.user.password || !$scope.user.role) {
            $scope.errorMessage = 'Please complete all required fields.';
            return;
        }

        if ($scope.user.password.length < 8) {
            $scope.errorMessage = 'Password must be at least 8 characters in length.';
            return;
        }

        if ($scope.user.password !== $scope.user.confirmPassword) {
            $scope.errorMessage = 'Passwords do not match.';
            return;
        }

        $scope.isLoading = true;
        AuthService.register($scope.user).then(function(res) {
            $scope.isLoading = false;
            if (res.data && res.data.success) {
                $scope.successMessage = 'Registration successful! Initializing your account...';
                AuthService.setSession(res.data.token, res.data.user);
                setTimeout(function() {
                    AuthService.redirectToDashboard(res.data.user.role);
                }, 900);
            } else {
                $scope.errorMessage = res.data.message || 'Registration failed.';
            }
        }, function(err) {
            $scope.isLoading = false;
            $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Registration error: server unavailable.';
        });
    };
}]);

/* =========================================================
   MANUFACTURER CONTROLLER
   ========================================================= */
app.controller('ManufacturerController', ['$scope', 'AuthService', 'MedicineService', 'QrService', function($scope, AuthService, MedicineService, QrService) {
    $scope.currentUser = AuthService.requireAuth('manufacturer');
    if (!$scope.currentUser) return;

    var todayStr = new Date().toISOString().split('T')[0];
    var nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    var nextYearStr = nextYear.toISOString().split('T')[0];

    $scope.newMed = {
        batchId: '',
        medicineName: '',
        medicineType: 'Tablet',
        quantity: 1000,
        manufacturingDate: todayStr,
        expiryDate: nextYearStr,
        minTemperature: 2,
        maxTemperature: 8,
        description: 'Pharmaceutical grade formulation with cold-chain storage requirement.',
        certificate: ''
    };

    $scope.medicines = [];
    $scope.searchText = '';
    $scope.isMining = false;
    $scope.alertInfo = null;
    $scope.activeQrModal = false;
    $scope.selectedQrMed = null;
    $scope.qrCodeUrl = '';
    $scope.qrVerifyUrl = '';

    $scope.loadMedicines = function() {
        MedicineService.getManufacturerMedicines().then(function(res) {
            if (res.data && res.data.success) {
                $scope.medicines = res.data.medicines || [];
            }
        }, function(err) {
            console.error("Failed to load medicines:", err);
        });
    };

    $scope.registerMedicine = function() {
        $scope.alertInfo = null;

        var minT = Number($scope.newMed.minTemperature);
        var maxT = Number($scope.newMed.maxTemperature);

        if (minT > maxT) {
            $scope.alertInfo = {
                type: 'danger',
                title: 'Invalid Temperature Configuration',
                message: 'Minimum safe temperature cannot exceed Maximum safe temperature.'
            };
            return;
        }

        $scope.isMining = true;
        MedicineService.registerMedicine($scope.newMed).then(function(res) {
            $scope.isMining = false;
            if (res.data && res.data.success) {
                $scope.alertInfo = {
                    type: 'success',
                    title: '✓ Medicine Registered & Mined to Blockchain',
                    blockIndex: res.data.blockchain.index,
                    hash: res.data.blockchain.hash
                };

                // Reset form with next suggested batch
                var oldBatch = $scope.newMed.batchId;
                $scope.newMed.batchId = '';
                $scope.newMed.medicineName = '';
                $scope.newMed.certificate = '';
                $scope.loadMedicines();
            } else {
                $scope.alertInfo = {
                    type: 'danger',
                    title: 'Registration Error',
                    message: res.data.message || 'Could not register medicine.'
                };
            }
        }, function(err) {
            $scope.isMining = false;
            $scope.alertInfo = {
                type: 'danger',
                title: 'Registration Failed',
                message: (err.data && err.data.message) ? err.data.message : 'Server error occurred.'
            };
        });
    };

    $scope.showQrModal = function(med) {
        $scope.selectedQrMed = med;
        var verifyUrl = window.location.origin + '/customer.html?batch=' + encodeURIComponent(med.batchId) + '&name=' + encodeURIComponent(med.medicineName);
        $scope.qrVerifyUrl = verifyUrl;
        $scope.qrCodeUrl = QrService.generateQrUrl(verifyUrl);
        $scope.activeQrModal = true;
    };

    $scope.closeQrModal = function() {
        $scope.activeQrModal = false;
        $scope.selectedQrMed = null;
    };

    $scope.loadMedicines();
}]);

/* =========================================================
   DISTRIBUTOR CONTROLLER
   ========================================================= */
app.controller('DistributorController', ['$scope', 'AuthService', 'MedicineService', function($scope, AuthService, MedicineService) {
    $scope.currentUser = AuthService.requireAuth('distributor');
    if (!$scope.currentUser) return;

    $scope.batches = [];
    $scope.stats = {
        total: 0,
        ready: 0,
        inTransit: 0,
        alerts: 0
    };
    $scope.searchText = '';

    // Modals
    $scope.receiveModal = {
        visible: false,
        batch: null,
        receivedQuantity: null,
        warehouseLocation: 'Central Cold Storage Facility #4',
        error: '',
        mismatchAlert: false
    };

    $scope.dispatchModal = {
        visible: false,
        batch: null,
        transporter: 'ColdChain Express',
        vehicleNumber: 'TRK-COLD-8821',
        destination: 'CityCare Central Hospital Pharmacy',
        error: ''
    };

    $scope.loadBatches = function() {
        MedicineService.getDistributorBatches().then(function(res) {
            if (res.data && res.data.success) {
                $scope.batches = res.data.batches || [];
                $scope.calculateStats();
            }
        }, function(err) {
            console.error("Distributor batch load error:", err);
        });
    };

    $scope.calculateStats = function() {
        $scope.stats.total = $scope.batches.length;
        $scope.stats.ready = $scope.batches.filter(function(b) {
            return b.status === 'RECEIVED_BY_DISTRIBUTOR' || (b.shipment && b.shipment.status === 'READY_FOR_DISPATCH');
        }).length;
        $scope.stats.inTransit = $scope.batches.filter(function(b) {
            return b.currentStage === 'TRANSPORTER' || (b.shipment && b.shipment.status === 'IN_TRANSIT');
        }).length;
        $scope.stats.alerts = $scope.batches.filter(function(b) {
            return b.temperatureStatus === 'ANOMALY' || (b.shipment && b.shipment.temperatureStatus === 'ANOMALY');
        }).length;
    };

    $scope.openReceiveModal = function(batch) {
        $scope.receiveModal.batch = batch;
        $scope.receiveModal.receivedQuantity = batch.quantity;
        $scope.receiveModal.error = '';
        $scope.receiveModal.mismatchAlert = false;
        $scope.receiveModal.visible = true;
    };

    $scope.closeReceiveModal = function() {
        $scope.receiveModal.visible = false;
    };

    $scope.confirmReceive = function() {
        var modal = $scope.receiveModal;
        modal.error = '';
        modal.mismatchAlert = false;

        // Verify quantity with original record
        if (Number(modal.receivedQuantity) !== Number(modal.batch.quantity)) {
            modal.mismatchAlert = true;
            modal.error = "BLOCKCHAIN DATA MISMATCH: Declared quantity (" + modal.receivedQuantity + ") differs from original manufacturer record (" + modal.batch.quantity + "). System refuses to silently overwrite immutable blockchain origin data.";
            return;
        }

        MedicineService.distributorReceive(modal.batch.batchId, {
            receivedQuantity: modal.receivedQuantity,
            warehouseLocation: modal.warehouseLocation
        }).then(function(res) {
            if (res.data && res.data.success) {
                $scope.closeReceiveModal();
                $scope.loadBatches();
            } else {
                modal.error = res.data.message || 'Failed to receive batch.';
            }
        }, function(err) {
            modal.error = (err.data && err.data.message) ? err.data.message : 'Server error occurred.';
            if (err.data && err.data.isMismatch) {
                modal.mismatchAlert = true;
            }
        });
    };

    $scope.openDispatchModal = function(batch) {
        $scope.dispatchModal.batch = batch;
        $scope.dispatchModal.error = '';
        $scope.dispatchModal.visible = true;
    };

    $scope.closeDispatchModal = function() {
        $scope.dispatchModal.visible = false;
    };

    $scope.confirmDispatch = function() {
        var modal = $scope.dispatchModal;
        modal.error = '';

        MedicineService.distributorDispatch(modal.batch.batchId, {
            transporter: modal.transporter,
            vehicleNumber: modal.vehicleNumber,
            destination: modal.destination
        }).then(function(res) {
            if (res.data && res.data.success) {
                $scope.closeDispatchModal();
                $scope.loadBatches();
            } else {
                modal.error = res.data.message || 'Failed to dispatch shipment.';
            }
        }, function(err) {
            modal.error = (err.data && err.data.message) ? err.data.message : 'Server error occurred.';
        });
    };

    $scope.loadBatches();
}]);

/* =========================================================
   TRANSPORTER CONTROLLER
   ========================================================= */
app.controller('TransporterController', ['$scope', 'AuthService', 'MedicineService', 'MedicineFactory', function($scope, AuthService, MedicineService, MedicineFactory) {
    $scope.currentUser = AuthService.requireAuth('transporter');
    if (!$scope.currentUser) return;

    $scope.shipments = [];
    $scope.selectedBatchId = '';
    $scope.selectedShipment = null;

    $scope.stats = {
        active: 0,
        normal: 0,
        alerts: 0,
        delivered: 0
    };

    $scope.checkpoint = {
        currentTemperature: '',
        location: 'Highway Transit Checkpoint Alpha',
        vehicleNumber: 'TRK-COLD-8821',
        notes: ''
    };

    $scope.tempStatusPreview = null;
    $scope.actionMessage = null;
    $scope.isSaving = false;

    $scope.loadShipments = function() {
        MedicineService.getTransporterShipments().then(function(res) {
            if (res.data && res.data.success) {
                $scope.shipments = res.data.shipments || [];
                $scope.calculateStats();

                if ($scope.selectedBatchId) {
                    $scope.onSelectBatch();
                } else if ($scope.shipments.length > 0) {
                    $scope.selectedBatchId = $scope.shipments[0].batchId;
                    $scope.onSelectBatch();
                }
            }
        }, function(err) {
            console.error("Transporter shipments error:", err);
        });
    };

    $scope.calculateStats = function() {
        $scope.stats.active = $scope.shipments.filter(function(s) {
            return s.status === 'IN_TRANSIT' || s.status === 'READY_FOR_DISPATCH';
        }).length;
        $scope.stats.normal = $scope.shipments.filter(function(s) {
            return s.temperatureStatus === 'NORMAL';
        }).length;
        $scope.stats.alerts = $scope.shipments.filter(function(s) {
            return s.temperatureStatus === 'ANOMALY';
        }).length;
        $scope.stats.delivered = $scope.shipments.filter(function(s) {
            return s.status === 'DELIVERED' || s.stage === 'PHARMACY';
        }).length;
    };

    $scope.onSelectBatch = function() {
        $scope.selectedShipment = $scope.shipments.find(function(s) {
            return s.batchId === $scope.selectedBatchId;
        }) || null;

        if ($scope.selectedShipment && $scope.selectedShipment.vehicleNumber) {
            $scope.checkpoint.vehicleNumber = $scope.selectedShipment.vehicleNumber;
        }
        $scope.evalTemperature();
    };

    // Live real-time temperature evaluation as transporter enters reading
    $scope.evalTemperature = function() {
        if (!$scope.selectedShipment || !$scope.selectedShipment.medicine) {
            $scope.tempStatusPreview = null;
            return;
        }

        var tempVal = $scope.checkpoint.currentTemperature;
        if (tempVal === '' || tempVal === null || isNaN(tempVal)) {
            $scope.tempStatusPreview = null;
            return;
        }

        var minT = Number($scope.selectedShipment.medicine.minTemperature);
        var maxT = Number($scope.selectedShipment.medicine.maxTemperature);

        $scope.tempStatusPreview = MedicineFactory.evaluateTemperature(tempVal, minT, maxT);
    };

    $scope.recordCheckpoint = function() {
        $scope.actionMessage = null;
        if (!$scope.selectedShipment) {
            $scope.actionMessage = { type: 'danger', text: 'Please select a batch first.' };
            return;
        }

        if ($scope.checkpoint.currentTemperature === '' || isNaN($scope.checkpoint.currentTemperature)) {
            $scope.actionMessage = { type: 'danger', text: 'Please enter a valid temperature value.' };
            return;
        }

        $scope.isSaving = true;
        MedicineService.recordCheckpoint($scope.selectedShipment.batchId, $scope.checkpoint).then(function(res) {
            $scope.isSaving = false;
            if (res.data && res.data.success) {
                var isAnom = res.data.status === 'ANOMALY';
                $scope.actionMessage = {
                    type: isAnom ? 'warning' : 'success',
                    text: isAnom
                        ? '⚠ Anomaly logged! Block #' + res.data.blockchain.index + ' permanently recorded outside safe storage range.'
                        : '✓ Checkpoint recorded! Block #' + res.data.blockchain.index + ' successfully logged.'
                };
                $scope.checkpoint.currentTemperature = '';
                $scope.checkpoint.notes = '';
                $scope.tempStatusPreview = null;
                $scope.loadShipments();
            } else {
                $scope.actionMessage = { type: 'danger', text: res.data.message || 'Failed to record checkpoint.' };
            }
        }, function(err) {
            $scope.isSaving = false;
            $scope.actionMessage = {
                type: 'danger',
                text: (err.data && err.data.message) ? err.data.message : 'Server error occurred.'
            };
        });
    };

    $scope.deliverShipment = function() {
        $scope.actionMessage = null;
        if (!$scope.selectedShipment) return;

        $scope.isSaving = true;
        MedicineService.deliverShipment($scope.selectedShipment.batchId, {
            deliveredLocation: $scope.selectedShipment.destination
        }).then(function(res) {
            $scope.isSaving = false;
            if (res.data && res.data.success) {
                $scope.actionMessage = {
                    type: 'success',
                    text: '✓ Shipment delivered to Pharmacy! Block #' + res.data.blockchain.index + ' created.'
                };
                $scope.loadShipments();
            } else {
                $scope.actionMessage = { type: 'danger', text: res.data.message || 'Delivery failed.' };
            }
        }, function(err) {
            $scope.isSaving = false;
            $scope.actionMessage = {
                type: 'danger',
                text: (err.data && err.data.message) ? err.data.message : 'Server error occurred.'
            };
        });
    };

    $scope.loadShipments();
}]);

/* =========================================================
   PHARMACY CONTROLLER
   ========================================================= */
app.controller('PharmacyController', ['$scope', 'AuthService', 'MedicineService', function($scope, AuthService, MedicineService) {
    $scope.currentUser = AuthService.requireAuth('pharmacy');
    if (!$scope.currentUser) return;

    $scope.medicines = [];
    $scope.stats = {
        total: 0,
        valid: 0,
        alerts: 0,
        expiringSoon: 0
    };
    $scope.searchText = '';
    $scope.activeLogsModal = false;
    $scope.selectedMedLogs = null;
    $scope.actionMessage = null;

    $scope.loadIncoming = function() {
        MedicineService.getPharmacyIncoming().then(function(res) {
            if (res.data && res.data.success) {
                $scope.medicines = res.data.medicines || [];
                $scope.calculateStats();
            }
        }, function(err) {
            console.error("Pharmacy incoming load error:", err);
        });
    };

    $scope.calculateStats = function() {
        $scope.stats.total = $scope.medicines.length;
        $scope.stats.valid = $scope.medicines.filter(function(m) {
            return !m.hasTemperatureAnomaly && !m.isExpired;
        }).length;
        $scope.stats.alerts = $scope.medicines.filter(function(m) {
            return m.hasTemperatureAnomaly;
        }).length;
        $scope.stats.expiringSoon = $scope.medicines.filter(function(m) {
            return m.isExpired || (m.daysToExpiry !== null && m.daysToExpiry <= 30);
        }).length;
    };

    $scope.acceptBatch = function(batchId) {
        $scope.actionMessage = null;
        MedicineService.pharmacyReceive(batchId, {
            notes: 'Verified and stocked into pharmacy clinical inventory.'
        }).then(function(res) {
            if (res.data && res.data.success) {
                $scope.actionMessage = {
                    type: res.data.hasAnomaly ? 'warning' : 'success',
                    text: res.data.hasAnomaly
                        ? 'Batch received with permanent warning: ' + res.data.warning
                        : '✓ Batch accepted and verified in inventory. Block #' + res.data.blockchain.index + ' mined.'
                };
                $scope.loadIncoming();
            } else {
                $scope.actionMessage = { type: 'danger', text: res.data.message || 'Receive action failed.' };
            }
        }, function(err) {
            $scope.actionMessage = {
                type: 'danger',
                text: (err.data && err.data.message) ? err.data.message : 'Server error occurred.'
            };
        });
    };

    $scope.openLogsModal = function(med) {
        $scope.selectedMedLogs = med;
        $scope.activeLogsModal = true;
    };

    $scope.closeLogsModal = function() {
        $scope.activeLogsModal = false;
        $scope.selectedMedLogs = null;
    };

    $scope.loadIncoming();
}]);

/* =========================================================
   ADMIN CONTROLLER
   ========================================================= */
app.controller('AdminController', ['$scope', 'AuthService', 'AdminService', 'BlockchainService', function($scope, AuthService, AdminService, BlockchainService) {
    $scope.currentUser = AuthService.requireAuth('admin');
    if (!$scope.currentUser) return;

    $scope.stats = {};
    $scope.medicines = [];
    $scope.shipments = [];
    $scope.users = [];
    $scope.blockchain = [];
    $scope.activeTab = 'medicines';
    $scope.filterStatus = 'ALL';
    $scope.validationResult = null;
    $scope.actionNotice = null;

    $scope.loadDashboard = function() {
        AdminService.getDashboard().then(function(res) {
            if (res.data && res.data.success) {
                $scope.stats = res.data.stats || {};
            }
        });

        AdminService.getMedicines().then(function(res) {
            if (res.data && res.data.success) {
                $scope.medicines = res.data.medicines || [];
            }
        });

        AdminService.getShipments().then(function(res) {
            if (res.data && res.data.success) {
                $scope.shipments = res.data.shipments || [];
            }
        });

        AdminService.getUsers().then(function(res) {
            if (res.data && res.data.success) {
                $scope.users = res.data.users || [];
            }
        });

        BlockchainService.getChain().then(function(res) {
            if (res.data && res.data.success) {
                $scope.blockchain = res.data.chain || [];
            }
        });
    };

    $scope.setTab = function(tab) {
        $scope.activeTab = tab;
    };

    $scope.setFilter = function(filter) {
        $scope.filterStatus = filter;
    };

    $scope.filterMedicinePredicate = function(med) {
        if ($scope.filterStatus === 'ALL') return true;
        if ($scope.filterStatus === 'NORMAL') return med.temperatureStatus === 'NORMAL' && !med.isExpired;
        if ($scope.filterStatus === 'ANOMALY') return med.temperatureStatus === 'ANOMALY' || (med.shipment && med.shipment.temperatureStatus === 'ANOMALY');
        if ($scope.filterStatus === 'EXPIRED') return med.isExpired;
        if ($scope.filterStatus === 'DELIVERED') return med.currentStage === 'PHARMACY' || med.status === 'VERIFIED_AT_PHARMACY';
        if ($scope.filterStatus === 'IN_TRANSIT') return med.currentStage === 'TRANSPORTER';
        return true;
    };

    $scope.validateBlockchain = function() {
        $scope.validationResult = null;
        BlockchainService.validateChain().then(function(res) {
            if (res.data && res.data.success) {
                $scope.validationResult = res.data;
            }
        }, function(err) {
            $scope.validationResult = {
                isValid: false,
                reason: (err.data && err.data.reason) ? err.data.reason : 'Cryptographic mismatch detected.'
            };
        });
    };

    $scope.simulateTamper = function() {
        BlockchainService.simulateTamper(1, { quantity: 999999, unauthorizedAlteration: 'COUNTERFEIT_TEST' }).then(function() {
            $scope.actionNotice = {
                type: 'danger',
                text: '🚨 Simulated tamper injected into Block #1! Click "Validate Blockchain" to observe detection.'
            };
            $scope.loadDashboard();
            $scope.validateBlockchain();
        });
    };

    $scope.restoreBlockchain = function() {
        BlockchainService.restoreChain().then(function() {
            $scope.actionNotice = {
                type: 'success',
                text: '✓ Blockchain ledger restored to original cryptographic state.'
            };
            $scope.loadDashboard();
            $scope.validateBlockchain();
        });
    };

    $scope.loadDashboard();
}]);

/* =========================================================
   CUSTOMER CONTROLLER
   ========================================================= */
app.controller('CustomerController', ['$scope', 'AuthService', 'MedicineService', function($scope, AuthService, MedicineService) {
    $scope.currentUser = AuthService.requireAuth('customer');
    if (!$scope.currentUser) return;
    $scope.logout = function() { AuthService.logout(); };

    $scope.search = { batchId: '', medicineName: '' };
    $scope.availableMedicines = [];
    $scope.result = null;
    $scope.errorMessage = '';
    $scope.isSearching = false;
    $scope.loadingMedicines = false;
    $scope.qrScannerOpen = false;
    $scope.qrScanner = null;
    $scope.qrScanMessage = '';

    function extractBatchIdFromQr(decodedText) {
        try {
            var url = new URL(decodedText);
            var batch = url.searchParams.get('batch');
            if (batch) return batch;
        } catch (e) {}
        var match = decodedText.match(/(?:batch(?:Id)?[=:]\s*|\/batch\/)([A-Za-z0-9_-]+)/i);
        return match ? match[1] : decodedText.trim();
    }

    $scope.startQrScanner = function() {
        if (typeof Html5Qrcode === 'undefined') {
            $scope.qrScanMessage = 'QR scanner library could not be loaded. Check your internet connection.';
            return;
        }
        if ($scope.qrScanner) return;
        $scope.qrScanMessage = 'Point your camera at the medicine QR code...';
        $scope.qrScanner = new Html5Qrcode('qr-reader');
        $scope.qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            function(decodedText) {
                var batchId = extractBatchIdFromQr(decodedText);
                $scope.$applyAsync(function() {
                    $scope.qrScanMessage = 'QR detected. Verifying batch ' + batchId + '...';
                    $scope.search.batchId = batchId;
                });
                $scope.stopQrScanner();
                $scope.$applyAsync(function() { $scope.verifyMedicine(batchId, ''); });
            },
            function() {}
        ).catch(function(err) {
            $scope.$applyAsync(function() {
                $scope.qrScanMessage = 'Camera could not start. Allow camera permission and use localhost/HTTPS.';
                $scope.qrScanner = null;
            });
        });
    };

    $scope.stopQrScanner = function() {
        if (!$scope.qrScanner) {
            $scope.qrScannerOpen = false;
            return;
        }
        var scanner = $scope.qrScanner;
        $scope.qrScanner = null;
        scanner.stop().then(function() {
            try { scanner.clear(); } catch (e) {}
            $scope.$applyAsync(function() { $scope.qrScannerOpen = false; });
        }).catch(function() {
            $scope.$applyAsync(function() { $scope.qrScannerOpen = false; });
        });
    };

    $scope.toggleQrScanner = function() {
        if ($scope.qrScannerOpen) {
            $scope.stopQrScanner();
        } else {
            $scope.qrScannerOpen = true;
            setTimeout(function() { $scope.startQrScanner(); }, 150);
        }
    };

    $scope.loadAvailableMedicines = function() {
        $scope.loadingMedicines = true;
        MedicineService.getCustomerMedicines().then(function(res) {
            $scope.availableMedicines = (res.data && res.data.medicines) || [];
        }, function(err) {
            $scope.errorMessage = (err.data && err.data.message) || 'Could not load available medicines.';
        }).finally(function() {
            $scope.loadingMedicines = false;
        });
    };

    $scope.searchAvailable = function() {
        $scope.errorMessage = '';
        $scope.loadingMedicines = true;
        var term = $scope.search.medicineName || $scope.search.batchId || '';
        MedicineService.getCustomerMedicines(term).then(function(res) {
            $scope.availableMedicines = (res.data && res.data.medicines) || [];
            if (!$scope.availableMedicines.length && term) {
                $scope.errorMessage = 'No available medicine matched your search.';
            }
        }, function(err) {
            $scope.errorMessage = (err.data && err.data.message) || 'Search failed.';
        }).finally(function() {
            $scope.loadingMedicines = false;
        });
    };

    $scope.verifyMedicine = function(batchId, medicineName) {
        var id = batchId || $scope.search.batchId;
        var name = medicineName || $scope.search.medicineName;
        $scope.errorMessage = '';
        $scope.result = null;
        if (!id) {
            $scope.errorMessage = 'Select a medicine or enter its Batch ID to verify.';
            return;
        }
        $scope.isSearching = true;
        MedicineService.verifyMedicine(id, name).then(function(res) {
            if (res.data && res.data.success) {
                $scope.result = res.data;
                $scope.search.batchId = id;
                $scope.search.medicineName = name || (res.data.medicine && res.data.medicine.medicineName) || '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                $scope.errorMessage = (res.data && res.data.message) || 'Medicine verification failed.';
            }
        }, function(err) {
            $scope.errorMessage = (err.data && err.data.message) || 'Medicine batch was not found in the MediChain ledger.';
        }).finally(function() {
            $scope.isSearching = false;
        });
    };

    $scope.clearVerification = function() {
        $scope.result = null;
        $scope.search.batchId = '';
        $scope.search.medicineName = '';
        $scope.errorMessage = '';
    };

    $scope.loadAvailableMedicines();

    // Automatically verify when the customer opens a QR verification URL.
    var qrBatch = new URLSearchParams(window.location.search).get('batch');
    var qrName = new URLSearchParams(window.location.search).get('name') || '';
    if (qrBatch) {
        $scope.search.batchId = qrBatch;
        $scope.search.medicineName = qrName;
        setTimeout(function() { $scope.verifyMedicine(qrBatch, qrName); }, 250);
    }
}]);

/* =========================================================
   HOME CONTROLLER (Landing Page)
   ========================================================= */
app.controller('HomeController', ['$scope', 'AdminService', 'AlertService', function($scope, AdminService, AlertService) {
    $scope.stats = {
        totalMedicines: 0,
        totalShipments: 0,
        activeShipments: 0,
        temperatureAnomalies: 0,
        blockchainTransactions: 0
    };
    $scope.alerts = [];
    $scope.quickBatch = '';

    $scope.loadHomeData = function() {
        AdminService.getDashboard().then(function(res) {
            if (res.data && res.data.success) {
                $scope.stats = res.data.stats || {};
            }
        });

        AlertService.getAlerts('ALL').then(function(res) {
            if (res.data && res.data.success) {
                $scope.alerts = (res.data.alerts || []).slice(0, 5);
            }
        });
    };

    $scope.searchBatch = function() {
        if ($scope.quickBatch) {
            window.location.href = 'customer.html?batch=' + encodeURIComponent($scope.quickBatch);
        }
    };

    $scope.loadHomeData();
}]);