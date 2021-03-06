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

let sourceTrac = new ol.source.Vector();

let vectorTrac = new ol.layer.Vector({
	source: sourceTrac
});

let sourceAnim = new ol.source.Vector();

let vectorAnim = new ol.layer.Vector({
	source: sourceAnim
}) 

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
		width: 0.3,
		lineDash: [4, 3]
	})
});




let traectoryStyle = new ol.style.Style({
	stroke: new ol.style.Stroke({
		color: "#ff0000",
		width: 2
	})
});

let vertexPointStyle = new ol.style.Style({
	image: new ol.style.Circle({
		fill: startPointFill,
		stroke: startPointStroke,
		radius: 3
	})
});

let iconImage = new ol.style.Icon({
		anchor: [0.5, 0.5],
		anchorXUnits: 'fraction',
		anchorYUnits: 'fraction',
		src: 'img/plane.png',
		scale: [0.35, 0.35]
	})

var iconStyle = new ol.style.Style({
	image: iconImage
});

let map = new ol.Map({
    layers: [
		raster, 
		vector,
		vectorTrac,
		vectorPoint,
		vectorAnim
	],
    target: 'map',
    view: new ol.View({
        center: [4242003.539015969, 7480088.823880755],
        zoom: 15,
    }),
});

let coords_length;

let draw = new ol.interaction.Draw({
    source: source,
    type: 'LineString',
	geometryFunction: function(coords, geom) {
    if (!geom) geom = new ol.geom.LineString([]);
    geom.setCoordinates(coords);
	let pointId = 0;
    //if linestring changed
    if (coords.length !== coords_length){
		coords_length = coords.length;
		console.log(coords.join('<br>'));
		let feaDrawPoint = new ol.Feature({
			geometry: new ol.geom.Point(coords[coords.length - 1])
		});
		feaDrawPoint.setStyle(vertexPointStyle);
		feaDrawPoint.setId('drawpoint' + pointId);
		console.log('drawpoint' + pointId);
		pointId++;
		sourcePoint.addFeature(feaDrawPoint);
    }
    return geom;
  }
	// style: [lineStringStyle, vertexPointStyle]
});




let modify = new ol.interaction.Modify({
    source: source,
	deleteCondition: ol.events.condition.doubleClick
});

let selectWhileDraw = new ol.interaction.Select({
	layers: [vector]
});

let selectClick = new ol.interaction.Select({
    hitTolerance: 5,
	layers: [vector, vectorTrac]
});

let selectToDelete = new ol.interaction.Select({
    hitTolerance: 5,
	layers: [vector]
});

