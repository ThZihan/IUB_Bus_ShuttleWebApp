$(document).ready(function() {
    // Sidebar Toggle
    $('#sidebarCollapse').on('click', function() {
        // Toggle the 'active' class on the sidebar
        $('#sidebar').toggleClass('active');

        // Check if the sidebar now has the 'active' class
        if ($('#sidebar').hasClass('active')) {
            // If active, hide the logotext
            $('#iconText').hide();
        } else {
            // If not active, show the logotext
            $('#iconText').show();
        }
    });

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });


    // Notification Badge Update
    let notificationCount = 2;
    $('.notifications .badge').text(notificationCount);

    function addNotification(message) {
        notificationCount++;
        $('.notifications .badge').text(notificationCount);

        let newNotification = `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-content">
                    <p>${message}</p>
                    <small>Just now</small>
                </div>
            </div>
        `;

        $('.notification-item').first().before(newNotification);
    }

    // Simulate incoming notifications
    setTimeout(() => {
        addNotification('Your shuttle is arriving in 2 minutes');
    }, 5000);

    // Handle notification click
    $('.notifications .dropdown-item').click(function(e) {
        e.preventDefault();
        notificationCount--;
        if (notificationCount < 1) notificationCount = 0;
        $('.notifications .badge').text(notificationCount);
    });

    // Responsive sidebar behavior
    $(window).resize(function() {
        if ($(window).width() <= 768) {
            $('#sidebar').addClass('active');
        }
    });

    // Initialize map placeholder
    $('#map').html('<i class="fas fa-map-marked-alt"></i> Interactive Map Coming Soon');
});
function updateClock() {
    const options = { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const now = new Intl.DateTimeFormat('en-US', options).format(new Date());
    document.getElementById('realtime-clock').textContent = now;
}
setInterval(updateClock, 1000); // Update every second
updateClock(); // Initialize immediately

const markers = [
    {
        busNumber: 'S001',
        routeNo: '5',
        latitude: 23.819019,
        longitude: 90.429707,
        destination: 'IUB'
    },
    {
        busNumber: '5231',
        routeNo: '1',
        latitude: 23.816817,
        longitude: 90.435492,
        destination: 'Badda'
    },
    {
        busNumber: '2233',
        routeNo: '2',
        latitude: 23.814666,
        longitude: 90.421198,
        destination: 'Mirpur'
    },
    {
        busNumber: '1234',
        routeNo: '5',
        latitude: 23.8158287,
        longitude: 90.428023,
        destination: 'Mohakhali'
    }
];

function initMap() {
    const centerMap = { lat: 23.8158287, lng: 90.428023 };
    const mapOptions = {
        center: centerMap,
        zoom: 16,
        disableDefaultUI: true,
    };

    const map = new google.maps.Map(document.getElementById('google-map'), mapOptions);

    // Add bus markers to the map
    markers.forEach(markerData => {
        new google.maps.Marker({
            position: { lat: markerData.latitude, lng: markerData.longitude },
            map: map,
            title: `Bus: ${markerData.busNumber} - Route: ${markerData.routeNo} - Destination: ${markerData.destination}`,
            icon: {
                url: "https://freesvg.org/img/Bus-Icon.png",
                scaledSize: new google.maps.Size(35, 32),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(16, 16)
            }
        });
    });
}