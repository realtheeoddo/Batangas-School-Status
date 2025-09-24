import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = 5000;

const BATANGAS_CITIES = [
  "Batangas City", "Lipa City", "Tanauan City", "Santo Tomas City", "Calaca City",
  "Agoncillo", "Alitagtag", "Balayan", "Balete", "Bauan", "Calatagan", "Cuenca", 
  "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", 
  "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", 
  "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", 
  "Taysan", "Tingloy", "Tuy"
];

function generateRapplerUrls() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return `${months[date.getMonth()]}-${date.getDate()}-${date.getFullYear()}`;
  };

  return {
    todayUrl: `https://www.rappler.com/philippines/class-suspensions-walang-pasok-${formatDate(today)}/`,
    tomorrowUrl: `https://www.rappler.com/philippines/class-suspensions-walang-pasok-${formatDate(tomorrow)}/`
  };
}

async function checkHoliday(date) {
  try {
    const year = date.getFullYear();
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
    const holidays = await response.json();
    const dateStr = `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
  } catch {
    return null;
  }
}

async function scrapeStatusForDay(url, date) {
  try {
    const resp = await fetch(url);
    const html = await resp.text();
    const dom = new JSDOM(html);

    // Grab the Batangas-specific section only
    const batangasSection = Array.from(dom.window.document.querySelectorAll("h2, h3, strong, b"))
      .find(el => el.textContent.toLowerCase().includes("batangas"))
      ?.parentElement?.textContent || dom.window.document.body.textContent;

    const text = batangasSection;
    const holiday = await checkHoliday(date);

    const results = {};
    BATANGAS_CITIES.forEach(city => {
      const cityKey = city.toLowerCase().replace(/\s+/g, '-').replace('city', '').replace(/^-|-$/g, '');
      if (holiday) {
        results[cityKey] = `Holiday: ${holiday}`;
      } else {
        const cityVariations = [city, city.replace(" City", ""), city.replace("City", "")];
        const found = cityVariations.some(v => text.includes(v));
        results[cityKey] = found ? "No School Today" : "Normal Classes";
      }
    });

    return results;
  } catch {
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
      tomorrow: tomorrowData[cityKey] === "Normal Classes" 
        ? "Normal Classes (subject to change)" 
        : tomorrowData[cityKey] || "No data"
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
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  res.json({ today: `${months[today.getMonth()]} ${today.getDate()}`, tomorrow: `${months[tomorrow.getMonth()]} ${tomorrow.getDate()}` });
});

app.use(express.static("."));
app.listen(PORT, "0.0.0.0", () => console.log(`Running at http://0.0.0.0:${PORT}`));
