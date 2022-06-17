$( function() {
    fetch('/api/journalists/')
    .then(response => response.json())
    .then(data => data.map(dat => (dat.city)))
    .then(results => {
        var availableCities = results;
        $( "#search-city" ).autocomplete({
          source: availableCities
        });
    })
});

$( function() {
    fetch('/api/journalists/')
    .then(response => response.json())
    .then(data => data.map(dat => (dat.first_name)))
    .then(results => {
        var availableFirstNames = results;
        $( "#search-first-name" ).autocomplete({
          source: availableFirstNames
        });
    })
})

$( function() {
  fetch('/api/journalists/')
  .then(response => response.json())
  .then(data => data.map(dat => (dat.last_name)))
  .then(results => {
      var availableLastNames = results;
      $( "#search-last-name" ).autocomplete({
        source: availableLastNames
      });
  })
})

$( function() {
  fetch('/api/journalists/')
  .then(response => response.json())
  .then(data => data.map(dat => (dat.company)))
  .then(results => {
    var availableComapnies = results;
    $( "#search-company" ).autocomplete({
      source: availableComapnies
    });
  })
});

$( function() {
  fetch('/api/journalists/')
  .then(response => response.json())
  .then(data => data.map(dat => (dat.email)))
  .then(results => {
    console.log(results)
    var availableEmails = results;
    $( "#search-email" ).autocomplete({
      source: availableEmails
    });
  })
});

