document.addEventListener("DOMContentLoaded", () => {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    // Data for charts
    const punctualityData = [95, 90, 85, 92, 88];
    const occupancyData = [80, 85, 78, 88, 90];

    // Punctuality Chart
    const punctualityChart = new Chart(document.getElementById("punctualityChart"), {
        type: "line",
        data: {
            labels: ["Shuttle S001", "Shuttle S002", "Shuttle S003", "Shuttle S004", "Shuttle S005"],
            datasets: [{
                label: "Punctuality (%)",
                data: punctualityData,
                backgroundColor: "rgba(45, 51, 145, 0.7)",
                borderColor: "rgba(45, 51, 145, 1)",
                fill: false,
            }],
        },
    });

    // Occupancy Chart
    const occupancyChart = new Chart(document.getElementById("occupancyChart"), {
        type: "bar",
        data: {
            labels: ["Shuttle S001", "Shuttle S002", "Shuttle S003", "Shuttle S004", "Shuttle S005"],
            datasets: [{
                label: "Occupancy (%)",
                data: occupancyData,
                backgroundColor: "rgba(129, 41, 144, 0.7)",
                borderColor: "rgba(129, 41, 144, 1)",
                borderWidth: 1,
            }],
        },
    });

    // CSV Export
    document.getElementById("exportCsvBtn").addEventListener("click", () => {
        const rows = [["Shuttle ID", "Total Trips", "Punctuality Rate", "Average Occupancy", "Maintenance Status"], ...Array.from(document.querySelectorAll("#performanceTable tbody tr")).map(row => Array.from(row.children).map(cell => cell.textContent))];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(row => row.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "ShuttlePerformanceReport.csv";
        link.click();
    });

    // Placeholder for CSV Import
    document.getElementById("importCsvBtn").addEventListener("click", () => {
        alert("CSV Import functionality coming soon!");
    });
});
