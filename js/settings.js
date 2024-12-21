// settings.js
$(document).ready(function() {
    const apiBaseUrl = 'http://localhost:3000'; // Update if different

    /**
     * Initialize Settings Page
     */
    function initializeSettings() {
        fetchUserSettings();
        fetchRoutesForStops();
    }

    /**
     * Fetch User Settings from Backend
     */
    function fetchUserSettings() {
        $.ajax({
            url: `${apiBaseUrl}/settings`,
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                const settings = response.settings;
                $('#notificationsToggle').prop('checked', settings.push_notifications);
                $('#unitsSelect').val(settings.units);
                $('#locationToggle').prop('checked', settings.location_sharing);
                $('#pickupStop').val(settings.pickup_stop);
                $('#dropoffStop').val(settings.dropoff_stop);
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to load settings.');
            }
        });
    }

    /**
     * Fetch Routes to Populate Pickup and Drop-Off Select Menus
     */
    function fetchRoutesForStops() {
        $.ajax({
            url: `${apiBaseUrl}/routes`,
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                const routes = response.routes;
                const pickupSelect = $('#pickupStop');
                const dropoffSelect = $('#dropoffStop');

                routes.forEach(route => {
                    const option = `<option value="${route.route_name}">${route.route_name}</option>`;
                    pickupSelect.append(option);
                    dropoffSelect.append(option);
                });
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to load routes.');
            }
        });
    }

    /**
     * Handle Settings Form Submission (Default Stops)
     */
    $('#defaultStopsForm').on('submit', function(e) {
        e.preventDefault();
        const pickup_stop = $('#pickupStop').val();
        const dropoff_stop = $('#dropoffStop').val();

        if (pickup_stop === dropoff_stop) {
            showToast('Pickup and Drop-Off routes cannot be the same.', false);
            return;
        }

        $.ajax({
            url: `${apiBaseUrl}/settings`,
            method: 'PUT',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            data: JSON.stringify({ pickup_stop, dropoff_stop }),
            success: function(response) {
                showToast(response.message, true);
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to update default stops.');
            }
        });
    });

    /**
     * Handle Push Notifications Toggle
     */
    $('#notificationsToggle').on('change', function() {
        const push_notifications = $(this).is(':checked');

        $.ajax({
            url: `${apiBaseUrl}/settings`,
            method: 'PUT',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            data: JSON.stringify({ push_notifications }),
            success: function(response) {
                showToast(response.message, true);
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to update push notifications.');
            }
        });
    });

    /**
     * Handle Units of Measurement Change
     */
    $('#unitsSelect').on('change', function() {
        const units = $(this).val();

        $.ajax({
            url: `${apiBaseUrl}/settings`,
            method: 'PUT',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            data: JSON.stringify({ units }),
            success: function(response) {
                showToast(response.message, true);
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to update units of measurement.');
            }
        });
    });

    /**
     * Handle Location Sharing Toggle
     */
    $('#locationToggle').on('change', function() {
        const location_sharing = $(this).is(':checked');

        $.ajax({
            url: `${apiBaseUrl}/settings`,
            method: 'PUT',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            data: JSON.stringify({ location_sharing }),
            success: function(response) {
                showToast(response.message, true);
            },
            error: function(xhr) {
                handleAjaxError(xhr, 'Failed to update location sharing.');
            }
        });
    });

    /**
     * Handle Password Reset Form Submission
     */
    $('#passwordResetForm').on('submit', function(e) {
        e.preventDefault();
        const currentPassword = $('#currentPassword').val();
        const newPassword = $('#newPassword').val();

        $.ajax({
            url: `${apiBaseUrl}/settings/password-reset`,
            method: 'POST',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            },
            data: JSON.stringify({ currentPassword, newPassword }),
            success: function(response) {
                showToast(response.message, true);
                $('#passwordResetForm')[0].reset();
                $('#passwordResetModal').modal('hide');
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Failed to reset password.';
                showToast(error, false);
            }
        });
    });

    /**
     * Handle Delete Account Form Submission
     */
    $('#deleteAccountForm').on('submit', function(e) {
        e.preventDefault();
        const isConfirmed = $('#confirmDelete').is(':checked');

        if (!isConfirmed) {
            showToast('Please confirm account deletion.', false);
            return;
        }

        // Confirmation dialog
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        $.ajax({
            url: `${apiBaseUrl}/settings/delete-account`,
            method: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                showToast(response.message, true);
                window.location.href = 'index.html'; // Redirect to Home or Logout page
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Failed to delete account.';
                showToast(error, false);
            }
        });
    });

    /**
     * Handle Download Offline Schedule Button Click
     */
    $('#downloadScheduleBtn').on('click', function() {
        window.open(`${apiBaseUrl}/settings/offline-schedule`, '_blank');
    });

    /**
     * Helper Function to Show Toast Notifications
     */
    function showToast(message, isSuccess = true) {
        const toast = $('#liveToast');
        toast.find('.toast-body').text(message);
        toast.removeClass('bg-success bg-danger text-white');
        toast.addClass(isSuccess ? 'bg-success text-white' : 'bg-danger text-white');
        const toastInstance = new bootstrap.Toast(toast[0]);
        toastInstance.show();
    }

    /**
     * Helper Function to Handle AJAX Errors
     */
    function handleAjaxError(xhr, defaultMessage) {
        let message = defaultMessage;
        if (xhr.responseJSON && xhr.responseJSON.error) {
            message = xhr.responseJSON.error;
        }
        showToast(message, false);
    }

    /**
     * Initialize the Settings Page
     */
    initializeSettings();
});
