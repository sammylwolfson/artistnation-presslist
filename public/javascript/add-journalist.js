async function addFormHandler(event) {
  event.preventDefault();

  const first_name = document.querySelector("#add-first-name").value.trim();
  const last_name = document.querySelector("#add-last-name").value.trim();
  const email = document.querySelector("#add-email").value.trim();
  const company = document.querySelector("#add-company").value.trim();
  const city = document.querySelector("#add-city").value.trim();

  const response = await fetch("api/journalists", {
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
    // SHOULD DOCUMENT RELOAD OR TAKE TO SINGLE PAGE-------------------------------------------!!!!!!!!!!!!!
    document.location.reload();
  }
}

document.querySelector(".add-form").addEventListener("submit", addFormHandler);
