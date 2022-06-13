async function searchFormHandler(event) {
  event.preventDefault();

  const first_name = document.querySelector("#search-first-name").value.trim();
  const last_name = document.querySelector("#search-last-name").value.trim();
  const email = document.querySelector("#search-email").value.trim();
  const company = document.querySelector("#search-company").value.trim();
  const city = document.querySelector("#search-city").value.trim();

  let queryString = "/search?";

  let queryParameters = {};
  if (first_name) {
    queryParameters.first_name = first_name;
  }
  if (last_name) {
    queryParameters.last_name = last_name;
  }
  if (email) {
    queryParameters.email = email;
  }
  if (company) {
    queryParameters.company = company;
  }
  if (city) {
    queryParameters.city = city;
  }
  Object.entries(queryParameters).forEach(([key, value]) => {
    queryString += `${key}=${value}&`;
  });
  console.log("QS", queryString);

  document.location.replace(queryString);

  // const response = await fetch(queryString, {
  //   method: "GET",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });

  // const response = await fetch('/api/journalists/search', {
  //   method: "POST",
  //   body:
  //     JSON.stringify({
  //       first_name,
  //       last_name,
  //       email,
  //       company,
  //       city
  //     }),
  //   headers: {
  //     "Content-Type": "application/json",
  //   }
  // });

  // if (response.ok) {
  //   // verify the route to all journalists------------------------------------------!!!!!!!!!!!!!
  //   document.location.replace("/search");
  // } else {
  //   alert(response.statusText);
  // }
}

document
  .querySelector(".search-form")
  .addEventListener("submit", searchFormHandler);
