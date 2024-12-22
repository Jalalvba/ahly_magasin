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
  


// Function to filter clients based on input
function filterClients(searchWord) {
  // Convert wildcard (*) to regex
  const regex = new RegExp(`${searchWord.replace(/\*/g, ".*")}`, "i");

  // Filter the clients
  return parentObject.AS.filter(clt => regex.test(clt.client));
}

// Handle search button click
document.getElementById("searchButton").addEventListener("click", () => {
  // Get user input
  const searchWord = document.getElementById("searchInput").value;

  // Perform the filtering
  const results = filterClients(searchWord);

  // Display the results
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = ""; // Clear previous results

  if (results.length > 0) {
    results.forEach(clt => {
      const clientElement = document.createElement("p");
      clientElement.textContent = `Client: ${clt.client}`;
      resultDiv.appendChild(clientElement);
    });
  } else {
    resultDiv.textContent = "No matches found.";
  }
});




  

 });
   
})();

