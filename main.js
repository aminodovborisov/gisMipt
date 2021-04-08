let infoPanel = document.getElementById('info');
console.log(infoPanel);

// infoPanel.innerHTML = 'Здравствуйте! Рисуйте, правьте, показывайте, удаляйте.';

let justSelect = false;  // Отличаем селект при рисовании от собственно пользовательского селекта

let goOnAnimation = false;  // Прекращаем анимацию, если false

let idGen = 0;  // Глобальная переменная - счётчик лайнстрингов

let raster = new ol.layer.Tile({
    source: new ol.source.OSM(),
});

let source = new ol.source.Vector();


let vector = new ol.layer.Vector({
    source: source
});

let sourcePoint = new ol.source.Vector();

let vectorPoint = new ol.layer.Vector({
	source: sourcePoint
});

let startPointFill = new ol.style.Fill({
	color: '#ffffff'
});

let startPointStroke = new ol.style.Stroke({
	color: '#ff0000',
	width: 1.25
});

let startPointStyle = new ol.style.Style({
    image: new ol.style.Circle({
		fill: startPointFill,
		stroke: startPointStroke,
		radius: 5
    })
});

let lineStringStyle = new ol.style.Style({
	stroke: new ol.style.Stroke({
		color: "#ff0000",
		width: 1.3
	})
});

let vertexPointStyle = new ol.style.Style({
	image: new ol.style.Circle({
		fill: startPointFill,
		stroke: startPointStroke,
		radius: 3
	})
});

let map = new ol.Map({
    layers: [
		raster, 
		vector,
		vectorPoint
	],
    target: 'map',
    view: new ol.View({
        center: [4242003.539015969, 7480088.823880755],
        zoom: 15,
    }),
});

let draw = new ol.interaction.Draw({
    source: source,
    type: 'LineString'
});


let modify = new ol.interaction.Modify({
    source: source,
	deleteCondition: ol.events.condition.doubleClick
});

let selectClick = new ol.interaction.Select({
    hitTolerance: 5
});

let selectToDelete = new ol.interaction.Select({
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

selectToDelete.on(
    'select',
    function (e) {
        let eFeature = e.target.getFeatures().getArray()[0];  // Взяли фичу и ставим вопрос об удалении
        if (confirm('Удалить этот объект?')) {
            let pointToDeleteId = eFeature.getId() + 'start';
			source.removeFeature(eFeature);
			sourcePoint.removeFeature(sourcePoint.getFeatureById(pointToDeleteId));
        }
    }
)



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
                    // document.removeEventListener('keyup');  // Больше не слушаем нажатие Эскейпа.
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
                // document.removeEventListener('contextmenu');  // Больше не слушаем нажатие Эскейпа.
            }
        )
    }
)



// По просьбе Алексея, включаем режим редактирования траекторий
// после окончания рисования.
draw.on(
    'drawend',
    function (e) {
        // TODO: Сделать так, чтобы вместо основного лайнстринга отображался turf.bezierSpline,
        // построенный на основе этого лайнстринга. Кроме того, должны отображаться контрольные точки,
        // то есть вершины этого сплайна.
        map.addInteraction(modify);
        map.removeInteraction(draw);
        map.removeInteraction(selectClick);
		map.removeInteraction(selectToDelete);
		
		// Теперь на стартовой точке нарисованной траектории поставим анимируемый объект.
		// Но анимировать не будем, пока траектория не будет выбрана.
		let eFeature = e.feature;
		eFeature.setStyle(lineStringStyle);
		eFeature.setId('LineString' + idGen);
		let startPoint = new ol.Feature({
			geometry: new ol.geom.Point(eFeature.getGeometry().getCoordinates()[0])
		});
		startPoint.setId(eFeature.getId() + 'start');
		startPoint.setStyle(startPointStyle);
		sourcePoint.addFeature(startPoint);
		console.log(eFeature.getId() + ' ' + startPoint.getId());
		idGen++;  // Инкремент глобальной переменной для следующего объекта
		
		let efCoordinates = eFeature.getGeometry().getCoordinates();
		for (let i = 1; i < efCoordinates.length; i++) {
			let vertexPoint = new ol.Feature({
				geometry: new ol.geom.Point(efCoordinates[i])
			});
			vertexPoint.setId(eFeature.getId() + 'vertex' + i);
			vertexPoint.setStyle(vertexPointStyle);
			sourcePoint.addFeature(vertexPoint);
		}
    }
);

// Если изменена геометрия линии, то нужно удалить соответствующие ей точки
// и поставить заново.
modify.on(
	'modifyend', 
	function (e) {
		let eFeature = e.features.getArray()[0];
		console.log(eFeature.getId());
		sourcePoint.removeFeature(sourcePoint.getFeatureById(eFeature.getId() + 'start'));
		for (let i = 1; i < eFeature.getGeometry().getCoordinates().length + 1; i++) {
			try {
				sourcePoint.removeFeature(sourcePoint.getFeatureById(eFeature.getId() + 'vertex' + i));
			} catch {}
		}
		let startPoint = new ol.Feature({
			geometry: new ol.geom.Point(eFeature.getGeometry().getCoordinates()[0])
		});
		startPoint.setId(eFeature.getId() + 'start');
		startPoint.setStyle(startPointStyle);
		sourcePoint.addFeature(startPoint);
		let efCoordinates = eFeature.getGeometry().getCoordinates();
		for (let i = 1; i < efCoordinates.length; i++) {
			let vertexPoint = new ol.Feature({
				geometry: new ol.geom.Point(efCoordinates[i])
			});
			vertexPoint.setId(eFeature.getId() + 'vertex' + i);
			vertexPoint.setStyle(vertexPointStyle);
			sourcePoint.addFeature(vertexPoint);
		}
		
	}
);

let deleteByDbClick = false;  // Глобальная переменная - включен ли режим удаления вершины по двойному щелчку

function drawObject() {
    map.removeInteraction(modify);
    map.addInteraction(draw);
    map.removeInteraction(selectClick);
}

function modifyObject() {
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
function deleteObject() {
    map.removeInteraction(draw);
    map.removeInteraction(modify);
    map.removeInteraction(selectClick);
    map.addInteraction(selectToDelete);
}
