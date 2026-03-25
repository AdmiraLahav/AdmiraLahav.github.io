const date = new Date();
let year = date.getFullYear();
console.log(year)
function myFunction() {
    console.log("Running every second");
}

// Run every 1000 ms (1 second)
setInterval(myFunction, 1000);