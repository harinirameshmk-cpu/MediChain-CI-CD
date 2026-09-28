/**
 * MediChain AngularJS Services
 * Connects AngularJS Frontend directly to Node.js + Express REST APIs
 */

/* =========================================================
   AUTH SERVICE
   ========================================================= */
app.service('AuthService', ['$http', '$window', function($http, $window) {
    var TOKEN_KEY = 'medichain_token';
    var USER_KEY = 'medichain_user';

    this.getToken = function() {
        return $window.localStorage.getItem(TOKEN_KEY);
    };

    this.getUser = function() {
        try {
            var raw = $window.localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    };

    this.setSession = function(token, user) {
        $window.localStorage.setItem(TOKEN_KEY, token);
        $window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    };

    this.clearSession = function() {
        $window.localStorage.removeItem(TOKEN_KEY);
        $window.localStorage.removeItem(USER_KEY);
    };

    this.login = function(credentials) {
        return $http.post('/api/auth/login', credentials);
    };

    this.register = function(userData) {
        return $http.post('/api/auth/register', userData);
    };

    this.logout = function() {
        this.clearSession();
        $window.location.href = 'login.html';
    };

    this.redirectToDashboard = function(role) {
        var r = (role || '').toLowerCase();
        switch (r) {
            case 'manufacturer':
                $window.location.href = 'manufacturer.html';
                break;
            case 'distributor':
                $window.location.href = 'distributor.html';
                break;
            case 'transporter':
                $window.location.href = 'transporter.html';
                break;
            case 'pharmacy':
                $window.location.href = 'pharmacy.html';
                break;
            case 'customer':
                $window.location.href = 'customer.html';
                break;
            case 'admin':
                $window.location.href = 'admin.html';
                break;
            default:
                $window.location.href = 'index.html';
        }
    };

    this.requireAuth = function(allowedRoles) {
        var user = this.getUser();
        var token = this.getToken();

        if (!user || !token) {
            $window.location.href = 'login.html';
            return null;
        }

        if (allowedRoles) {
            var roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            var userRole = (user.role || '').toLowerCase();
            if (userRole !== 'admin' && roles.indexOf(userRole) === -1) {
                alert("Access Denied: Your account role (" + user.role + ") does not have permission to access this portal.");
                this.redirectToDashboard(user.role);
                return null;
            }
        }

        return user;
    };
}]);

/* =========================================================
   MEDICINE SERVICE
   ========================================================= */
app.service('MedicineService', ['$http', function($http) {
    // Manufacturer
    this.getManufacturerMedicines = function() {
        return $http.get('/api/manufacturer/medicines');
    };

    this.registerMedicine = function(data) {
        return $http.post('/api/manufacturer/medicine', data);
    };

    // Distributor
    this.getDistributorBatches = function() {
        return $http.get('/api/distributor/available');
    };

    this.distributorReceive = function(batchId, data) {
        return $http.post('/api/distributor/receive/' + encodeURIComponent(batchId), data || {});
    };

    this.distributorDispatch = function(batchId, data) {
        return $http.post('/api/distributor/dispatch/' + encodeURIComponent(batchId), data || {});
    };

    // Transporter
    this.getTransporterShipments = function() {
        return $http.get('/api/transporter/shipments');
    };

    this.recordCheckpoint = function(batchId, data) {
        return $http.post('/api/transporter/checkpoint/' + encodeURIComponent(batchId), data);
    };

    this.deliverShipment = function(batchId, data) {
        return $http.post('/api/transporter/deliver/' + encodeURIComponent(batchId), data || {});
    };

    // Pharmacy
    this.getPharmacyIncoming = function() {
        return $http.get('/api/pharmacy/incoming');
    };

    this.pharmacyReceive = function(batchId, data) {
        return $http.post('/api/pharmacy/receive/' + encodeURIComponent(batchId), data || {});
    };

    // Customer Verification
    this.getCustomerMedicines = function(search) {
        var url = '/api/customer/medicines';
        if (search) url += '?search=' + encodeURIComponent(search);
        return $http.get(url);
    };

    this.verifyMedicine = function(batchId, medicineName) {
        var url = '/api/customer/verify/' + encodeURIComponent(batchId);
        if (medicineName) {
            url += '?name=' + encodeURIComponent(medicineName);
        }
        return $http.get(url);
    };
}]);

/* =========================================================
   BLOCKCHAIN SERVICE
   ========================================================= */
app.service('BlockchainService', ['$http', function($http) {
    this.getChain = function() {
        return $http.get('/api/blockchain');
    };

    this.getBatchBlocks = function(batchId) {
        return $http.get('/api/blockchain/' + encodeURIComponent(batchId));
    };

    this.validateChain = function() {
        return $http.get('/api/blockchain/validate');
    };

    this.simulateTamper = function(blockIndex, alteredData) {
        return $http.post('/api/blockchain/simulate-tamper', {
            blockIndex: blockIndex,
            alteredData: alteredData
        });
    };

    this.restoreChain = function() {
        return $http.post('/api/blockchain/restore', {});
    };
}]);

/* =========================================================
   ADMIN SERVICE
   ========================================================= */
app.service('AdminService', ['$http', function($http) {
    this.getDashboard = function() {
        return $http.get('/api/admin/dashboard');
    };

    this.getMedicines = function() {
        return $http.get('/api/admin/medicines');
    };

    this.getShipments = function() {
        return $http.get('/api/admin/shipments');
    };

    this.getUsers = function() {
        return $http.get('/api/admin/users');
    };
}]);

/* =========================================================
   ALERT & NOTIFICATION SERVICE
   ========================================================= */
app.service('AlertService', ['$http', function($http) {
    this.getAlerts = function(role) {
        return $http.get('/api/admin/alerts?role=' + encodeURIComponent(role || 'ALL'));
    };
}]);

/* =========================================================
   QR SERVICE
   ========================================================= */
app.service('QrService', function() {
    this.generateQrUrl = function(text) {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(text);
    };
});
