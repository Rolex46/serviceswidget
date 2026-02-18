ZOHO.embeddedApp.on("PageLoad", function(data) {

    var Entity = data.Entity;
    var recordId = data.EntityId;
    var allRecords = [];

    var relatedListConfig = {
        Entity: Entity,
        RecordID: recordId,
        page: 1,
        per_page: 200
    };

    var listNames = ["Procedure", "Imaging", "Laboratory", "Consultation"];

    var promises = listNames.map(function(name) {
        return ZOHO.CRM.API.getRelatedRecords(
            Object.assign({}, relatedListConfig, { RelatedList: name })
        ).then(function(response) {
            var records = (response && response.data) ? response.data : [];
            records.forEach(function(r) { r._type = name; });
            console.log(records);
            return records;
        }).catch(function() {
            return [];
        });
    });

    Promise.all(promises).then(function(results) {
        results.forEach(function(records) {
            allRecords = allRecords.concat(records);
        });

        document.getElementById("loading").style.display = "none";
        var container = document.getElementById("container");

        if (allRecords.length === 0) {
            container.innerHTML = '<div class="empty-msg">No related records found.</div>';
            container.classList.remove("hidden");
            return;
        }

        container.classList.remove("hidden");

        // Populate filter options
        var types = {};
        var statuses = {};
        allRecords.forEach(function(r) {
            types[r._type] = true;
            if (r.Status) statuses[r.Status] = true;
        });

        var typeSelect = document.getElementById("filter-type");
        Object.keys(types).sort().forEach(function(t) {
            var opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            typeSelect.appendChild(opt);
        });

        var statusSelect = document.getElementById("filter-status");
        Object.keys(statuses).sort().forEach(function(s) {
            var opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            statusSelect.appendChild(opt);
        });

        renderTable(allRecords);

        typeSelect.addEventListener("change", applyFilters);
        statusSelect.addEventListener("change", applyFilters);

        function applyFilters() {
            var typeVal = typeSelect.value;
            var statusVal = statusSelect.value;

            var filtered = allRecords.filter(function(r) {
                if (typeVal && r._type !== typeVal) return false;
                if (statusVal && r.Status !== statusVal) return false;
                return true;
            });

            renderTable(filtered);
        }

        function renderTable(records) {
            var tbody = document.getElementById("table-body");
            var noResults = document.getElementById("no-results");

            if (records.length === 0) {
                tbody.innerHTML = "";
                noResults.classList.remove("hidden");
                return;
            }

            noResults.classList.add("hidden");
            var html = "";

            records.forEach(function(r) {
                var typeClass = "type-" + r._type.toLowerCase();
                var statusClass = getStatusClass(r.Status);

                html += "<tr>";
                html += '<td><a href="#" class="record-link" data-entity="' + r._type + '" data-id="' + r.id + '">' + (r.Name || "—") + "</a></td>";
                html += '<td><span class="type-badge ' + typeClass + '">' + r._type + "</span></td>";
                html += "<td>" + (r.Status ? '<span class="status-badge ' + statusClass + '">' + r.Status + "</span>" : "—") + "</td>";
                var costField = r._type === "Consultation" ? r.Consultation_Fee : r.Total_Cost;
                var cost = costField != null ? costField : "—";
                var billing = r.Payment_Status || "—";
                var billingClass = getBillingClass(r.Payment_Status);

                html += "<td>" + cost + "</td>";
                html += "<td>" + (billing !== "—" ? '<span class="status-badge ' + billingClass + '">' + billing + "</span>" : "—") + "</td>";
                html += "</tr>";
            });

            tbody.innerHTML = html;

            tbody.querySelectorAll(".record-link").forEach(function(link) {
                link.addEventListener("click", function(e) {
                    e.preventDefault();
                    ZOHO.CRM.UI.Record.open({
                        Entity: this.dataset.entity,
                        RecordID: this.dataset.id
                    });
                });
            });
        }

        function getBillingClass(status) {
            if (!status) return "billing-draft";
            var lower = status.toLowerCase();
            if (lower === "paid") return "billing-paid";
            if (lower === "pending") return "billing-pending";
            if (lower === "draft") return "billing-draft";
            return "billing-draft";
        }

        function getStatusClass(status) {
            if (!status) return "status-default";
            var lower = status.toLowerCase();
            if (lower === "planned") return "status-planned";
            if (lower === "completed") return "status-completed";
            if (lower === "in progress" || lower === "in-progress") return "status-in-progress";
            return "status-default";
        }
    });

});

ZOHO.embeddedApp.init();
