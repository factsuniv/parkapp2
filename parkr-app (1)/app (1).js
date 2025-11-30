// App State
const state = {
    isLoggedIn: false,
    currentLocation: 'downtown', // 'downtown' or 'plano'
    selectedSpot: null,
    bookingStep: 'idle' // 'idle', 'selected', 'route', 'exchange'
};

// Mock Data
const LOCATIONS = {
    downtown: {
        center: [32.7767, -96.7970], // Downtown Dallas
        zoom: 15,
        spots: [
            { id: 1, lat: 32.7765, lng: -96.7960, price: 12, parker: 'Sarah', car: 'Blue Toyota Camry', rating: 4.9 },
            { id: 2, lat: 32.7780, lng: -96.7990, price: 10, parker: 'Mike', car: 'Silver Honda Civic', rating: 4.7 },
            { id: 3, lat: 32.7750, lng: -96.7950, price: 15, parker: 'Jessica', car: 'Black Ford Focus', rating: 5.0 }
        ]
    },
    plano: {
        center: [33.0800, -96.8200], // Legacy West Plano
        zoom: 15,
        spots: [
            { id: 4, lat: 33.0810, lng: -96.8210, price: 8, parker: 'David', car: 'Red Mazda 3', rating: 4.8 },
            { id: 5, lat: 33.0790, lng: -96.8190, price: 9, parker: 'Emily', car: 'White Kia Soul', rating: 4.6 }
        ]
    },
    legacy_west: {
        center: [33.0820, -96.8250], // Legacy West Proper
        zoom: 16,
        spots: [
            { id: 6, lat: 33.0825, lng: -96.8245, price: 15, parker: 'Alex', car: 'Tesla Model 3', rating: 5.0 },
            { id: 7, lat: 33.0815, lng: -96.8255, price: 14, parker: 'Jordan', car: 'BMW X5', rating: 4.8 },
            { id: 8, lat: 33.0830, lng: -96.8240, price: 12, parker: 'Casey', car: 'Audi A4', rating: 4.7 }
        ]
    }
};

// DOM Elements
const screens = {
    login: document.getElementById('login-screen'),
    main: document.getElementById('main-screen')
};

const bottomSheet = {
    container: document.getElementById('bottom-sheet'),
    states: {
        idle: document.getElementById('state-idle'),
        selected: document.getElementById('state-selected'),
        route: document.getElementById('state-route'),
        exchange: document.getElementById('state-exchange')
    }
};

let map = null;
let markers = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initMap();
    initToggles();
    initSearch();
});

// Login Logic
function initLogin() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', () => {
        // Simulate API call
        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        setTimeout(() => {
            state.isLoggedIn = true;
            screens.login.classList.remove('active');
            screens.main.classList.add('active');

            // Resize map after transition
            setTimeout(() => {
                map.invalidateSize();
            }, 500);
        }, 1000);
    });
}

// Map Logic
function initMap() {
    // Default to Downtown Dallas
    const initialLoc = LOCATIONS.downtown;

    map = L.map('map', {
        zoomControl: false, // Hide default zoom controls for cleaner UI
        attributionControl: false
    }).setView(initialLoc.center, initialLoc.zoom);

    // Add CartoDB Voyager tile layer (clean, Apple Maps-like look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    renderSpots('downtown');
}

function renderSpots(locationKey) {
    const locData = LOCATIONS[locationKey];

    // Pan to new location
    map.flyTo(locData.center, locData.zoom, {
        duration: 1.5
    });

    // Render markers and sidebar
    updateMarkers(locData.spots);
    renderSidebar(locData.spots);
}

