(function () {
    var elevationTerrarium = new ol.source.GeoTIFF({
        convertToRGB: true,
        interpolate: false,
        sources: [
            {
                url: 'geotiff/terrarium.tif'
            }
        ],
        sourceOptions: {
            allowFullFile: true
        }
    });

    var elevationMapbox = new ol.source.GeoTIFF({
        convertToRGB: true,
        interpolate: false,
        sources: [
            {
                url: 'geotiff/mapbox.tif'
            }
        ],
        sourceOptions: {
            allowFullFile: true
        }
    });

    let featurePoint = new ol.Feature(new ol.geom.Point([]));

    var vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [featurePoint]
        })
    });

    var rasterLayer = new ol.layer.WebGLTile({
        source: elevationTerrarium
    });

    var map = new ol.Map({
        layers: [rasterLayer, vectorLayer],
        target: 'map',
        view: new ol.View({
            center: [-62.25, -37.85],
            zoom: 12,
            projection: 'EPSG:4326'
        })
    });

    var options = {
        source: elevationTerrarium,
        calculateZMethod: 'Terrarium',
        tilesResolution: 'current',
        samples: 50, // For LineStrings and Polygons contour
        sampleSizeArea: 'auto', // For Polygons area
        smooth: 0
    };

    var elevationParser = new ElevationParser(options);

    // Add control the the Open Layers map instance
    map.addControl(elevationParser);

    map.on('click', async ({ coordinate }) => {
        featurePoint.getGeometry().setCoordinates(coordinate);
        const data = await elevationParser.getElevationValues(featurePoint);
        showValues(data.mainCoords[0]);
    });

    var valuesEl = document.getElementById('values');

    function showValues(data) {
        valuesEl.innerHTML = `
            <div><b>Longitude</b>: ${data[0].toFixed(4)}</div>
            <div><b>Latitude</b>: ${data[1].toFixed(4)}</div>
            <div><b>Elevation</b>: ${data[2]}</div>
        `;
    }

    function setMode(mode) {
        if (mode === 'Terrarium') {
            rasterLayer.setSource(elevationTerrarium);
            elevationParser.setSource(elevationTerrarium, true);
        } else {
            rasterLayer.setSource(elevationMapbox);
            elevationParser.setSource(elevationMapbox, true);
        }
        elevationParser.setCalculateZMethod(mode);
    }

    // Add test buttons
    function createRadioBtn(name, onClick, checked = false,) {
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'colorMode';
        radio.value = name;
        radio.onclick = onClick;
        radio.checked = checked;

        var radioLabel = document.createElement('label');
        radioLabel.innerHTML = name;

        radioLabel.append(radio)

        return radioLabel;
    }
    var buttonsSect  = document.getElementById('testButtons');

    buttonsSect.append(
        createRadioBtn('Terrarium', function () {
            setMode('Terrarium');
        }, true)
    );

    buttonsSect.append(
        createRadioBtn('Mapbox', function () {
            setMode('Mapbox');
        })
    );

})();
