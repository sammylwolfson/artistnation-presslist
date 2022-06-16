function sortFirstNameHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/first_name";
  } else {
    queryString = `/sort/first_name?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

function sortLastNameHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/last_name";
  } else {
    queryString = `/sort/last_name?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

function sortCompanyHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/company";
  } else {
    queryString = `/sort/company?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

function sortEmailHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/email";
  } else {
    queryString = `/sort/email?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

function sortCityHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/city";
  } else {
    queryString = `/sort/city?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

function sortDateAddedHandler(event) {
  event.preventDefault();

  let queryString;

  if (document.location.toString().split("?").length === 1) {
    queryString = "/sort/date_added";
  } else {
    queryString = `/sort/date_added?${
      document.location.toString().split("?")[
        document.location.toString().split("?").length - 1
      ]
    }`;
  }
  document.location.replace(queryString);
}

document
  .querySelector("#sort-first-name")
  .addEventListener("click", sortFirstNameHandler);
document
  .querySelector("#sort-last-name")
  .addEventListener("click", sortLastNameHandler);
document
  .querySelector("#sort-company")
  .addEventListener("click", sortCompanyHandler);
document
  .querySelector("#sort-email")
  .addEventListener("click", sortEmailHandler);
document.querySelector("#sort-city").addEventListener("click", sortCityHandler);
document
  .querySelector("#sort-date-added")
  .addEventListener("click", sortDateAddedHandler);
