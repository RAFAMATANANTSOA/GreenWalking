// Initialiser la carte
var map = L.map('map').setView([45.75, 4.85], 13); // Coordonnées de Lyon

// Ajouter la couche de tuiles de base, OSM
var baseMaps=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ajouter une échelle à la carte
L.control.scale().addTo(map);  

//  Ajouter une barre de recherche à la carte
var searchControl = new L.esri.Controls.Geosearch().addTo(map);  
// Utilise le contrôle de recherche de la bibliothèque Esri (GéoRecherche) pour permettre la recherche d'adresses ou de lieux sur la carte

var results = new L.LayerGroup().addTo(map);  

// Écouter l'événement 'results' qui se déclenche quand la recherche renvoie des résultats
searchControl.on('results', function(data){
    results.clearLayers();  
    // Parcourir les résultats de la recherche et ajouter un marqueur pour chaque résultat
    for (var i = data.results.length - 1; i >= 0; i--) {
        // Ajouter un marqueur pour chaque résultat dans le groupe 'results'
        results.addLayer(L.marker(data.results[i].latlng));  // Chaque résultat contient une latitude et une longitude
    }
});


// Définir les couches de base et les couches superposées
var baseMaps = {
    "Fond de carte OSM": baseMaps
};
var overlayMaps = {};
// object JS qui va contenier chaque couche , pour la legende dynamique
const listLayers={}

// Définir les URLs des données GeoJSON, depuis Data Lyon
const fontaine_url = 'https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:eau.bornefontaine&SRSNAME=EPSG:4171&outputFormat=application/json&count=100&startIndex=0&sortBy=gid';
const randoneUrl = 'https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:evg_esp_veg.envpdiprclassement&SRSNAME=EPSG:4171&outputFormat=application/json';
const espaceVertUrl = 'https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:com_donnees_communales.comparcjardin_1_0_0&SRSNAME=EPSG:4171&outputFormat=application/json';

// Variables pour les couches
var randonneeLayer, espaceVertLayer, arbreWMSLayer;

// Initialiser le groupe de clusters
var markersCluster = L.markerClusterGroup();

// Gestion des couches
var layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);


// Charger la couche GeoJSON des fontaines (points)
fetch(fontaine_url)// recuperation des données depuis Data Lyon
    .then(response => response.json())
    .then(data => {
        // Créer les marqueurs et les ajouter au cluster
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                var marker = L.circleMarker(latlng, { radius: 10, color: "blue" });
                // Ajouter un popup avec les informations des fontaines
                var popupContent = `
                    <div class="popup-content">
                        <h4>Fontaine d'eau</h4>
                        <p><strong>id :</strong> ${feature.properties.identifiantbornefontaine}</p>
                        <p><strong>Année de pose :</strong> ${feature.properties.anneepose}</p>
                        <p><strong>Gestionnaire de données :</strong> ${feature.properties.gestionnairedonnee}</p>
                    </div>
                `;
                marker.bindPopup(popupContent); // une fonction qui va declencher le popup une fois on clique sur la couche

                // Créer un buffer de 300m lors du survol
                var buffer;
                marker.on('mouseover', function(e) {
                    marker.setStyle({
                        color: "red", 
                        fillColor: "red", 
                        fillOpacity: 0.7
                    });

                    // Récupérer la position du point
                    var latlng = e.latlng;
                    // Créer un cercle buffer de 300m autour du point
                    buffer = L.circle(latlng, {
                        radius: 300,
                        color: "red",
                        weight: 2,
                        fillOpacity: 0.2
                    }).addTo(map);
                });

                // Retirer le buffer lorsqu'on quitte le survol
                marker.on('mouseout', function() {
                    // restourer le style
                    marker.setStyle({
                        color: "blue", 
                        fillColor: "blue", 
                        fillOpacity: 0.5 
                    });

                    if (buffer) {
                        map.removeLayer(buffer);
                    }
                });

                return marker;
            }
        }).addTo(markersCluster);  // Ajouter les marqueurs au cluster

        // Ajouter le cluster au map
        markersCluster.addTo(map);

        // Ajouter la couche au contrôle des couches
        layerControl.addOverlay(markersCluster, "Fontaine d'eau");
        // ajouter les fontaines dans la liste des couches
        listLayers['fontaines']=markersCluster;

    
    })
    .catch(error => {// si le fetching n'a psa reussi 
        console.log("Erreur de chargement des données GeoJSON des fontaines :", error);
    });



// Charger la couche GeoJSON des randonnées (lignes)
fetch(randoneUrl)
.then(response => response.json())
.then(data => {
    // creation de la couche rendonnée
    randonneeLayer = L.geoJSON(data, {
        style: function (feature) {
            return { color: "orange", weight: 3 }; // styles de la couche
        },
        onEachFeature: function (feature, layer) {
            // Ajouter un popup avec les informations des randonnées
            var popupContent = `
                <div class="popup-content">
                    <h4>Randonnée</h4>
                    <p><strong>Classe :</strong> ${feature.properties.classementchemin}</p>
                    <p><strong>Réseau primaire :</strong> ${feature.properties.reseauprimaire}</p>
                    <p><strong>Année de Libération :</strong> ${feature.properties.anneedeliberation}</p>
                    <p><strong>Longueur :</strong> ${feature.properties.longueur} m</p>
                </div>
            `;
            layer.bindPopup(popupContent);// une fonction qui va declencher le popup une fois on clique sur la couche
        }
    }).addTo(map);
    // Ajouter la couche au contrôle des couches
    layerControl.addOverlay(randonneeLayer, "Randonnée");
    // ajouter les randonnées  dans la liste des couches
    listLayers['randonnee']=randonneeLayer;
})
.catch(error => {// si le fetching n'a psa reussi 
    console.log("Erreur de chargement des données GeoJSON des randonnées :", error);
});;


