// Define API key for authentication with Google Sheets
const API_KEY = "AIzaSyBTh9vz77JzhjVHUAFakHw2NsJK72J7IG0"; // Ensure the API key is a valid string enclosed in quotes
const SPREADSHEET_ID = "1Iy02w5ACiV6ej40zHoX8p6zwQF4kegyskTD6D-1LO5A"; // Ensure the spreadsheet ID is correct
const SHEET_NAMES = ["MAGASIN", "DEVIS", "OR"]; // Names of the sheets to fetch

// Declare parentObject globally
var parentObject = {
  last_updated: new Date().toISOString(), // Add metadata for last update timestamp
  AS: []
};

// Function to fetch data for a single sheet
async function fetchSheet(sheetName) {
  // Fix: Ensure the URL string is enclosed in backticks for template literals
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.values) {
      const [headers, ...rows] = data.values; // Split headers and rows
      return rows.map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || null; // Map headers to corresponding row values
        });
        return obj; // Each row becomes an object with keys as headers
      });
    }
    return []; // Handle empty sheet
  } catch (error) {
    // Fix: Ensure the error message is properly formatted
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
}

// Main function to fetch and process all sheets
(async () => {
  // Fetch each sheet individually
  const MAGASIN = await fetchSheet("MAGASIN");
  const DEVIS = await fetchSheet("DEVIS");
  const OR = await fetchSheet("OR");

  // Process DEVIS to extract AS, their vehicles, and associated QUOTES
  DEVIS.forEach((devisRow) => {
    const clientName = devisRow["Client"];
    const idChassis = devisRow["ID_CHASSIS"];
    const idDevis = devisRow["ID_DEVIS"];

    // Check if the client already exists in the parent object
    let client = parentObject.AS.find((c) => c.client === clientName);

    if (!client) {
      // If not, create a new client entry
      client = {
        client: clientName,
        vehicles: [] // Initialize an empty array for vehicles
      };
      parentObject.AS.push(client);
    }

    // Check if the vehicle already exists for this client
    let vehicle = client.vehicles.find((v) => v.ID_CHASSIS === idChassis);

    if (!vehicle) {
      // If not, add the vehicle to the client's vehicles array
      vehicle = {
        ID_CHASSIS: idChassis,
        ID_VEHICLE: devisRow["ID_VEHICLE"],
        Marque: devisRow["Marque"],
        Modèle: devisRow["Modèle"],
        Immatric: devisRow["Immatric"],
        state: "", // Initialize state
        quotes: [], // Initialize an empty array for QUOTES
        repair: [] // Initialize an empty array for REPAIRS
      };
      client.vehicles.push(vehicle);
    }

    // Check if the quote already exists for this ID_DEVIS
    let quote = vehicle.quotes.find((q) => q.ID_DEVIS === idDevis);

    if (!quote) {
      // Add the quote object under ID_DEVIS
      quote = {
        ID_DEVIS: idDevis,
        details: {
          Date: devisRow["Date"],
          Code_INTERNE: devisRow["Code_INTERNE"],
          Mt_PIECES: devisRow["Mt_PIECES"],
          Mt_MO: devisRow["Mt_MO"],
          REF: devisRow["REF"],
          Description: devisRow["Description"],
          QTE_DEMANDEE: devisRow["QTE_DEMANDEE"],
          Statut: devisRow["Statut"],
          spart_order: MAGASIN.filter((magasinRow) => magasinRow["ID_DEVIS"] === idDevis).map((magasinRow) => ({
            N_BC: magasinRow["N_BC"],
            REF: magasinRow["REF"],
            Description: magasinRow["Description"],
            QTE_DEMANDEE: magasinRow["QTE_DEMANDEE"],
            Statut: magasinRow["Statut"],
            TYPE_CMD: magasinRow["TYPE_CMD"],
            Disponibility: magasinRow["Disponibility"],
            livre: magasinRow["livre"],
            "QTE-RESTANTE": magasinRow["QTE-RESTANTE"],
            STOCK: magasinRow["STOCK"]
          }))
        }
      };
      vehicle.quotes.push(quote);
    }

    // Update state if parts are present in spart_order
    if (quote.details.spart_order.length > 0) {
      vehicle.state = "in order";
    }
  });

  // Process OR to add repair details to vehicles
  OR.forEach((orRow) => {
    const idChassis = orRow["ID_CHASSIS"];

    // Find the vehicle in the parent object
    const vehicle = parentObject.AS
      .flatMap((client) => client.vehicles) // Get all vehicles across all AS
      .find((v) => v.ID_CHASSIS === idChassis);

    if (vehicle) {
      // Add the repair details to the vehicle's repair array
      vehicle.repair.push({
        ID_OR: orRow["ID_OR"],
        Date: orRow["Date"],
        Code_INTERNE: orRow["Code_INTERNE"],
        Mt_PIECES: orRow["Mt_PIECES"],
        Mt_MO: orRow["Mt_MO"]
      });

      // Update state if repairs exist
      if (vehicle.repair.length > 0) {
        vehicle.state = "in repair";
      }
    }
    /////////////////////////////////////////
    function filterClients(searchWord) {
      const regex = new RegExp(`${searchWord.replace(/\*/g, ".*")}`, "i");
      return parentObject.AS.filter(clt => {
        // Check if client name matches
        if (regex.test(clt.client)) {
          return true;
        }
    
        // Check if any vehicle's Immatric matches
        return clt.vehicles.some(vehicle => regex.test(vehicle.Immatric));
      });
    }
    
    document.getElementById("searchButton").addEventListener("click", () => {
      const searchWord = document.getElementById("searchInput").value.trim();
      const resultDiv = document.getElementById("result");
    
      if (!searchWord) {
        resultDiv.textContent = "Please enter a valid search term.";
        return;
      }
    
      const results = filterClients(searchWord);
      resultDiv.innerHTML = "";
    
      if (results.length > 0) {
        results.forEach(clt => {
          clt.vehicles.forEach(vehicle => {
            // Display vehicle details in a table above the spare parts table
            const vehicleDetailsTable = document.createElement("table");
            vehicleDetailsTable.border = "1";
    
            // Create table headers for vehicle details
            const vehicleHeaders = ["ID_CHASSIS", "ID_VEHICLE", "Marque", "Modèle", "Immatric", "state"];
            const vehicleHeaderRow = document.createElement("tr");
            vehicleHeaders.forEach(header => {
              const th = document.createElement("th");
              th.textContent = header;
              vehicleHeaderRow.appendChild(th);
            });
            vehicleDetailsTable.appendChild(vehicleHeaderRow);
    
            // Create a single row with vehicle details
            const vehicleDataRow = document.createElement("tr");
            vehicleHeaders.forEach(header => {
              const td = document.createElement("td");
              td.textContent = vehicle[header] !== undefined ? vehicle[header] : "";
              vehicleDataRow.appendChild(td);
            });
            vehicleDetailsTable.appendChild(vehicleDataRow);
    
            // Add row for ID_DEVIS and its details
            const quote = vehicle.quotes?.[0]?.details;
            if (quote) {
              const quoteRow = document.createElement("tr");
              const quoteData = `
                ID_DEVIS: ${vehicle.quotes?.[0]?.ID_DEVIS || "N/A"},
                Date: ${quote.Date || "N/A"},
                Code_INTERNE: ${quote.Code_INTERNE || "N/A"},
                Mt_PIECES: ${quote.Mt_PIECES || "N/A"},
                Mt_MO: ${quote.Mt_MO || "N/A"}
              `;
              const quoteCell = document.createElement("td");
              quoteCell.colSpan = vehicleHeaders.length;
              quoteCell.textContent = quoteData;
              quoteRow.appendChild(quoteCell);
              vehicleDetailsTable.appendChild(quoteRow);
            }
    
            // Add row for repair details
            if (vehicle.repair.length > 0) {
              const repairRow = document.createElement("tr");
              const repairData = vehicle.repair
                .map(
                  repair => `
                    ID_OR: ${repair.ID_OR || "N/A"},
                    Date: ${repair.Date || "N/A"},
                    Mt_PIECES: ${repair.Mt_PIECES || "N/A"},
                    Mt_MO: ${repair.Mt_MO || "N/A"}
                  `
                )
                .join("\n");
              const repairCell = document.createElement("td");
              repairCell.colSpan = vehicleHeaders.length;
              repairCell.textContent = repairData;
              repairRow.appendChild(repairCell);
              vehicleDetailsTable.appendChild(repairRow);
            }
    
            resultDiv.appendChild(vehicleDetailsTable);
    
            if (quote?.spart_order?.length) {
              const spartOrder = quote.spart_order;
    
              // Create spare parts table dynamically
              const spartOrderTable = document.createElement("table");
              spartOrderTable.border = "1";
    
              // Create table headers for spare parts
              const headers = Object.keys(spartOrder[0]); // Use the keys of the first object
              const headerRow = document.createElement("tr");
              headers.forEach(header => {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
              });
              spartOrderTable.appendChild(headerRow);
    
              // Create table rows for spare parts
              spartOrder.forEach(part => {
                const row = document.createElement("tr");
                headers.forEach(header => {
                  const td = document.createElement("td");
                  td.textContent = part[header] !== undefined ? part[header] : ""; // Fallback for undefined values
                  row.appendChild(td);
                });
                spartOrderTable.appendChild(row);
              });
    
              resultDiv.appendChild(spartOrderTable);
            } else {
              const noParts = document.createElement("p");
              noParts.textContent = "No spare parts available.";
              resultDiv.appendChild(noParts);
            }
          });
        });
      } else {
        resultDiv.textContent = "No matches found.";
      }
    });
    
  /////////////////////////////////////////////

 });
   
})();

