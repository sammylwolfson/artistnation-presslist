function searchFormHandler(event) {
  event.preventDefault();

  const first_name = document.querySelector("#search-first-name").value.trim();
  const last_name = document.querySelector("#search-last-name").value.trim();
  const email = document.querySelector("#search-email").value.trim();
  const company = document.querySelector("#search-company").value.trim();
  const city = document.querySelector("#search-city").value.trim();

fetch("/api/journalists/search", {
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
  })
  .then((response)=> response.json())
  console.log(data)
  .then((data)=>{
    const id = (data[0].id)
    document.location.replace(`/search/${id}`)
  })
};

document
  .querySelector(".search-form")
  .addEventListener("submit", searchFormHandler);
