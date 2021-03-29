var raster = new ol.layer.Tile({
    source: new ol.source.OSM(),
});

var source = new ol.source.Vector();

var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        })
    })
});

var map = new ol.Map({
    layers: [raster, vector],
    target: 'map',
    view: new ol.View({
        center: [4242003.539015969, 7480088.823880755],
        zoom: 15,
    }),
});

var draw = new ol.interaction.Draw({
    source: source,
    type: 'LineString',
});

var modify = new ol.interaction.Modify({
    source: source
});

map.on(
    'click',
    function (e) {
        console.log(e.coordinate);
    }
);

function startDraw() {
    map.removeInteraction(modify);
    map.addInteraction(draw);
    map.removeInteraction(erase);
}

function modifyDraw() {
    map.addInteraction(modify);
    map.removeInteraction(draw);
    map.removeInteraction(erase);
}

