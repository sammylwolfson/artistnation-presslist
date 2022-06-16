async function addFormHandler(event) {
    event.preventDefault();
  
    const username = document.querySelector("#add-username").value.trim();
    const password = document.querySelector("#add-password").value.trim();
  
    const response = await fetch("/api/admin/", {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    if (response.ok) {
      alert("Admin has been created");
      document.location.reload();
    } else {
      alert(response.statusText);
    }
  }
  
  document.querySelector(".add-form").addEventListener("submit", addFormHandler);
  