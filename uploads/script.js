document.getElementById("myForm").addEventListener("submit", function(event) {
    event.preventDefault(); // stop form refresh

    const first = document.getElementById("firstName").value;
    const last = document.getElementById("lastName").value;

    const output = `First Name: ${first}<br>Last Name: ${last}`;

    document.getElementById("result").innerHTML = output;
});
