/**
 * MediChain - AngularJS Application Root Module
 */
var app = angular.module("medicineApp", []);

// Configure $httpProvider to automatically include JWT Authorization header
app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push(['$q', function($q) {
        return {
            'request': function(config) {
                var token = localStorage.getItem('medichain_token');
                if (token && config.url.indexOf('/api/') !== -1) {
                    config.headers = config.headers || {};
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
                return config;
            },
            'responseError': function(rejection) {
                if (rejection.status === 401) {
                    var currentPath = window.location.pathname;
                    if (!currentPath.endsWith('login.html') && !currentPath.endsWith('register.html') && !currentPath.endsWith('customer.html') && !currentPath.endsWith('index.html') && currentPath !== '/') {
                        localStorage.removeItem('medichain_token');
                        localStorage.removeItem('medichain_user');
                        window.location.href = 'login.html';
                    }
                }
                return $q.reject(rejection);
            }
        };
    }]);
}]);

// Global helper for toast notifications
app.run(['$rootScope', function($rootScope) {
    $rootScope.toast = {
        visible: false,
        message: '',
        type: 'info'
    };

    $rootScope.showToast = function(message, type) {
        $rootScope.toast.message = message;
        $rootScope.toast.type = type || 'info';
        $rootScope.toast.visible = true;

        setTimeout(function() {
            $rootScope.$apply(function() {
                $rootScope.toast.visible = false;
            });
        }, 4000);
    };
}]);