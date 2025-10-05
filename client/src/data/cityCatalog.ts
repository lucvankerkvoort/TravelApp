import type { City } from "../types/models";

export const CITY_CATALOG: City[] = [
  {
    id: "paris",
    name: "Paris",
    country: "France",
    blurb:
      "River cruises, art walks, and hidden courtyards in the City of Light.",
    location: { lat: 48.8566, lon: 2.3522 },
    zoomHeight: 12000,
    users: [
      {
        id: "amelie",
        name: "Amélie Laurent",
        title: "Local Foodie Guide",
        location: { lat: 48.8606, lon: 2.3376 },
        landmarks: [
          {
            id: "louvre",
            name: "Louvre Courtyard",
            description: "Sunset meet-up point beside the Pyramid entrance.",
            location: { lat: 48.8611, lon: 2.3364 },
          },
          {
            id: "notre-dame",
            name: "Notre-Dame Viewpoint",
            description: "Panoramic photo spot on the Pont de l’Archevêché.",
            location: { lat: 48.8527, lon: 2.3506 },
          },
        ],
        routes: [
          {
            id: "sunset-cruise",
            name: "Seine Twilight Walk",
            description: "Riverside stroll with bakery and rooftop stops.",
            path: [
              { lat: 48.8583, lon: 2.2945, height: 50 },
              { lat: 48.8588, lon: 2.3003, height: 50 },
              { lat: 48.8594, lon: 2.3127, height: 50 },
              { lat: 48.8589, lon: 2.325, height: 50 },
              { lat: 48.858, lon: 2.339, height: 50 },
              { lat: 48.856, lon: 2.3505, height: 50 },
            ],
          },
        ],
      },
      {
        id: "marc",
        name: "Marc Dubois",
        title: "History Storyteller",
        location: { lat: 48.8738, lon: 2.295 },
        landmarks: [
          {
            id: "arc-de-triomphe",
            name: "Arc de Triomphe Terrace",
            description: "Start of Champs-Élysées heritage walk.",
            location: { lat: 48.8738, lon: 2.295 },
          },
          {
            id: "orsay",
            name: "Musée d’Orsay Steps",
            description: "Impressionist art storytime and café break.",
            location: { lat: 48.8599, lon: 2.3266 },
          },
        ],
        routes: [
          {
            id: "boulevard-loop",
            name: "Belle Époque Boulevard Loop",
            description: "Highlights from La Madeleine to the Left Bank.",
            path: [
              { lat: 48.8707, lon: 2.3223, height: 60 },
              { lat: 48.8672, lon: 2.3212, height: 60 },
              { lat: 48.8625, lon: 2.3287, height: 60 },
              { lat: 48.8617, lon: 2.3361, height: 60 },
              { lat: 48.8641, lon: 2.3415, height: 60 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "new-york",
    name: "New York City",
    country: "United States",
    blurb: "Skyline views, hidden speakeasies, and art-forward neighborhoods.",
    location: { lat: 40.7128, lon: -74.006 },
    zoomHeight: 18000,
    users: [
      {
        id: "jordan",
        name: "Jordan Lee",
        title: "Brooklyn Culture Curator",
        location: { lat: 40.7033, lon: -73.9903 },
        landmarks: [
          {
            id: "dumbo-pier",
            name: "DUMBO Pier 1",
            description:
              "Golden hour photo session under the Manhattan Bridge.",
            location: { lat: 40.7033, lon: -73.9967 },
          },
          {
            id: "brooklyn-museum",
            name: "Brooklyn Museum Plaza",
            description: "Afternoon art meetup with coffee tasting.",
            location: { lat: 40.6712, lon: -73.9636 },
          },
        ],
        routes: [
          {
            id: "brooklyn-bridge-ride",
            name: "Brooklyn Bridge Ride",
            description: "Cycling path from Brooklyn Heights into Manhattan.",
            path: [
              { lat: 40.7003, lon: -73.9964, height: 80 },
              { lat: 40.7057, lon: -73.9965, height: 80 },
              { lat: 40.709, lon: -73.9904, height: 80 },
              { lat: 40.7116, lon: -73.9819, height: 80 },
              { lat: 40.7128, lon: -73.9775, height: 80 },
            ],
          },
        ],
      },
      {
        id: "sophia",
        name: "Sophia Martinez",
        title: "Manhattan Experience Designer",
        location: { lat: 40.758, lon: -73.9855 },
        landmarks: [
          {
            id: "top-of-rock",
            name: "Top of the Rock",
            description: "Sunrise cityscape orientation session.",
            location: { lat: 40.759, lon: -73.979 },
          },
          {
            id: "chelsea-market",
            name: "Chelsea Market Entrance",
            description: "Gourmet tasting and local maker introductions.",
            location: { lat: 40.7423, lon: -74.006 },
          },
        ],
        routes: [
          {
            id: "high-line-walk",
            name: "High Line Discovery",
            description: "Elevated garden walk with gallery detours.",
            path: [
              { lat: 40.748, lon: -74.0048, height: 70 },
              { lat: 40.744, lon: -74.0069, height: 70 },
              { lat: 40.741, lon: -74.008, height: 70 },
              { lat: 40.7391, lon: -74.0037, height: 70 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    blurb: "Night tours, sushi staples, and calm escapes amid neon skylines.",
    location: { lat: 35.6762, lon: 139.6503 },
    zoomHeight: 16000,
    users: [
      {
        id: "haru",
        name: "Haru Nakamura",
        title: "Hidden Alley Specialist",
        location: { lat: 35.6895, lon: 139.6917 },
        landmarks: [
          {
            id: "shibuya-crossing",
            name: "Shibuya Crossing Deck",
            description: "Meet-up to capture the scramble from above.",
            location: { lat: 35.6595, lon: 139.7005 },
          },
          {
            id: "meiji-shrine",
            name: "Meiji Shrine Sando",
            description: "Forest pathway meditation walk.",
            location: { lat: 35.6764, lon: 139.6993 },
          },
        ],
        routes: [
          {
            id: "tokyo-night-trail",
            name: "Tokyo Night Trail",
            description: "Evening route through Shinjuku’s neon districts.",
            path: [
              { lat: 35.6994, lon: 139.7007, height: 80 },
              { lat: 35.6938, lon: 139.702, height: 80 },
              { lat: 35.6887, lon: 139.703, height: 80 },
              { lat: 35.685, lon: 139.7065, height: 80 },
            ],
          },
        ],
      },
      {
        id: "keiko",
        name: "Keiko Sato",
        title: "Wellness Retreat Planner",
        location: { lat: 35.7101, lon: 139.8107 },
        landmarks: [
          {
            id: "sensoji",
            name: "Sensō-ji Temple Plaza",
            description: "Morning cultural briefing and kimono fitting.",
            location: { lat: 35.7148, lon: 139.7967 },
          },
          {
            id: "sumida-park",
            name: "Sumida Riverside Park",
            description: "Cherry blossom picnic launchpoint.",
            location: { lat: 35.7106, lon: 139.8056 },
          },
        ],
        routes: [
          {
            id: "asakusa-river-circuit",
            name: "Asakusa River Circuit",
            description: "Relaxed cycling loop tracing the Sumida River.",
            path: [
              { lat: 35.7119, lon: 139.8025, height: 60 },
              { lat: 35.7086, lon: 139.8084, height: 60 },
              { lat: 35.7051, lon: 139.8081, height: 60 },
              { lat: 35.7078, lon: 139.7992, height: 60 },
            ],
          },
        ],
      },
    ],
  },
];

export const getCityByName = (query: string, catalog: City[] = CITY_CATALOG) => {
  const normalized = query.trim().toLowerCase();
  return catalog.find((city) => city.name.toLowerCase() === normalized);
};