// Charger la couche GeoJSON des espaces verts (polygones)
fetch(espaceVertUrl)
    .then(response => response.json())
    .then(data => {
        // creation et ajout de la couche au map
        espaceVertLayer = L.geoJSON(data, {
            style: function (feature) {
                return { color: "green", fillOpacity: 0.3 };// style de la couche polygon
            },
            onEachFeature: function (feature, layer) {
                // Ajouter un popup avec les informations des espaces verts
                var popupContent = `
                    <div class="popup-content">
                        <h4>Espaces Verts</h4>
                        <h4><strong>Voie :</strong> ${feature.properties.voie}</h4>
                        <p><strong>Code Postal :</strong> ${feature.properties.codepost}</p>
                        <p><strong>Commune :</strong> ${feature.properties.commune}</p>
                        <p><strong>Superficie Totale :</strong> ${feature.properties.surf_tot_m2} m²</p>
                    </div>
                `;
                layer.bindPopup(popupContent);// une fonction qui va declencher le popup une fois on clique sur la couche
            }
        }).addTo(map);
        // Ajouter la couche au contrôle des couches
        layerControl.addOverlay(espaceVertLayer, "Espace Vert");
        // ajouter les espaces verts dans la liste des couches
        listLayers['espaces-verts']=espaceVertLayer;
    });


// Ajouter la couche WMS pour les arbres, j ai choisi de le charger en WMS , car c'est trop lourd
var arbreWMS = L.tileLayer.wms('https://data.grandlyon.com/geoserver/metropole-de-lyon/ows', {
    // Définir le nom de la couche WMS spécifique à afficher
    layers: 'metropole-de-lyon:abr_arbres_alignement.abrarbre',
    // Spécifier le format d'image pour le rendu (ici en PNG)
    format: 'image/png',
    // Activer la transparence pour permettre de superposer la couche sur d'autres
    transparent: true,
    // Version du service WMS (1.3.0 ici)
    version: '1.3.0',
    // Définir le système de coordonnées de la carte (EPSG:4171 pour la projection spécifique à Lyon)
    crs: L.CRS.EPSG4171,
    // Limites géographiques de la carte (la zone couverte par la couche WMS)
    bounds: [[45.5677, 4.6971], [45.9383, 5.0598]],  // Coordonnées de la zone de Lyon
    // Largeur et hauteur de l'image générée par WMS
    width: 700,
    height: 715
}).addTo(map); // Ajouter cette couche WMS à la carte


// Ajouter la couche WMS des arbres au contrôle des couches
layerControl.addOverlay(arbreWMS, "Arbre");  // Ajouter la couche "Arbres" au contrôle des couches

// Ajouter la couche des arbres au tableau listLayers avec le nom de la couche
listLayers['arbres'] = arbreWMS; 

// Pour le layer switcher , ajout et de suppression de couches
map.on('overlayadd overlayremove', function (e) {
    Object.entries(listLayers).forEach(([layerName, layer]) => {
        // Mettre à jour la légende pour chaque couche
        UpdateLegend(layerName, map.hasLayer(layer));  
    });
});

// Fonction pour mettre à jour la visibilité de la légende d'une couche
function UpdateLegend(layerName, isVisible){
    // Récupérer l'élément de légende correspondant au nom de la couche
    const legendDiv = document.getElementById(layerName);
    
    // Si la couche est visible, afficher la légende
    if(isVisible){
        legendDiv.style.display = 'block';  // Afficher la légende
    } else {
        legendDiv.style.display = 'none';  // Cacher la légende
    }
}


// Données sur les temperatures à chaque endroit

// creation du canva du graphe
let temperatureChart;

function createTemperatureChart(dates, temperatures) {

    const canvas = document.getElementById("temperatureChart");

    if (temperatureChart) {
        temperatureChart.destroy();
    }
    // Configuration du graphique
    const ctx = canvas.getContext("2d");
    temperatureChart= new Chart(ctx, {
        type: 'line', 
        data: {
            labels: dates, 
            datasets: [{
                label: 'Température (°C)',
                data: temperatures, 
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                tension: 0.4, 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Dates'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                        maxRotation: 75,
                        minRotation: 75
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Température (°C)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
        
    });
};

// A chaque click sur le map, 
map.on('click', function(e){
    const lon =e.latlng['lng'];
    const lat=e.latlng['lat'];
    // Recuperer les données sur les temperatures depuis OpenMeteo
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=GMT`)
    .then(response=>response.json())
    .then(data => {
        // recuperer uniquement les timelapse et les données sur les temperatures 
        const times = data.hourly.time;
        const temperatures = data.hourly.temperature_2m;
        // Appeller la fonction pour creéer le graphique
        createTemperatureChart(times, temperatures);
    })

});