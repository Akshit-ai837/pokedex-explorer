# pokedex-explorer
An interactive web application to explore, search, filter, and sort Pokémon
using live data from the PokéAPI.

## 🌐 API Used

**[PokéAPI](https://pokeapi.co/)** — A free, open RESTful Pokémon API.
- Base URL: `https://pokeapi.co/api/v2/`
- No authentication or API key required
- Returns data in JSON format

## 🎯 Purpose

Pokédex Explorer is a frontend web application built as part of a JavaScript
project. The goal is to fetch and display real Pokémon data from a public API
and allow users to interact with it through search, filters, sorting, and
favourites — all built using core JavaScript concepts like fetch, array HOFs,
and localStorage.

## ✨ Features

### Core Features
- Browse Pokémon displayed as cards with name, image, type, and stats
- Search Pokémon by name
- Filter Pokémon by type (Fire, Water, Grass, Electric, etc.)
- Sort Pokémon by name (A–Z / Z–A) or by ID (ascending / descending)

### Interactive Features
- Mark Pokémon as favourite using a heart button
- Favourites are saved and persist using localStorage
- Dark / Light mode toggle with preference saved to localStorage

### Performance & UX
- Debouncing on the search bar (400ms delay)
- Loading spinner displayed during API calls
- Pagination to browse Pokémon in batches of 20
- Fully responsive design across mobile, tablet, and desktop

---

## 🛠️ Technologies Used

| Technology      | Purpose                                      |
|-----------------|----------------------------------------------|
| HTML            | Page structure and layout                    |
| CSS             | Styling, responsiveness, dark/light mode     |
| JavaScript ES6+ | Logic, API calls, interactivity              |
| Fetch API       | Fetching data from PokéAPI                   |
| Array HOFs      | filter(), sort(), map(), find() for features |
| localStorage    | Persisting favourites and theme preference   |


## 📁 Project Structure

pokedex-explorer/
├── index.html       → Main HTML structure and layout
├── style.css        → Styling, responsive design, theme variables
└── script.js        → API calls, HOFs, search, filter, sort, favourites


## 🚀 How to Run Locally

1. Clone this repository:

   git clone https://github.com/Akshit-ai837/pokedex-explorer.git

2. Open the project folder:

   cd pokedex-explorer

3. Open `index.html` in your browser

> No installation, build tools, or dependencies required.



## 📅 Project Milestones

| Milestone | Description                          | Deadline   |
|-----------|--------------------------------------|------------|
| 1         | Project setup and README             | 23rd March |
| 2         | API integration and responsive UI    | 1st April  |
| 3         | Search, filter, sort, interactions   | 8th April  |
| 4         | Deployment and final documentation   | 10th April |



## 🌍 Deployment

The project will be deployed using **GitHub Pages** after Milestone 4.
Live link will be added here once deployed.



## 👤 Author

**Akshit**
- GitHub: [@Akshit-ai837](https://github.com/Akshit-ai837)