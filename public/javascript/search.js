async function searchFormHandler(event) {
  event.preventDefault();

  const first_name = document.querySelector("#add-first-name").value.trim();
  const last_name = document.querySelector("#add-last-name").value.trim();
  const email = document.querySelector("#add-email").value.trim();
  const company = document.querySelector("#add-company").value.trim();
  const city = document.querySelector("#add-city").value.trim();

  const response = await fetch("api/journalists/search", {
    method: "POST",
    body: JSON.stringify({
      first_name,
      last_name,
      email,
      company,
      city,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    // verify the route to all journalists------------------------------------------!!!!!!!!!!!!!
    document.location.replace("/journalists");
  } else {
    alert(response.statusText);
  }
}

document
  .querySelector(".search-form")
  .addEventListener("submit", searchFormHandler);
