const map = L.map("map").setView([39.6283, -97.5795], 5); // San Francisco
const OutlookText = document.getElementById("OutlookText");
const DateText = document.getElementById("DateText");
const CreditsBlock = document.getElementById("bottombar");
const Day1 = new Date();
const Day2 = new Date();
Day2.setDate(Day1.getDate() + 1);
const Day3 = new Date();
Day3.setDate(Day1.getDate() + 2);

const Days = [Day1, Day2, Day3];

const centralUSPolygon = [
  [47.8, -125.7],
  [42, -125],
  [35.1, -121.8],
  [32.4, -117.6],
  [31.3, -110.9],
  [31, -105.9],
  [25, -97],
  [29, -84.8],
  [24.7, -80.7],
  [27.8, -79.7],
  [31.2, -80.5],
  [46.3, -65],
  [47.4, -69.4],
  [48.7, -127],
];

L.polygon(centralUSPolygon, { color: "blue" });
map.fitBounds(centralUSPolygon); // Zooms to the polygon

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CartoDB",
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

map.zoomControl.remove();
const params = new URLSearchParams(window.location.search);
let Day = params.get("day");
let OutlookMode = params.get("outlook");
const Zone = params.get("zone");
const HideStatus = params.get("hide");
if (HideStatus == "true") {
  CreditsBlock.style.display = "none";
}

async function GetZone() {
  const response = await fetch(`https://api.weather.gov/zones/county/${Zone}`);
  if (response.ok) {
    const data = await response.json();
    const RawPolygon = data["geometry"]["coordinates"];
    let CleanedPolygon = [];
    for (let index = 0; index < RawPolygon[0].length; index++) {
      CleanedPolygon.push([RawPolygon[0][index][1], RawPolygon[0][index][0]]);
    }
    const Polygon = L.polygon(CleanedPolygon, {
      color: "black", // border color
      fillColor: "none", // fill color
      fillOpacity: 0, // fill transparency
    }).addTo(map);
    map.fitBounds(Polygon.getBounds());
  }
}

let currentOutlookDisplay = null;
let OutlookData = [];
let OutlookLayer = L.layerGroup();
OutlookLayer.addTo(map);
const textIcon = L.divIcon({
  className: "text-label",
  html: "",
  iconSize: [100, 60],
});

async function FilterGeoJson(GeoData) {
  const Features = GeoData["features"];
  let filtered = {
    Categorical: [],
    Tornado: [],
    Wind: [],
    Hail: [],
  };
  for (let index = 0; index < Features.length; index++) {
    const Feature = Features[index];
    Feature.properties["fill-opacity"] = 0.5;
    const Props = Feature.properties;
    if (Props.LABEL == "TSTM") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL == "MRGL") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL == "SLGT") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL == "ENH") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL == "MDT") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL == "HIGH") {
      filtered.Categorical.push(Feature);
    } else if (Props.LABEL2.includes("Tornado")) {
      switch (Props.LABEL) {
        case "0.02":
          filtered.Tornado.push(Feature);
          break;
        case "0.05":
          filtered.Tornado.push(Feature);
          break;
        case "0.10":
          filtered.Tornado.push(Feature);
          break;
        case "0.15":
          filtered.Tornado.push(Feature);
          break;
        case "0.30":
          filtered.Tornado.push(Feature);
          break;
        case "0.45":
          filtered.Tornado.push(Feature);
          break;
        case "0.60":
          filtered.Tornado.push(Feature);
          break;
        default:
          Feature.properties["fill-opacity"] = 0.1;
          filtered.Tornado.push(Feature);
          break;
      }
    } else if (Props.LABEL2.includes("Wind")) {
      switch (Props.LABEL) {
        case "0.05":
          filtered.Wind.push(Feature);
          break;
        case "0.15":
          filtered.Wind.push(Feature);
          break;
        case "0.30":
          filtered.Wind.push(Feature);
          break;
        case "0.45":
          filtered.Wind.push(Feature);
          break;
        case "0.60":
          filtered.Wind.push(Feature);
          break;
        default:
          Feature.properties["fill-opacity"] = 0.2;
          filtered.Wind.push(Feature);
          break;
      }
    } else if (Props.LABEL2.includes("Hail")) {
      switch (Props.LABEL) {
        case "0.05":
          filtered.Hail.push(Feature);
          break;
        case "0.15":
          filtered.Hail.push(Feature);
          break;
        case "0.30":
          filtered.Hail.push(Feature);
          break;
        case "0.45":
          filtered.Hail.push(Feature);
          break;
        case "0.60":
          filtered.Hail.push(Feature);
          break;
        default:
          Feature.properties["fill-opacity"] = 0.2;
          filtered.Hail.push(Feature);
          break;
      }
    }
  }
  return filtered;
}