function updateMarkers(spots) {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Add markers
    spots.forEach(spot => {
        const icon = L.divIcon({
            className: 'custom-marker-icon',
            html: '<div class="marker-pin"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: icon })
            .addTo(map)
            .on('click', () => selectSpot(spot));

        markers.push(marker);
    });
}

function renderSidebar(spots) {
    const listContainer = document.getElementById('spots-list');
    if (!listContainer) return;

    listContainer.innerHTML = spots.map(spot => `
        <div class="spot-card" onclick="selectSpotById(${spot.id})">
            <div class="spot-card-header">
                <div class="spot-card-price">$${spot.price.toFixed(2)}</div>
                <div class="spot-card-rating">
                    <i class="fa-solid fa-star"></i> ${spot.rating}
                </div>
            </div>
            <div class="spot-card-details">
                <img src="https://ui-avatars.com/api/?name=${spot.parker}&background=random" alt="${spot.parker}">
                <div class="spot-card-info">
                    <p>${spot.parker}</p>
                    <span>${spot.car}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper to select spot from sidebar
window.selectSpotById = (id) => {
    const locData = LOCATIONS[state.currentLocation];
    const spot = locData.spots.find(s => s.id === id);
    if (spot) selectSpot(spot);
};

function initSearch() {
    const mobileInput = document.getElementById('mobile-search-input');
    const desktopInput = document.getElementById('desktop-search-input');

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        // Sync inputs
        if (mobileInput && e.target !== mobileInput) mobileInput.value = query;
        if (desktopInput && e.target !== desktopInput) desktopInput.value = query;

        filterSpots(query);
    };

    if (mobileInput) mobileInput.addEventListener('input', handleSearch);
    if (desktopInput) desktopInput.addEventListener('input', handleSearch);
}

function filterSpots(query) {
    const locData = LOCATIONS[state.currentLocation];
    if (!locData) return;

    const filtered = locData.spots.filter(spot =>
        spot.parker.toLowerCase().includes(query) ||
        spot.car.toLowerCase().includes(query) ||
        spot.price.toString().includes(query)
    );

    updateMarkers(filtered);
    renderSidebar(filtered);
}

// Location Toggles
function initToggles() {
    const toggles = document.querySelectorAll('.toggle-chip');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Update UI
            toggles.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // Update Map
            const loc = e.target.dataset.loc;
            state.currentLocation = loc;

            let locText = 'Downtown Dallas';
            if (loc === 'plano') locText = 'Legacy Plano';
            if (loc === 'legacy_west') locText = 'Legacy West';

            document.getElementById('current-location-text').textContent = locText;

            renderSpots(loc);

            // Reset Booking State
            resetBottomSheet();
        });
    });
}

// Booking Flow
function selectSpot(spot) {
    state.selectedSpot = spot;
    state.bookingStep = 'selected';

    // Update UI with spot details
    const selectedView = bottomSheet.states.selected;
    selectedView.querySelector('.spot-price').textContent = `$${spot.price.toFixed(2)}`;
    selectedView.querySelector('.rating').innerHTML = `<i class="fa-solid fa-star"></i> ${spot.rating} (Parker: ${spot.parker})`;
    selectedView.querySelector('.parker-details p').textContent = `${spot.parker} is holding this spot.`;
    selectedView.querySelector('.car-info').textContent = `${spot.car}`;

    showSheetState('selected');
}

function showSheetState(stateName) {
    // Hide all states
    Object.values(bottomSheet.states).forEach(el => el.classList.remove('active'));

    // Show target state
    bottomSheet.states[stateName].classList.add('active');
}

function resetBottomSheet() {
    state.selectedSpot = null;
    state.bookingStep = 'idle';
    showSheetState('idle');
}

// Event Listeners for Booking Actions
document.getElementById('reserve-btn').addEventListener('click', () => {
    state.bookingStep = 'route';
    showSheetState('route');

    // Simulate Progress Bar
    const progressBar = document.querySelector('.progress-fill');
    progressBar.style.width = '0%';

    setTimeout(() => {
        progressBar.style.width = '100%';
    }, 100); // Start animation
});

document.getElementById('arrived-btn').addEventListener('click', () => {
    state.bookingStep = 'exchange';
    showSheetState('exchange');
});

document.getElementById('complete-btn').addEventListener('click', () => {
    alert('Exchange Confirmed! Payment processed.');
    resetBottomSheet();
});
