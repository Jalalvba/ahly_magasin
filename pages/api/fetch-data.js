const fetch = require("node-fetch");

export default async function handler(req, res) {
  const API_KEY = process.env.API_KEY; // Your API key stored securely in Vercel
  const SPREADSHEET_ID = "1Iy02w5ACiV6ej40zHoX8p6zwQF4kegyskTD6D-1LO5A";
  const SHEET_NAMES = ["MAGASIN", "DEVIS", "OR"];
  const searchQuery = req.query.search || "";

  try {
    const fetchSheet = async (sheetName) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.values || [];
    };

    const allSheets = await Promise.all(SHEET_NAMES.map(fetchSheet));

    const processedData = allSheets.flat().filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    res.status(200).json(processedData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
