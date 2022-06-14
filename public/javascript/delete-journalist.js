async function deleteFormHandler(event) {
    event.preventDefault();
    
    const id = window.location.toString().split('/')[
        window.location.toString().split('/').length - 1
      ];

    const response = await fetch(`/api/journalists/${id}`, {
        method: 'DELETE',
  });

  if(response.ok){
      document.location.replace('/journalists/')
  } else {
      console.log(response);
      alert(response.statusText)
  }
};
  
  document.querySelector('#delete-journalist-btn').addEventListener('click', deleteFormHandler);