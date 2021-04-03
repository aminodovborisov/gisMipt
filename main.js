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

function sectMultiLine(coordinates) {
    let turfString = turf.bezierSpline(turf.toWgs84(turf.lineString(coordinates)));
    let turfChunk = turf.toMercator(turf.lineChunk(turfString, 0.05));  // Получаем FeatureCollection
    let arrayOfLines = turfChunk.features;
    let result = [];
    let startPoint = arrayOfLines[0]['geometry']['coordinates'][0];  // Берём первую точку первого лайнстринга
    result.push(startPoint);
    for (let i = 0; i < arrayOfLines.length; i++) {
        result.push(arrayOfLines[i]['geometry']['coordinates'][1]);
    }
    return result;
}

selectClick.on(
    'select',
    function (e) {
        let eFeatures = e.target.getFeatures();
        if (eFeatures.getLength() > 0) {
            let pathAnim = eFeatures.getArray()[0];  // Предусмотрено выделение только одного объекта. Стало быть, можем спокойно брать нулевой элемент массива.

            // Далее реализована анимация одной линии.
            let prePathAnim = eFeatures.getArray()[0];
            let sectedCoordinates = sectMultiLine(prePathAnim.getGeometry().getCoordinates());
            console.log(JSON.stringify(sectedCoordinates));
            
           
            let aniCoords = pathAnim.getGeometry().getCoordinates();

            let i = 0;

            let aniPoint = new ol.Feature({
                geometry: new ol.geom.Point(aniCoords[0])
            });
            source.addFeature(aniPoint);
            aniPoint.setId('aniPoint');

            function myLoop() {
                setTimeout(
                    function () {
                        if (i === sectedCoordinates.length) {
                            i = 0;        
                        }
                        aniPoint.getGeometry().setCoordinates(sectedCoordinates[i]);
                        i++;
                        if (i <= sectedCoordinates.length) {
                            myLoop();        
                        }
                    },
                    50
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

// TODO: добавить слушатель события "двойной клик". Если event.target окажется лайнстрингом, то пробежимся по
// координатам вершин и найдём ту, чьи координаты ближе всего к координатам щелчка. Вернее, даже не просто ближе,
// а подходят под hitTolerance. И эту точку удаляем.

draw.on(
    'drawstart',
    function (e) {
        document.addEventListener(
            'keyup',
            function () {
                // alert(event.keyCode);
                if (event.keyCode === 27) {
                    draw.removeLastPoint();
                    draw.finishDrawing();
                    document.removeEventListener('keyup');  // Больше не слушаем нажатие Эскейпа.
                } else {
                    if (event.keyCode === 8) {
                        draw.removeLastPoint();
                    }
                }
            }
        )
        document.addEventListener(
            'contextmenu',
            function () {
                draw.removeLastPoint();
                draw.finishDrawing();
                document.removeEventListener('contextmenu');  // Больше не слушаем нажатие Эскейпа.
            }
        )
    }
)

// По просьбе Алексея, включаем режим редактирования траекторий
// после окончания рисования.
draw.on(
    'drawend',
    function () {
        // TODO: Сделать так, чтобы вместо основного лайнстринга отображался turf.bezierSpline,
        // построенный на основе этого лайнстринга. Кроме того, должны отображаться контрольные точки,
        // то есть вершины этого сплайна.
        map.addInteraction(modify);
        map.removeInteraction(draw);
        map.removeInteraction(selectClick);
    }
);

function startDraw() {
    map.removeInteraction(modify);
    map.addInteraction(draw);
    map.removeInteraction(selectClick);
}

function modifyDraw() {
    // TODO: в случае modifyend (или как там называется это событие) должен отображаться, опять же, не лайнстринг,
    // а сплайн.
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
    // Перво-наперво снимаем выделение.
    selectClick.getFeatures().clear();
    map.removeInteraction(selectClick);
    map.removeInteraction(draw);
    map.removeInteraction(modify);

    // Теперь удаляем анимированный объект.
    try {
        let featureToDelete = source.getFeatureById('aniPoint');
        source.removeFeature(featureToDelete);
    } catch {
        // А тут мы просто ничего не делаем.
    }
    
}

// TODO: добавить инструмент удаления траектории. По сути, нужно включить 
// интерекшн selectClick, но с дополнительной опцией, типа toDelete = true / false.
