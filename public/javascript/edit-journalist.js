async function editFormHandler(event) {
    event.preventDefault();
  
    const first_name = document.querySelector('input[name="first-name"]').value.trim();
    const last_name = document.querySelector('input[name="last-name"]').value.trim();
    const company = document.querySelector('input[name="company"]').value.trim();
    const city = document.querySelector('input[name="city"]').value.trim();
    const email = document.querySelector('input[name="email"]').value.trim();

    const id = window.location.toString().split('/')[
      window.location.toString().split('/').length - 1
    ];
    const response = await fetch(`/api/journalists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name,
        last_name,
        company,
        city,
        email
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  
    if (response.ok) {
      document.location.replace('/journalists/');
    } else {
      alert(response.statusText);
    }
  }
  
  document.querySelector('.edit-journalist-form').addEventListener('submit', editFormHandler);