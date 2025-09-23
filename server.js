import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = 5000;

// All cities and municipalities in Batangas province
const BATANGAS_CITIES = [
  "Batangas City", "Lipa City", "Tanauan City", "Santo Tomas City", "Calaca City",
  "Agoncillo", "Alitagtag", "Balayan", "Balete", "Bauan", "Calatagan", "Cuenca", 
  "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", 
  "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", 
  "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", 
  "Taysan", "Tingloy", "Tuy"
];

// Generate dynamic URLs for Rappler's "walang pasok" pages
function generateRapplerUrls() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const todayUrl = `https://www.rappler.com/philippines/class-suspensions-walang-pasok-${formatDate(today)}/`;
  const tomorrowUrl = `https://www.rappler.com/philippines/class-suspensions-walang-pasok-${formatDate(tomorrow)}/`;

  return { todayUrl, tomorrowUrl };
}

// Check if a date is a Philippine holiday
async function checkHoliday(date) {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
    const holidays = await response.json();
    
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
  } catch (error) {
    console.error('Error checking holiday:', error);
    return null;
  }
}

async function scrapeStatusForDay(url, date) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const html = await resp.text();
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent;

    const holiday = await checkHoliday(date);
    
    const results = {};
    
    BATANGAS_CITIES.forEach(city => {
      const cityKey = city.toLowerCase().replace(/\s+/g, '-').replace('city', '').replace(/^-|-$/g, '');
      
      if (holiday) {
        results[cityKey] = `Holiday: ${holiday}`;
      } else {
        const cityVariations = [city, city.replace(' City', ''), city.replace('City', '')];
        const found = cityVariations.some(variation => text.includes(variation));
        results[cityKey] = found ? "No School Today" : "Normal Classes";
      }
    });

    return results;
  } catch (error) {
    const results = {};
    BATANGAS_CITIES.forEach(city => {
      const cityKey = city.toLowerCase().replace(/\s+/g, '-').replace('city', '').replace(/^-|-$/g, '');
      results[cityKey] = "No announcements yet";
    });
    return results;
  }
}

async function scrapeStatus() {
  const { todayUrl, tomorrowUrl } = generateRapplerUrls();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const [todayData, tomorrowData] = await Promise.all([
    scrapeStatusForDay(todayUrl, today),
    scrapeStatusForDay(tomorrowUrl, tomorrow)
  ]);

  const combinedData = {};
  
  BATANGAS_CITIES.forEach(city => {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-').replace('city', '').replace(/^-|-$/g, '');
    combinedData[cityKey] = {
      name: city,
      today: todayData[cityKey] || "No data",
      tomorrow: tomorrowData[cityKey] || "No data"
    };
  });

  return combinedData;
}

app.get("/api/status", async (req, res) => {
  try {
    const data = await scrapeStatus();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.get("/api/dates", (req, res) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const formatDisplayDate = (date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  res.json({
    today: formatDisplayDate(today),
    tomorrow: formatDisplayDate(tomorrow)
  });
});

// Dynamic RSS feed with 7-minute cache
const BASE_URL = process.env.BASE_URL || `https://batangas-school-status.onrender.com`;
let cachedRSS = null;

async function updateRSSCache() {
  try {
    const data = await scrapeStatus();
    const now = new Date().toUTCString();

    let items = [];
    Object.entries(data).forEach(([cityKey, cityData]) => {
      items.push(`
      <item>
        <title>${cityData.name} - Today: ${cityData.today} | Tomorrow: ${cityData.tomorrow}</title>
        <description>Today: ${cityData.today}, Tomorrow: ${cityData.tomorrow}</description>
        <pubDate>${now}</pubDate>
        <guid>${BASE_URL}/#${cityKey}</guid>
      </item>`);
    });

    cachedRSS = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Batangas School Suspension Feed</title>
    <link>${BASE_URL}/</link>
    <description>Daily school status for all cities and municipalities in Batangas province</description>
    <language>en-us</language>
    ${items.join("\n")}
  </channel>
</rss>`;
    console.log("RSS cache updated");
  } catch (e) {
    console.error("Failed to update RSS cache:", e);
  }
}

// Initial population
updateRSSCache();

// Refresh every 7 minutes
setInterval(updateRSSCache, 7 * 60 * 1000);

app.get("/rss.xml", (req, res) => {
  if (!cachedRSS) return res.status(503).send("RSS feed not ready");
  res.type("application/rss+xml").send(cachedRSS);
});

// --- FIXED STATIC SERVING ---
app.use(express.static(".", { extensions: ["html"] }));

app.listen(PORT, "0.0.0.0", () => console.log(`Running at http://0.0.0.0:${PORT}`));