async function GetOutlook(GrabDay) {
  const Response = await fetch(
    `https://www.spc.noaa.gov/products/outlook/day${GrabDay}otlk.kml`
  );
  if (Response.status == 200) {
    const RawKLM = await Response.text();
    const Parser = new DOMParser();
    const CleanedKLM = Parser.parseFromString(RawKLM, "application/xml");

    const GeoJson = toGeoJSON.kml(CleanedKLM);
    return GeoJson;
  } else {
    console.log(`Failed to get outlook. Error ${Response.status}`);
  }
}

async function PlaceOnMap(GeoData) {
  if (GeoData.length === 0) {
    if (Day > 2) {
      textIcon.options.html = "<h1>No Data</h1>";
    } else {
      textIcon.options.html = "<h1>Less than 2%</h1>";
    }
    currentOutlookDisplay = L.marker([39.8283, -98.5795], {
      icon: textIcon,
    }).addTo(map);
  } else {
    currentOutlookDisplay = L.geoJSON(GeoData, {
      style: function (feature) {
        return {
          color: feature.properties.stroke,
          fillColor: feature.properties.fill,
          fillOpacity: feature.properties["fill-opacity"],
          strokeOpacity: feature.properties["stroke-opacity"],
        };
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.LABEL2);
      },
    }).addTo(OutlookLayer);
  }
}

async function ShowConvectiveOutlook() {
  const GeoData = OutlookData[Day - 1];
  const CleanedGeoData = await FilterGeoJson(GeoData);
  OutlookLayer.clearLayers();
  if (currentOutlookDisplay != null) {
    currentOutlookDisplay.remove();
  }
  switch (OutlookMode) {
    case "Categorical":
      await PlaceOnMap(CleanedGeoData.Categorical);
      break;
    case "Tornado":
      await PlaceOnMap(CleanedGeoData.Tornado);
      break;
    case "Wind":
      await PlaceOnMap(CleanedGeoData.Wind);
      break;
    case "Hail":
      await PlaceOnMap(CleanedGeoData.Hail);
      break;
  }
}

async function ConvectiveChange() {
  OutlookText.innerText = `Day ${Day} ${OutlookMode} Outlook`;
  DateText.innerText = Days[Day - 1].toDateString();
  await ShowConvectiveOutlook();
}

async function Main() {
  for (let index = 0; index < 3; index++) {
    OutlookData[index] = await GetOutlook(index + 1);
  }
  ConvectiveChange();
  if (Zone) {
    await GetZone();
  }
}

Main();

document.addEventListener("keypress", async (key) => {
  switch (key.key) {
    case "1":
      Day = 1;
      break;
    case "2":
      Day = 2;
      break;
    case "3":
      Day = 3;
      break;
    case "7":
      OutlookMode = "Categorical";
      break;
    case "8":
      OutlookMode = "Tornado";
      break;
    case "9":
      OutlookMode = "Wind";
      break;
    case "0":
      OutlookMode = "Hail";
      break;
  }
  await ConvectiveChange();
});
