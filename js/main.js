// main.js
$(document).ready(function(){
    $("#CreateAccountbtn").click(function(){
        alert("Your Form Has Been Successfully Submitted. Please Wait for Confirmation from Admin Panel!");
    });
    
    $("#editProfileBtn").click(function(){
        alert("Your Form Has Been Successfully Edited!");
    })

    $("#passwordForm").on("submit", function (event) {
        event.preventDefault(); // Prevent the default form submission
        const newPassword = $("#newPassword").val();
        const confirmPassword = $("#confirmPassword").val();

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match!");
            return;
        }

        alert("Password changed successfully!");
        $(this).trigger("reset"); // Reset the form using jQuery
    });
   
    

});