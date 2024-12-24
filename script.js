document.getElementById("searchButton").addEventListener("click", async () => {
  const searchWord = document.getElementById("searchInput").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = ""; // Clear previous results

  if (!searchWord) {
    resultDiv.textContent = "Please enter a valid search term.";
    return;
  }

  try {
    const response = await fetch(`/api/fetch-data?search=${encodeURIComponent(searchWord)}`);
    const data = await response.json();

    if (data.length === 0) {
      resultDiv.textContent = "No matches found.";
    } else {
      displayFilteredData(data, resultDiv);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    resultDiv.textContent = "An error occurred while fetching data.";
  }
});

/**
 * Function to display filtered data
 */
function displayFilteredData(data, container) {
  const table = document.createElement("table");
  table.border = "1";

  const headers = Object.keys(data[0]);
  const headerRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  data.forEach((row) => {
    const dataRow = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent = row[header] || "N/A";
      dataRow.appendChild(td);
    });
    table.appendChild(dataRow);
  });

  container.appendChild(table);
}
