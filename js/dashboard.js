$(document).ready(function() {

        function calculateEstimatedTime() {
            const realTimeClock = $('#realtime-clock').text();
            const nextShuttleTime = $('#next-shuttle-time').text();

            // Parse the real-time clock and next shuttle time to Date objects
            const currentDate = new Date();
            const realTimeDate = new Date(`${currentDate.toDateString()} ${realTimeClock}`);
            let shuttleTimeDate = new Date(`${currentDate.toDateString()} ${nextShuttleTime}`);

            // If shuttle time is earlier than the current time, assume it is for the next day
            if (shuttleTimeDate < realTimeDate) {
                shuttleTimeDate.setDate(shuttleTimeDate.getDate() + 1); // Add one day
            }

            // Calculate the difference in milliseconds
            const timeDifference = shuttleTimeDate - realTimeDate;

            // Convert milliseconds to hours, minutes, and seconds
            const hours = Math.floor(timeDifference / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            // Display the estimated time
            const estimatedTimeElement = $('#estimatedTime');
            if (timeDifference >= 0) {
                estimatedTimeElement.text(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                estimatedTimeElement.text('Shuttle has departed');
            }
        }

        // Update the estimated time every second
        setInterval(calculateEstimatedTime, 1000);
        calculateEstimatedTime();

    $('#driverManagement table tbody tr').each(function () {
        const $row = $(this);
        // Extract data from table cells
        const driverId = $row.find('td').eq(0).text().trim();  // Driver ID
        const driverName = $row.find('td').eq(1).text().trim(); // Name
        const driverContact = $row.find('td').eq(2).text().trim(); // Contact
        const driverStatus = $row.find('td').eq(3).text().trim(); // Status

        // Find the Edit button and set data attributes
        $row.find('.edit-driver-btn').data('id', driverId)
            .data('name', driverName)
            .data('contact', driverContact)
            .data('status', driverStatus);
    });

    // When an Edit button is clicked, populate the modal with its data
    $('.edit-driver-btn').on('click', function () {
        const driverId = $(this).data('id');
        const driverName = $(this).data('name');
        const driverContact = $(this).data('contact');
        const driverStatus = $(this).data('status');

        // Populate the modal fields
        $('#editDriverIdInput').val(driverId);
        $('#editDriverNameInput').val(driverName);
        $('#editDriverContactInput').val(driverContact);
        $('#editDriverStatusInput').val(driverStatus);
    });

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

    $('input[name="nfcOption"]').on('change', function () {
        if ($('#scanNFC').is(':checked')) {
            $('#nfcGif').show(); // Show the NFC GIF
            $('#nfcCodeInput').hide(); // Hide the NFC code input
        } else if ($('#enterNFCCode').is(':checked')) {
            $('#nfcGif').hide(); // Hide the NFC GIF
            $('#nfcCodeInput').show(); // Show the NFC code input
        }
    });
        // Show or hide NFC-related fields based on selected option in the Edit User modal
        $('input[name="nfcOptionEdit"]').on('change', function () {
            if ($('#nfcAssign').is(':checked')) {
                $('#editNfcGif').show(); // Show the NFC GIF
                $('#editNfcCodeInput').show(); // Show the NFC code input
            } else {
                $('#editNfcGif').hide(); // Hide the NFC GIF
                $('#editNfcCodeInput').hide(); // Hide the NFC code input
            }
        });

        // Set default selection when opening the modal based on user status
        $('#editUserModal').on('show.bs.modal', function () {
            const userStatus = $('#editUserStatusInput').val();
            if (userStatus === 'RFID Pending') {
                $('#nfcAssign').prop('checked', true).trigger('change');
            } else {
                $('#nfcAssigned').prop('checked', true).trigger('change');
            }
        });

// Populate Edit User Modal with dynamic data
    $('#userManagement table tbody tr').each(function () {
        const $row = $(this);
        const userId = $row.find('td').eq(0).text().trim(); // User ID
        const userName = $row.find('td').eq(1).text().trim(); // Name
        const userEmail = $row.find('td').eq(2).text().trim(); // Email
        const userDesignation = $row.find('td').eq(3).text().trim(); // Designation
        const userStatus = $row.find('td').eq(4).text().trim(); // Status

        // Attach data attributes to the Edit button
        $row.find('.btn-primary').data('id', userId)
            .data('name', userName)
            .data('email', userEmail)
            .data('designation', userDesignation)
            .data('status', userStatus);
    });

    // On clicking the Edit button, populate the modal with the selected user's data
    $('.btn-primary[data-bs-target="#editUserModal"]').on('click', function () {
        const userId = $(this).data('id');
        const userName = $(this).data('name');
        const userEmail = $(this).data('email');
        const userDesignation = $(this).data('designation');
        const userStatus = $(this).data('status');

        // Populate modal fields
        $('#editUserIdInput').val(userId);
        $('#editUserNameInput').val(userName);
        $('#editUserEmailInput').val(userEmail);
        $('#editUserDesignationInput').val(userDesignation);
        $('#editUserStatusInput').val(userStatus);

        // Set NFC assignment fields
        if (userStatus === 'RFID Pending') {
            $('#nfcAssign').prop('checked', true).trigger('change');
        } else {
            $('#nfcAssigned').prop('checked', true).trigger('change');
        }
    });

    // Toggle NFC-related fields based on selected radio button
    $('input[name="nfcOptionEdit"]').on('change', function () {
        if ($('#nfcAssign').is(':checked')) {
            $('#editNfcGif').show(); // Show the NFC GIF
            $('#editNfcCodeInput').show(); // Show the NFC code input
        } else {
            $('#editNfcGif').hide(); // Hide the NFC GIF
            $('#editNfcCodeInput').hide(); // Hide the NFC code input
        }
    });

    $('#shuttleManagement table tbody tr').each(function () {
        const $row = $(this);
        const shuttleId = $row.find('td').eq(0).text().trim(); // Shuttle ID
        const route = $row.find('td').eq(1).text().trim(); // Route
        const status = $row.find('td').eq(2).text().trim(); // Status
        const driver = $row.find('td').eq(3).text().trim(); // Driver

        // Attach data attributes to the Edit button
        $row.find('.btn-primary').data('id', shuttleId)
            .data('route', route)
            .data('status', status)
            .data('driver', driver);
    });

    // On clicking the Edit button, populate the modal with the selected shuttle's data
    $('.btn-primary[data-bs-target="#editShuttleModal"]').on('click', function () {
        const shuttleId = $(this).data('id');
        const route = $(this).data('route');
        const status = $(this).data('status');
        const driver = $(this).data('driver');

        // Populate modal fields
        $('#editShuttleIdInput').val(shuttleId);
        $('#editRouteInput').val(route);
        $('#editStatusInput').val(status);
        $('#editDriverInput').val(driver);
    });

    // Populate Edit Schedule Modal with dynamic data
    $('#manageSchedules table tbody tr').each(function () {
        const $row = $(this);
        const shuttleId = $row.find('td').eq(0).text().trim(); // Shuttle ID
        const route = $row.find('td').eq(1).text().trim(); // Route
        const departureTime = $row.find('td').eq(2).text().trim(); // Departure Time
        const arrivalTime = $row.find('td').eq(3).text().trim(); // Arrival Time

        // Attach data attributes to the Edit button
        $row.find('.btn-primary').data('id', shuttleId)
            .data('route', route)
            .data('departure', departureTime)
            .data('arrival', arrivalTime);
    });

    // On clicking the Edit button, populate the modal with the selected schedule's data
    $('.btn-primary[data-bs-target="#editScheduleModal"]').on('click', function () {
        const shuttleId = $(this).data('id');
        const route = $(this).data('route');
        let departureTime = $(this).data('departure');
        let arrivalTime = $(this).data('arrival');

        // Convert times from "08:00 AM" format to "08:00" format for input[type="time"]
        departureTime = convertToTimeInputFormat(departureTime);
        arrivalTime = convertToTimeInputFormat(arrivalTime);

        // Populate modal fields
        $('#editSchedule_ShuttleIdInput').val(shuttleId);
        $('#editSchedule_RouteInput').val(route);
        $('#editDepartureTimeInput').val(departureTime);
        $('#editArrivalTimeInput').val(arrivalTime);
    });

// Helper function to convert "HH:mm AM/PM" to "HH:mm" (24-hour format)
    function convertToTimeInputFormat(timeString) {
        const [time, modifier] = timeString.split(' ');
        let [hours, minutes] = time.split(':');
        if (modifier === 'PM' && hours !== '12') {
            hours = String(Number(hours) + 12);
        }
        if (modifier === 'AM' && hours === '12') {
            hours = '00';
        }
        return `${hours.padStart(2, '0')}:${minutes}`;
    }


});
function updateClock() {
    const options = { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const now = new Intl.DateTimeFormat('en-US', options).format(new Date());
    document.getElementById('realtime-clock').textContent = now;
}
setInterval(updateClock, 1000); // Update every second
updateClock(); // Initialize immediately

$(document).ready(function() {


    // Initialize the map with markers
    let map;
    let markers = [];

    function initMap() {
        const centerMap = { lat: 23.8158287, lng: 90.428023 };
        const mapOptions = {
            center: centerMap,
            zoom: 16,
            disableDefaultUI: true,
        };

        map = new google.maps.Map(document.getElementById('google-map'), mapOptions);

        // Add bus markers to the map
        markers = markersData.map(markerData => {
            return new google.maps.Marker({
                position: { lat: markerData.latitude, lng: markerData.longitude },
                map: map,
                title: `Bus: ${markerData.shuttleID} - Route: ${markerData.routeNo} - Destination: ${markerData.destination}`,
                icon: {
                    url: "https://freesvg.org/img/Bus-Icon.png",
                    scaledSize: new google.maps.Size(35, 32),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(16, 16)
                }
            });
        });
    }

    // Marker data for shuttles
    const markersData = [
        {
            shuttleID: 'S001',
            routeNo: '5',
            latitude: 23.819019,
            longitude: 90.429707,
            destination: 'IUB'
        },
        {
            shuttleID: 'S002',
            routeNo: '1',
            latitude: 23.816817,
            longitude: 90.435492,
            destination: 'Badda'
        },
        {
            shuttleID: 'S003',
            routeNo: '2',
            latitude: 23.814666,
            longitude: 90.421198,
            destination: 'Mirpur'
        },
        {
            shuttleID: 'S004',
            routeNo: '5',
            latitude: 23.8158287,
            longitude: 90.428023,
            destination: 'Mohakhali'
        }
    ];

    // Initialize map
    initMap();

    // Search shuttle by ID
    $('#search-shuttle-btn').on('click', function() {
        const shuttleId = $('#shuttle-search-input').val().trim();
        if (!shuttleId) {
            alert('Please enter a valid Shuttle ID.');
            return;
        }

        // Find the shuttle in the markers data
        const shuttle = markersData.find(marker => marker.shuttleID === shuttleId);
        if (shuttle) {
            // Center the map on the found shuttle
            map.setCenter({ lat: shuttle.latitude, lng: shuttle.longitude });
            map.setZoom(18);
        } else {
            alert('Shuttle ID not found.');
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Function to fetch user information from the backend
    function fetchUserInfo() {
        fetch('http://localhost:3000/user', {
            method: 'GET',
            credentials: 'include', // Include cookies in the request
            headers: {
                'Content-Type': 'application/json',
            }
        })
            .then(response => {
                if (response.status === 401) {
                    // If not authenticated, redirect to login
                    window.location.href = 'index.html';
                }
                return response.json();
            })
            .then(data => {
                if (data.user) {
                    // Update the user's full name in the navbar
                    const userFullNameElement = document.getElementById('userFullName');
                    if (userFullNameElement) {
                        userFullNameElement.textContent = data.user.full_name;
                    }
                    // Update the user's profile picture
                    const userProfileImage = document.getElementById('userPicture');
                    if (userProfileImage && data.user.profile_picture) {
                        userProfileImage.src = data.user.profile_picture;
                    } else if (userProfileImage) {
                        // Set a default image if profile_picture is null
                        userProfileImage.src = 'https://themindfulaimanifesto.org/wp-content/uploads/2020/09/male-placeholder-image.jpeg'; // Replace with your default image URL
                    }

                    // Update the account status badge
                    const accountStatusElement = document.getElementById('account_status');
                    if (accountStatusElement) {
                        accountStatusElement.textContent = data.user.account_status;

                        // Update badge color based on account status
                        switch(data.user.account_status) {
                            case 'Active':
                                accountStatusElement.className = 'badge bg-success';
                                break;
                            case 'Inactive':
                                accountStatusElement.className = 'badge bg-secondary';
                                break;
                            case 'Suspended':
                                accountStatusElement.className = 'badge bg-danger';
                                break;
                            case 'Pending':
                                accountStatusElement.className = 'badge bg-warning';
                                break;
                            default:
                                accountStatusElement.className = 'badge bg-primary';
                        }
                    }

                    // Optionally, update other user-specific elements on the dashboard
                    // For example, updating the user's profile picture if available
                    // const userProfileImage = document.querySelector('.dropdown button img');
                    // if (userProfileImage && data.user.profile_image_url) {
                    //     userProfileImage.src = data.user.profile_image_url;
                    // }
                }
            })
            .catch(error => {
                console.error('Error fetching user info:', error);
                alert('An error occurred while fetching user information. Please try again.');
                // Optionally, redirect to login page
                window.location.href = 'index.html';
            });
    }

    // Function to handle logout
    function handleLogout() {
        fetch('http://localhost:3000/logout', {
            method: 'POST',
            credentials: 'include', // Include cookies in the request
            headers: {
                'Content-Type': 'application/json',
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Logout successful') {
                    // Redirect to login page after successful logout
                    window.location.href = 'index.html';
                } else {
                    alert(data.error || 'Failed to log out. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error during logout:', error);
                alert('An error occurred during logout. Please try again.');
            });
    }

    // Fetch user info when the dashboard loads
    fetchUserInfo();

    // Attach event listener to the logout button
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            // Confirm logout action (optional)
            if (confirm('Are you sure you want to logout?')) {
                handleLogout();
            }
        });
    }
});

