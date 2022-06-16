async function deleteFormHandler(event) {
    event.preventDefault();
    const target = event.target.parentElement
    const parent = target.parentElement.firstElementChild
    const id = parent.innerHTML

    const response = await fetch(`/api/admin/${id}`, {
        method: 'DELETE',
  });

  if(response.ok){
      document.location.replace('/admins/')
  } else {
      console.log(response);
      alert(response.statusText)
  }
};
  
  document.querySelector('.admin-table').addEventListener('click', deleteFormHandler);