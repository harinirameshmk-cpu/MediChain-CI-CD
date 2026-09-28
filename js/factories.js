/**
 * MediChain AngularJS Factories
 * Provides model helpers and calculations for medicines and shipments
 */

/* =========================================================
   MEDICINE FACTORY
   ========================================================= */
app.factory("MedicineFactory", function () {
    return {
        // Temperature check calculation helper
        evaluateTemperature: function(temperature, minTemperature, maxTemperature) {
            var temp = Number(temperature);
            var min = Number(minTemperature);
            var max = Number(maxTemperature);

            if (isNaN(temp) || isNaN(min) || isNaN(max)) {
                return {
                    status: 'UNKNOWN',
                    isAnomaly: false,
                    message: 'Incomplete temperature specifications'
                };
            }

            if (temp < min) {
                return {
                    status: 'ANOMALY',
                    isAnomaly: true,
                    message: '⚠ TEMPERATURE ALERT: Temperature dropped below the safe storage range (' + min + '°C).'
                };
            } else if (temp > max) {
                return {
                    status: 'ANOMALY',
                    isAnomaly: true,
                    message: '⚠ TEMPERATURE ALERT: Temperature exceeded the safe storage range (' + max + '°C).'
                };
            } else {
                return {
                    status: 'NORMAL',
                    isAnomaly: false,
                    message: '✓ Temperature Normal (Within ' + min + '°C – ' + max + '°C)'
                };
            }
        },

        // Expiry check calculation helper
        evaluateExpiry: function(expiryDateStr) {
            if (!expiryDateStr) {
                return { isExpired: false, daysLeft: null, status: 'VALID' };
            }
            var exp = new Date(expiryDateStr);
            var now = new Date();
            var isExpired = exp < now;
            var daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

            return {
                isExpired: isExpired,
                daysLeft: daysLeft,
                status: isExpired ? 'EXPIRED' : (daysLeft <= 30 ? 'EXPIRING_SOON' : 'VALID')
            };
        }
    };
});

/* =========================================================
   SHIPMENT FACTORY
   ========================================================= */
app.factory("ShipmentFactory", ['MedicineFactory', function (MedicineFactory) {
    return {
        createCheckpointPayload: function(data) {
            data = data || {};
            var evalResult = MedicineFactory.evaluateTemperature(
                data.temperature,
                data.minTemperature,
                data.maxTemperature
            );

            return {
                currentTemperature: Number(data.temperature),
                location: data.location || 'Highway Transit Checkpoint',
                vehicleNumber: data.vehicleNumber || 'TRK-COLD',
                transportCompany: data.transportCompany || 'ColdChain Express',
                notes: data.notes || '',
                evaluatedStatus: evalResult.status,
                statusMessage: evalResult.message
            };
        }
    };
}]);