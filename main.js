var justSelect = false;  // Отличаем селект при рисовании от собственно пользовательского селекта

let goOnAnimation = false;  // Прекращаем анимацию, если false



var raster = new ol.layer.Tile({
    source: new ol.source.OSM(),
});

var source = new ol.source.Vector();

let animaStyle = function (feature) {
    
}

var vector = new ol.layer.Vector({
    source: source
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
    type: 'LineString'
});

var modify = new ol.interaction.Modify({
    source: source
});

let selectClick = new ol.interaction.Select({
    hitTolerance: 5
});



selectClick.on(
    'select',
    function (e) {
        let eFeatures = e.target.getFeatures();
        if (eFeatures.getLength() > 0) {
            let pathAnim = eFeatures.getArray()[0];  // Предусмотрено выделение только одного объекта. Стало быть, можем спокойно брать нулевой элемент массива.

            /* TODO: здесь реализовать анимацию вдоль полученной линии.
               Пожалуй, здесь стоит использовать не готовый алгоритм анимации (мне он кажется избыточным),
               а написать свой примерно по следующей схеме:
               1. С помощью библиотеки turf.js разделить линию на участки, каждый длиной метров по 100,
               2. Загнать полученные координаты в массив,
               3. Пробежаться по этому циклу, на каждом шаге назначать координаты точке, которую анимируем.
               4. В принципе, зная координаты следующей точки, можно запросто задавать угол поворота. Тогда можно будет
                  анимировать не простой квадратик или кружочек, а, например, значок самолётика или ракеты.
             */

            // Собственно, это задел под работу с Турфом. Во-первых, нужно получить больше точек, в которые будет вставать маркер.
            // (для этого и будем использовать Турф, там есть нужная функция lineChunk),
            // во-вторых, уменьшим интервал. Не секунда, а десятая часть секунды или типа того.

            // let prePathAnim = eFeatures.getArray()[0];
            // let turfPrePathAnim = turf.lineString(prePathAnim.getGeometry().getCoordinates());
            // let 
            
            // Пока же РЕАЛИЗОВАНА анимация точки, которая появляется поочерёдно в каждой вершине ломаной линии.
            
           
            let aniCoords = pathAnim.getGeometry().getCoordinates();

            let i = 0;

            let aniPoint = new ol.Feature({
                geometry: new ol.geom.Point()
            });
            source.addFeature(aniPoint);

            function myLoop() {
                setTimeout(
                    function () {
                        if (i === aniCoords.length) {
                            i = 0;        
                        }
                        aniPoint.getGeometry().setCoordinates(aniCoords[i]);
                        i++;
                        if (i <= aniCoords.length) {
                            myLoop();        
                        }
                    },
                    1000
                )
            }

            myLoop();
        }
    }
);


/*
map.on(
    'click',
    function (e) {
        console.log(e.coordinate);
    }
);
*/

function startDraw() {
    map.removeInteraction(modify);
    map.addInteraction(draw);
    map.removeInteraction(selectClick);
}

function modifyDraw() {
    map.addInteraction(modify);
    map.removeInteraction(draw);
    map.removeInteraction(selectClick);
}


function onSelect() {
    map.addInteraction(selectClick);
    map.removeInteraction(draw);
    map.removeInteraction(modify);
}

function onStop() {
    map.removeInteraction(selectClick);
    map.removeInteraction(draw);
    map.removeInteraction(modify);
}
