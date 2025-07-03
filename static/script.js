
document.getElementById("download-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = document.getElementById("url").value;
  const format = document.getElementById("format").value;
  const resDiv = document.getElementById("result");
  resDiv.textContent = "Processing...";
  const response = await fetch("/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, format })
  });
  const data = await response.json();
  if (data.success) {
    resDiv.innerHTML = `<a href="${data.file}" download>Click here to download</a>`;
  } else {
    resDiv.textContent = "Error: " + data.error;
  }
});
