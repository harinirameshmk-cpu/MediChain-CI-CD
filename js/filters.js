/**
 * MediChain AngularJS Filters
 */

// Filter records by Batch ID
app.filter("batchFilter", function () {
    return function (items, batchId) {
        if (!batchId || batchId.trim() === "") {
            return items;
        }
        if (!Array.isArray(items)) {
            return items;
        }
        var search = batchId.toLowerCase();
        return items.filter(function (item) {
            return item && item.batchId && item.batchId.toLowerCase().indexOf(search) !== -1;
        });
    };
});

// Filter shipments or batches by Temperature Status
app.filter("temperatureStatusFilter", function () {
    return function (items, status) {
        if (!status || status === "All") {
            return items;
        }
        if (!Array.isArray(items)) {
            return items;
        }
        return items.filter(function (item) {
            return item && item.temperatureStatus === status;
        });
    };
});

// Uppercase text filter
app.filter("uppercaseText", function () {
    return function (value) {
        if (!value) return "";
        return String(value).toUpperCase();
    };
});

// Stage badge CSS class filter
app.filter("stageBadgeClass", function () {
    return function (stage) {
        if (!stage) return "stage-manufacturer";
        var s = String(stage).toUpperCase();
        if (s.indexOf("MANUFACTURER") !== -1) return "stage-manufacturer";
        if (s.indexOf("DISTRIBUTOR") !== -1) return "stage-distributor";
        if (s.indexOf("TRANS") !== -1) return "stage-transporter";
        if (s.indexOf("PHARM") !== -1) return "stage-pharmacy";
        return "stage-manufacturer";
    };
});

// Date & Time formatting filter
app.filter("dateTimeFormat", function () {
    return function (isoStr) {
        if (!isoStr) return "N/A";
        try {
            var d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            return d.toLocaleString();
        } catch (e) {
            return isoStr;
        }
    };
});