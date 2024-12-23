document.addEventListener("DOMContentLoaded", () => {
    // Data for charts
    const tripFrequencyData = [12, 15, 9, 20, 10];
    const shuttleUsageData = [8, 15, 22, 5, 10];

    // Trip Frequency Chart
    const tripFrequencyChart = new Chart(document.getElementById("tripFrequencyChart"), {
        type: "bar",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [{
                label: "Trips Per Day",
                data: tripFrequencyData,
                backgroundColor: "rgba(45, 51, 145, 0.7)",
                borderColor: "rgba(45, 51, 145, 1)",
                borderWidth: 1,
            }],
        },
    });

    // Shuttle Usage Chart
    const shuttleUsageChart = new Chart(document.getElementById("shuttleUsageChart"), {
        type: "pie",
        data: {
            labels: ["Shuttle S001", "Shuttle S002", "Shuttle S003", "Shuttle S004", "Shuttle S005"],
            datasets: [{
                label: "Shuttle Usage",
                data: shuttleUsageData,
                backgroundColor: [
                    "rgba(45, 51, 145, 0.7)",
                    "rgba(129, 41, 144, 0.7)",
                    "rgba(247, 148, 29, 0.7)",
                    "rgba(70, 130, 180, 0.7)",
                    "rgba(60, 179, 113, 0.7)"
                ],
            }],
        },
    });

});
