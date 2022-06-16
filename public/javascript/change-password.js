async function updatePasswordHandler(event) {
  event.preventDefault();

  const new_password = document.querySelector("#new-password").value;
  const confirm_password = document.querySelector("#confirm-password").value;

  if (new_password === confirm_password) {
    const response = await fetch(`/api/admin/password`, {
      method: "PUT",
      body: JSON.stringify({
        new_password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Password has been updated");
      document.location.replace("/");
    }
  } else {
    alert("passwords do not match");
  }
}

document
  .querySelector(".change-password-form")
  .addEventListener("submit", updatePasswordHandler);