function sectMultiLine(coordinates, isBezier) {
    let turfString = turf.bezierSpline(turf.toWgs84(turf.lineString(coordinates)));
    if (!isBezier) {
		turfString = turf.bezierSpline(turf.toWgs84(turf.lineString(coordinates)));
	} else {
		turfString = turf.toWgs84(turf.lineString(coordinates));
	}
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

function lineBezier(coordinates) {
	let turfString = turf.bezierSpline(turf.toWgs84(turf.lineString(coordinates)));
	return turf.toMercator(turfString)['geometry']['coordinates'];
}

selectToDelete.on(
    'select',
    function (e) {
        let eFeature = e.target.getFeatures().getArray()[0];  // Взяли фичу и ставим вопрос об удалении
        if (confirm('Удалить этот объект?')) {
            let pointToDeleteId = eFeature.getId() + 'start';
			console.log('Vertices ' + eFeature.getGeometry().getCoordinates().length);
			for (let i = 1; i < eFeature.getGeometry().getCoordinates().length; i++) {
				try {
					console.log(eFeature.getId() + 'vertex' + i)
					sourcePoint.removeFeature(sourcePoint.getFeatureById(eFeature.getId() + 'vertex' + i));
				} catch {}
			}
			sourcePoint.removeFeature(sourcePoint.getFeatureById(pointToDeleteId));
			source.removeFeature(eFeature);
			sourceTrac.removeFeature(sourceTrac.getFeatureById(eFeature.getId() + 'trac'));
			try {
				// При наличии объекта анимации в соответствующем источнике мы его удаляем.
				// А если его там нет, мы просто провалимся в исключения, а там ничего делать не надо.
				// Нет объекта - ну и нет.
				sourceAnim.removeFeature(sourceAnim.getFeatureById(eFeature.getId() + 'anim'));
			} catch {}
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

			selectClick.getFeatures().remove(pathAnim);
			let sectedCoordinates = sectMultiLine(pathAnim.getGeometry().getCoordinates(), pathAnim.getId().includes('trac'));
			

            console.log(JSON.stringify(sectedCoordinates));
            
           
            let aniCoords = pathAnim.getGeometry().getCoordinates();
			console.log(pathAnim.getId().replace('trac', '') + 'anim need');
			let aniPoint = sourceAnim.getFeatureById(pathAnim.getId().replace('trac', '') + 'anim');
			
            let i = 0;
		
			function myLoop() {
                setTimeout(
                    function () {
                        if (i === sectedCoordinates.length) {
                            i = 0;        
                        }
                        aniPoint.getGeometry().setCoordinates(sectedCoordinates[i]);
						if (i < sectedCoordinates.length - 1) {
							let startPoint = sectedCoordinates[i];
							let endPoint = sectedCoordinates[i + 1];
							let turfStart = turf.toWgs84(turf.point(startPoint));
							let turfEnd = turf.toWgs84(turf.point(endPoint));
							let turfAngle = turf.bearing(turfStart, turfEnd);
							console.log(turfAngle);
							console.log(sectedCoordinates[i]);
							iconImage.setRotation(turfAngle * Math.PI / 180);
						}
						if (i === 0) {
							
						}
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

draw.on(
	'propertychange',
	function (e) {
		console.log('Hi!');
	}
)

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
		
		idGen++;  // Инкремент глобальной переменной для следующего объекта
		
		let efCoordinates = eFeature.getGeometry().getCoordinates()
		let tracLine = new ol.Feature({
			geometry: new ol.geom.LineString(lineBezier(efCoordinates))
		});
		tracLine.setId(eFeature.getId() + 'trac');
		tracLine.setStyle(traectoryStyle);
		sourceTrac.addFeature(tracLine);
		for (let i = 1; i < efCoordinates.length; i++) {
			let vertexPoint = new ol.Feature({
				geometry: new ol.geom.Point(efCoordinates[i])
			});
			vertexPoint.setId(eFeature.getId() + 'vertex' + i);
			vertexPoint.setStyle(vertexPointStyle);
			sourcePoint.addFeature(vertexPoint);
		}
		sourcePoint.addFeature(startPoint);
		
		let aniPoint = new ol.Feature({
			geometry: new ol.geom.Point(eFeature.getGeometry().getCoordinates()[0])
		});
		
		let start = turf.toWgs84(turf.point(eFeature.getGeometry().getCoordinates()[0]));
		let end = turf.toWgs84(turf.point(eFeature.getGeometry().getCoordinates()[1]));
		let angle = turf.bearing(start, end);
		iconImage.setRotation(angle * Math.PI / 180);
		aniPoint.setStyle(iconStyle);
		
		aniPoint.setId(eFeature.getId() + 'anim');
		sourceAnim.addFeature(aniPoint);
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
		efCoordinates = eFeature.getGeometry().getCoordinates();
		sourceTrac.removeFeature(sourceTrac.getFeatureById(eFeature.getId() + 'trac'));
		let tracLine = new ol.Feature({
			geometry: new ol.geom.LineString(lineBezier(efCoordinates))
		});
		tracLine.setId(eFeature.getId() + 'trac');
		tracLine.setStyle(traectoryStyle);
		sourceTrac.addFeature(tracLine);
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
    sourceAnim.clear();
    
}

// TODO: добавить инструмент удаления траектории. По сути, нужно включить 
// интерекшн selectClick, но с дополнительной опцией, типа toDelete = true / false.
function deleteObject() {
    map.removeInteraction(draw);
    map.removeInteraction(modify);
    map.removeInteraction(selectClick);
    map.addInteraction(selectToDelete);
}
