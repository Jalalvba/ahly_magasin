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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.values) {
      const [headers, ...rows] = data.values;
      return rows.map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || null;
        });
        return obj;
      });
    }
    return [];
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
}

// Main function to fetch and process all sheets
(async () => {
  const MAGASIN = await fetchSheet("MAGASIN");
  const DEVIS = await fetchSheet("DEVIS");
  const OR = await fetchSheet("OR");

  // Process DEVIS to extract AS, their vehicles, and associated QUOTES
  DEVIS.forEach((devisRow) => {
    const clientName = devisRow["Client"];
    const idChassis = devisRow["ID_CHASSIS"];
    const idDevis = devisRow["ID_DEVIS"];

    let client = parentObject.AS.find((c) => c.client === clientName);

    if (!client) {
      client = { client: clientName, vehicles: [] };
      parentObject.AS.push(client);
    }

    let vehicle = client.vehicles.find((v) => v.ID_CHASSIS === idChassis);

    if (!vehicle) {
      vehicle = {
        ID_CHASSIS: idChassis,
        ID_VEHICLE: devisRow["ID_VEHICLE"],
        Marque: devisRow["Marque"],
        Modèle: devisRow["Modèle"],
        Immatric: devisRow["Immatric"],
        state: "",
        quotes: [],
        repair: []
      };
      client.vehicles.push(vehicle);
    }

    let quote = vehicle.quotes.find((q) => q.ID_DEVIS === idDevis);

    if (!quote) {
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

    if (quote.details.spart_order.length > 0) {
      vehicle.state = "in order";
    }
  });

  OR.forEach((orRow) => {
    const idChassis = orRow["ID_CHASSIS"];

    const vehicle = parentObject.AS
      .flatMap((client) => client.vehicles)
      .find((v) => v.ID_CHASSIS === idChassis);

    if (vehicle) {
      vehicle.repair.push({
        ID_OR: orRow["ID_OR"],
        Date: orRow["Date"],
        Code_INTERNE: orRow["Code_INTERNE"],
        Mt_PIECES: orRow["Mt_PIECES"],
        Mt_MO: orRow["Mt_MO"]
      });

      if (vehicle.repair.length > 0) {
        vehicle.state = "in repair";
      }
    }
  });

  /////////////////////////////////////////
  function filterClients(searchWord) {
    const regex = new RegExp(`${searchWord.replace(/\*/g, ".*")}`, "i");
    return parentObject.AS.filter(clt => {
      if (regex.test(clt.client)) return true;
      return clt.vehicles.some(vehicle => regex.test(vehicle.Immatric));
    });
  }
  
  document.getElementById("searchButton").addEventListener("click", () => {
    const searchWord = document.getElementById("searchInput").value.trim();
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
  
    if (!searchWord) {
      resultDiv.textContent = "Please enter a valid search term.";
      return;
    }
  
    const results = filterClients(searchWord);
  
    if (results.length === 1) {
      displayClientData(results[0], resultDiv);
    } else if (results.length > 1) {
      const instructions = document.createElement("p");
      instructions.textContent = "Select the correct client:";
      resultDiv.appendChild(instructions);
  
      const list = document.createElement("ul");
      results.forEach(client => {
        const listItem = document.createElement("li");
        const button = document.createElement("button");
        button.textContent = client.client;
        button.addEventListener("click", () => {
          resultDiv.innerHTML = "";
          displayClientData(client, resultDiv);
        });
        listItem.appendChild(button);
        list.appendChild(listItem);
      });
  
      resultDiv.appendChild(list);
    } else {
      resultDiv.textContent = "No matches found.";
    }
  });
  
  function displayClientData(client, resultDiv) {
    const clientHeader = document.createElement("h2");
    clientHeader.textContent = `Client: ${client.client}`;
    resultDiv.appendChild(clientHeader);
  
    client.vehicles.forEach(vehicle => {
      // Vehicle Details Table
      const vehicleDetailsTable = document.createElement("table");
      const vehicleHeaders = ["ID_CHASSIS", "ID_VEHICLE", "Marque", "Modèle", "Immatric", "state"];
      const vehicleHeaderRow = document.createElement("tr");
      vehicleHeaders.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        vehicleHeaderRow.appendChild(th);
      });
      vehicleDetailsTable.appendChild(vehicleHeaderRow);
  
      const vehicleDataRow = document.createElement("tr");
      vehicleHeaders.forEach(header => {
        const td = document.createElement("td");
        td.textContent = vehicle[header] || "N/A";
        vehicleDataRow.appendChild(td);
      });
      vehicleDetailsTable.appendChild(vehicleDataRow);
  
      // Quotes Row
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
  
      // Repair Row
      const repair = vehicle.repair?.[0];
      if (repair) {
        const repairRow = document.createElement("tr");
        const repairData = `
          ID_OR: ${repair.ID_OR || "N/A"},
          Date: ${repair.Date || "N/A"},
          Code_INTERNE: ${repair.Code_INTERNE || "N/A"},
          Mt_PIECES: ${repair.Mt_PIECES || "N/A"},
          Mt_MO: ${repair.Mt_MO || "N/A"}
        `;
        const repairCell = document.createElement("td");
        repairCell.colSpan = vehicleHeaders.length;
        repairCell.textContent = repairData;
        repairRow.appendChild(repairCell);
        vehicleDetailsTable.appendChild(repairRow);
      }
  
      resultDiv.appendChild(vehicleDetailsTable);
  
      // Spare Parts Table
      if (quote?.spart_order?.length) {
        const spartOrderTable = document.createElement("table");
        const headers = Object.keys(quote.spart_order[0]);
        const headerRow = document.createElement("tr");
        headers.forEach(header => {
          const th = document.createElement("th");
          th.textContent = header;
          headerRow.appendChild(th);
        });
        spartOrderTable.appendChild(headerRow);
  
        quote.spart_order.forEach(part => {
          const row = document.createElement("tr");
          headers.forEach(header => {
            const td = document.createElement("td");
            td.textContent = part[header] || "N/A";
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
  }
  /////////////////////////////////////////////
})();
