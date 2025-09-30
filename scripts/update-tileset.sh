MAPBOX_TOKEN=$(grep 'MAPBOX_ACCESS_TOKEN' .env | cut -d'=' -f2 | tr -d '"')

tilesets upload-source chriswhongmapbox combined ./data/nyc-public-space.ndjson --replace --token $MAPBOX_TOKEN &&

tilesets publish chriswhongmapbox.public-space-tiles --token $MAPBOX_TOKEN