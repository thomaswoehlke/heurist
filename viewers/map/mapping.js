/**
* @todo for mapping+timeline

+Init standalone map (published) by query or mapdoc id in url  - 1 hr
+Filter timeline visible range to map - 1hr
+Highlight selection on map 1-2hr

Cosmetics/workflow 2hr
Scroll in map legend
Render symbol colour in legend
Publish button
+Zoom to entire mapdoc
Add layer to mapdoc (open select record dialog from legend)
Save current result set as layer+datasource records 

Bugs 1-2hr
Glitches in symbology editor (not proper init values for marker in some cases)
Timeline does not expand automatically
Always keep current query as top group in timeline
Content of map popup is out of border (not wrapped)

Later?
KML is loaded as a single collection (without access to particular feature) Need to use our kml parser to parse and load each kml' placemark individually
Altough our kml parser supports Placemarks only. It means no external links, image overlays and other complex kml features. 
SHP loader not done (it seems there are leaflet plugin) 
Selector map tool (rectangle and polygon/lasso)
Editor map tool (to replace mapDraw.js based on gmap)
Thematic mapping
 
* options for preferences
* markercluster on/off 
*     showCoverageOnHover, zoomToBoundsOnClick, maxClusterRadius(80px)
* Derive map location of non-geolocalised entities from connected Places
* Map select tools (by click, in rect, in shape)
* Default symbology (for search result)
* Default base layer
* 
* mapping base widget
*
* It manipulates with map component (google or leaflet is implemented in descendants)
*      all native mathods for mapping must be defined here
* 
* mapManager.js is UI with list (tree) of mapdocuments, result sets and base maps
* timeline.js for Vis timeline 
* mapDocument.js maintains map document list and their layers
* mapLayer2.js loads data for particular layer
* 
* 
* options:
* element_layout
* element_map    #map by default
* element_timeline  #timeline by default 
* 
* notimeline - hide timeline (map only)
* nomap - timeline only
* 
* events:
* onselect
* oninit
* 
* 
* init (former _load)
* printMap
* 
* 
*     
*   openMapDocument - opens given map document
*   loadBaseMap
    addSearchResult - loads geojson data based on heurist query, recordset or json to current search (see addGeoJson)
    addRecordSet - converts recordset to geojson
    addGeoJson - adds geojson layer to map, apply style and trigger timeline update
    addTileLayer - adds image tile layer to map
    addImageOverlay - adds image overlay to map
    updateTimelineData - add/replace timeline layer_data in this.timeline_items and triggers timelineRefresh
    applyStyle
    getStyle
    
    setFeatureSelection - triggers redraw for path and polygones (assigns styler function)  and creates highlight circles for markers
    setFeatureVisibility - applies visibility for given set of heurist recIds (filter from timeline)
    
    _onLayerClick - map layer (shape) on click event handler - highlight selection on timeline and map, opens popup
    _clearHighlightedMarkers - removes special "highlight" selection circle markers from map
    setStyleDefaultValues - assigns default values for style (size,color and marker type)
    _createMarkerIcon - creates marker icon for url(image) and fonticon (divicon)
    _stylerFunction - returns style for every path and polygone, either individual feature style of parent layer style.
    _getMarkersByRecordID - returns markers by heurist ids (for filter and highlight)
    
* Events: see options.onselect and oninit
* onSelection - 
* onInitComplete - triggers options.oninit event handler
* 
* 
* 
* @package     Heurist academic knowledge management system
* @link        http://HeuristNetwork.org
* @copyright   (C) 2005-2019 University of Sydney
* @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @version     4.0
*/

/*  
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
* with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
* Unless required by applicable law or agreed to in writing, software distributed under the License is
* distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
* See the License for the specific language governing permissions and limitations under the License.
*/


$.widget( "heurist.mapping", {

    // default options
    options: {
        
        element_layout: null,
        element_map: 'map',
        element_timeline: 'timeline',
 
        layout_params:{}, //various layout and behaviour settings
        
        // callbacks
        onselect: null,
        oninit: null,
        ondraw_addstart:null,
        ondraw_editstart:null,
        ondrawend:null,
        
        isEditAllowed: true,
        isPublished: false
    },
    
    //reference to google or leaflet map
    
    //main elements
    nativemap: null,
    vistimeline: null,
    mapManager: null,
    current_query_layer:null, //record from search results mapdoc
    
    //controls
    map_legend: null,
    map_zoom: null,
    map_bookmark: null,
    map_geocoder: null,
    map_print: null,
    map_publish: null,
    main_popup: null,
    main_draw: null,
    
    //
    drawnItems: null,
    //deffau draw style
    map_draw_style: {color: '#3388ff',
             weight: 4,
             opacity: 0.5,
             fill: true, //fill: false for polyline
             fillColor: null, //same as color by default
             fillOpacity: 0.2},
    

    //storages
    all_layers: [],    // array of all loaded top layers
    all_clusters: {},  // markerclusters
    all_markers: {},
    
    timeline_items: {},
    timeline_groups: [], 
    notimeline: false,
    is_timeline_disabled:0,

    selected_rec_ids:[],

    myIconRectypes:{},  //storage for rectype icons by color and rectype id

    //  settings
    isMarkerClusterEnabled: true,
    isEditAllowed: true,
    
    
    //base maps
    basemaplayer_name: null,
    basemaplayer: null,
    basemap_providers: [
    {name:'MapBox', options:{accessToken: 'pk.eyJ1Ijoib3NtYWtvdiIsImEiOiJjanV2MWI0Y3Awb3NmM3lxaHI2NWNyYjM0In0.st2ucaGF132oehhrpHfYOw'
    , attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://    creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'
    }},
    {name:'Esri.WorldStreetMap'},
    {name:'Esri.WorldTopoMap'},
    {name:'Esri.WorldImagery'},
    //{name:'Esri.WorldTerrain'},
    {name:'Esri.WorldShadedRelief'},
    {name:'OpenStreetMap'},
    //{name:'OpenPtMap'},
    {name:'OpenTopoMap'},
    {name:'Stamen.Toner'},
    {name:'Stamen.TerrainBackground'},
    //{name:'Stamen.TopOSMRelief'},
    //{name:'OpenWeatherMap'}
    {name:'Esri.NatGeoWorldMap'},
    {name:'Esri.WorldGrayCanvas'}
    ],    
    // ---------------    
    // the widget's constructor
    
    //
    _create: function() {

        var that = this;

        this.element
        // prevent double click to select text
        .disableSelection();

        // Sets up element to apply the ui-state-focus class on focus.
        //this._focusable($element);   

        this._refresh();

    }, //end _create

    // Any time the widget is called with no arguments or with only an option hash, 
    // the widget is initialized; this includes when the widget is created.
    _init: function() {
    
        var that = this;    
        //1. INIT LAYOUT
        
        // Layout options
        var layout_opts =  {
            applyDefaultStyles: true,
            togglerContent_open:    '<div class="ui-icon"></div>',
            togglerContent_closed:  '<div class="ui-icon"></div>',
            onresize_end: function(){
                //global 
                //if(mapping) mapping.onWinResize();
                that._adjustLegendHeight();
            }
            
        };

        // Setting layout
        if(this.options.element_layout)
        {
            layout_opts.center__minHeight = 30;
            layout_opts.center__minWidth = 200;
            layout_opts.north__size = 30;
            layout_opts.north__spacing_open = 0;
            /*
            var th = Math.floor($(this.options.element_layout).height*0.2);
            layout_opts.south__size = th>200?200:th;
            layout_opts.south__spacing_open = 7;
            layout_opts.south__spacing_closed = 12;
            */
            layout_opts.south__onresize_end = function() {
                //if(mapping) mapping.setTimelineMinheight();
                that._adjustLegendHeight();
            };

            this.mylayout = $(this.options.element_layout).layout(layout_opts);
        }
        
        //2. INIT MAP
        if(this.options.element_map && this.options.element_map.indexOf('#')==0){
            map_element_id = this.options.element_map.substr(1);
        }else{
            map_element_id = 'map';    
        }
        
        $('#'+map_element_id).css('padding',0); //reset padding otherwise layout set it to 10px
        
        this.nativemap = L.map( map_element_id, {zoomControl:false, tb_del:true} )
            .on('load', function(){ } );

        //init basemap layer        
/*        
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://    creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox.streets',
            accessToken: 'pk.eyJ1Ijoib3NtYWtvdiIsImEiOiJjanV2MWI0Y3Awb3NmM3lxaHI2NWNyYjM0In0.st2ucaGF132oehhrpHfYOw'
        }).addTo( this.nativemap );       
*/

/*
        L.tileLayer('http://127.0.0.1/HEURIST_FILESTORE/osmak_5/{id}/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://    creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            maxZoom: 15,
            id: 'LondonAtlas'
        }).addTo( this.nativemap );       
*/        
        //3. INIT TIMELINE 
        //moved to updateLayout

        //LONDON this.nativemap.setView([51.505, -0.09], 13); //@todo change to bookmarks
        this.nativemap.setView([20, 20], 1); //@todo change to bookmarks
        
        //4. INIT CONTROLS
        if(this.main_popup==null) this.main_popup = L.popup();
        
        //zoom plugin
        this.map_zoom = L.control.zoom({ position: 'topleft' });//.addTo( this.nativemap );
        
        //legend contains mapManager
        this.map_legend = L.control.manager({ position: 'topright' }).addTo( this.nativemap );
        
        //content for legend
        this.mapManager = new hMapManager({container:this.map_legend._container, mapwidget:this.element});
        
        this.updateLayout(this.options.layout_params);
        
        this._adjustLegendHeight();
        
    },

    //Called whenever the option() method is called
    //Overriding this is useful if you can defer processor-intensive changes for multiple option change
    _setOptions: function( ) {
        
        this._superApply( arguments );
        
        if((arguments[0] && arguments[0]['layout_params']) || arguments['layout_params'] ){
            this.updateLayout(this.options.layout_params);
        }
    },

    /* 
    * private function 
    * show/hide buttons depends on current login status
    */
    _refresh: function(){

    },
    // 
    // custom, widget-specific, cleanup.
    _destroy: function() {
        // remove generated elements
        //this.select_rectype.remove();
    },
    
    //-------
    _adjustLegendHeight: function(){
        var ele = $('#'+map_element_id);
        if(this.mapManager) this.mapManager.setHeight(ele.height()-50); //adjust legend height    
    
    },
    
    
    //that.onInitComplete();
    //
    // triggers options.oninit event handler
    //    it is invoked on completion of hMapManager initialization - map is inited and all mapdocuments are loaded
    //
    onInitComplete:function(){
//        console.log('onInitComplete');
        
        if($.isFunction(this.options.oninit)){
                this.options.oninit.call(this, this.element);
        }
        
    },
    
    //
    //
    //
    openMapDocument: function( mapdoc_id ) {
        this.mapManager.openMapDocument( mapdoc_id );
    },

    //
    // returns array of mapdocuments ids
    // mode - all|loaded|visible
    // 
    getMapDocuments: function( mode ) 
    {
        return this.mapManager.getMapDocuments( mode );
    },
    
    //
    //
    //
    getBaseMapProviders: function(basemap_id){
        return this.basemap_providers;
    },
    
    //
    // basemap_id index in mapprovider array or provider name
    //
    loadBaseMap: function(basemap_id){
        
        var provider = this.basemap_providers[0];
        if(window.hWin.HEURIST4.util.isNumber(basemap_id) && basemap_id>=0){
            provider = this.basemap_providers[basemap_id];
        }else{
            $(this.basemap_providers).each(function(idx, item){
                if(item['name']==basemap_id){
                    provider = item;
                    return;        
                }
            });
        }
        
        if(this.basemaplayer_name!=provider['name']) {
            
            this.basemaplayer_name = provider['name'];
            
            if(this.basemaplayer!=null){
                this.basemaplayer.remove();
            }

            this.basemaplayer = L.tileLayer.provider(provider['name'], provider['options'] || {})
                    .addTo(this.nativemap);        
            
        }   
    },
    
    //
    // Adds layer to searchResults mapdoc
    // data - recordset, heurist query or json
    // this method is invoked on global onserachfinish event in app_timemap
    //
    addSearchResult: function(data, dataset_name) {
        this.current_query_layer = this.mapManager.addSearchResult( data, dataset_name );
    },

    //
    // Adds layer to searchResults mapdoc
    // recset - recordset to be converted to geojson
    // it is used in DH and EN where recordset is generated and prepared in custom way on client side
    //
    addRecordSet: function(recset, dataset_name) {
        //it is not piblish recordset since it is prepared localy 
        this.current_query_layer = null;
        this.mapManager.addRecordSet( recset, dataset_name );
    },
    
    //
    // adds image tile layer to map
    //
    addTileLayer: function(layer_url, layer_options, dataset_name){
    
        var new_layer;

        var HeuristTilerLayer = L.TileLayer.extend({
                    getBounds: function(){
                        return this.options._extent;  
                    }});

    
        if(layer_options['BingLayer'])
        {
                var BingLayer = HeuristTilerLayer.extend({
                    getTileUrl: function (tilePoint) {
                        //this._adjustTilePoint(tilePoint);
                        return L.Util.template(this._url, {
                            s: this._getSubdomain(tilePoint),
                            q: this._quadKey(tilePoint.x, tilePoint.y, this._getZoomForUrl())
                        });
                    },
                    _quadKey: function (x, y, z) {
                        var quadKey = [];
                        for (var i = z; i > 0; i--) {
                            var digit = '0';
                            var mask = 1 << (i - 1);
                            if ((x & mask) != 0) {
                                digit++;
                            }
                            if ((y & mask) != 0) {
                                digit++;
                                digit++;
                            }
                            quadKey.push(digit);
                        }
                        return quadKey.join('');
                    }
                });    
                
                if(!layer_options.subdomains) layer_options.subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];
                
                if(!layer_options.attribution) layer_options.attribution = '&copy; <a href="http://bing.com/maps">Bing Maps</a>';
                
                new_layer = new BingLayer(layer_url, layer_options).addTo(this.nativemap);  
                /*{
                   detectRetina: true
                }*/
                           
        }else if(layer_options['MapTiler'])
        {
                
                var MapTilerLayer = HeuristTilerLayer.extend({
                    getTileUrl: function (tilePoint) {
                        //this._adjustTilePoint(tilePoint);
                        return L.Util.template(this._url, {
                            s: this._getSubdomain(tilePoint),
                            q: this._maptiler(tilePoint.x, tilePoint.y, this._getZoomForUrl())
                        });
                    },
                    _maptiler: function (x, y, z) {
                        
                        var bound = Math.pow(2, z);
                        var s = ''+z+'/'+x+'/'+(bound - y - 1); 
                        return s;
                    }
                });    
                
            new_layer = new MapTilerLayer(layer_url, layer_options).addTo(this.nativemap);  
                
        }else{
            new_layer = new HeuristTilerLayer(layer_url, layer_options).addTo(this.nativemap);             
        }
        
        this.all_layers[new_layer._leaflet_id] = new_layer;
        
        return new_layer._leaflet_id;
        
    },
    
    //
    // adds image overlay to map
    //
    addImageOverlay: function(image_url, image_extent, dataset_name){
    
        var new_layer = L.imageOverlay(image_url, image_extent).addTo(this.nativemap);
      
        this.all_layers[new_layer._leaflet_id] = new_layer;
        
        return new_layer._leaflet_id;
    },
    
    //
    // adds geojson layer to map
    // returns nativemap id
    //
    addGeoJson: function(options){
            
            var geojson_data = options.geojson_data,
                timeline_data = options.timeline_data,
                layer_style = options.layer_style,
                //popup_template = options.popup_template,
                dataset_name = options.dataset_name,
                preserveViewport = options.preserveViewport;

        if (window.hWin.HEURIST4.util.isGeoJSON(geojson_data, true) || 
            window.hWin.HEURIST4.util.isArrayNotEmpty(timeline_data)){
                
            var that = this;

            var new_layer = L.geoJSON(geojson_data, {
                    default_style: null
                    , layer_name: dataset_name
                    //The onEachFeature option is a function that gets called on each feature before adding it to a GeoJSON layer. A common reason to use this option is to attach a popup to features when they are clicked.
                   /* 
                    , onEachFeature: function(feature, layer) {

                        //each feature may have its own feature.style
                        //if it is not defined then layer's default_style will be used
                        feature.default_style = layer.options.default_style;

                        layer.on('click', function (event) {
                            that.vistimeline.timeline('setSelection', [feature.properties.rec_ID]);

                            that.setFeatureSelection([feature.properties.rec_ID]);
                            if($.isFunction(that.options.onselect)){
                                that.options.onselect.call(that, [feature.properties.rec_ID]);
                            }
                            //open popup
                            var popupURL = window.hWin.HAPI4.baseURL + 'viewers/record/renderRecordData.php?mapPopup=1&recID='
                            +feature.properties.rec_ID+'&db='+window.hWin.HAPI4.database;

                            $.get(popupURL, function(responseTxt, statusTxt, xhr){
                                if(statusTxt == "success"){
                                    that.main_popup.setLatLng(event.latlng)
                                    .setContent(responseTxt) //'<div style="width:99%;">'+responseTxt+'</div>')
                                    .openOn(that.nativemap);
                                }
                            });

                            //that._trigger('onselect', null, [feature.properties.rec_ID]);

                        });
                    }*/

                    /* , style: function(feature) {
                    if(that.selected_rec_ids.indexOf( feature.properties.rec_ID )>=0){
                    return {color: "#ff0000"};
                    }else{
                    //either specific style from json or common layer style
                    return feature.style || feature.default_style;
                    }
                    }
                    */
                    /*
                    pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                    },                
                    //The filter option can be used to control the visibility of GeoJSON features
                    filter: function(feature, layer) {
                    return feature.properties.show_on_map;
                    }                
                    */
                })
                /*.bindPopup(function (layer) {
                return layer.feature.properties.rec_Title;
                })*/
                .addTo( this.nativemap );            


            /* not implemented - idea was store template in mapdocument and excute is on _onLayerClick    
            if(popup_template){
                new_layer.eachLayer( function(child_layer){ 
                        child_layer.feature.popup_template = popup_template;
                });
            } 
            */   
                
            if(!this.notimeline){
                this.updateTimelineData(new_layer._leaflet_id, timeline_data, dataset_name);
            }         

            this.all_layers[new_layer._leaflet_id] = new_layer;
            
            //apply default style and fill markercluster
            this.applyStyle( new_layer._leaflet_id, layer_style ?layer_style:{color: "#00b0f0"});

            if(!preserveViewport){
                   this.zoomToLayer(new_layer._leaflet_id);           
            }
            
            return new_layer._leaflet_id;
        }        

        else{
            return 0;
        }
        
    },

            /*convert geojson_data to timeline format
            this.main_layer.eachLayer(function(layer){

            var feature = layer.feature;

            if (feature.when && window.hWin.HEURIST4.util.isArrayNotEmpty(feature.when.timespans) ) {

            for(k=0; k<feature.when.timespans.length; k++){
            ts = feature.when.timespans[k];

            iconImg = window.hWin.HAPI4.iconBaseURL + feature.properties.rec_RecTypeID + '.png';

            titem = {
            id: timeline_dataset_name+'-'+feature.properties.rec_ID+'-'+k, //unique id
            group: timeline_dataset_name,
            content: '<img src="'+iconImg 
            +'"  align="absmiddle" style="padding-right:3px;" width="12" height="12"/>&nbsp;<span>'
            +feature.properties.rec_Title+'</span>',
            //'<span>'+recName+'</span>',
            title: feature.properties.rec_Title,
            start: ts[0],
            recID:feature.properties.rec_ID
            };

            if(ts[3] && ts[0]!=ts[3]){
            titem['end'] = ts[3];
            }else{
            titem['type'] = 'point';
            //titem['title'] = singleFieldName+': '+ dres[0] + '. ' + titem['title'];
            }

            timeline_items.push(titem); 
            }
            }
            });*/


    updateTimelineLayerName: function(layer_id, new_dataset_name){

        if(this.notimeline) return;
        
        var group_idx = this.getTimelineGroup(layer_id);
        if(group_idx>=0){
            this.timeline_groups[group_idx].content = new_dataset_name;
            
            this.vistimeline.timeline('timelineUpdateGroupLabel', this.timeline_groups[group_idx]);
        }
        
    },

    
    //
    // add/replace layer time data to timeline_groups/timeline_items
    //  layer_id - leaflet id
    //  layer_data - timeline data from server
    //
    updateTimelineData: function(layer_id, layer_data, dataset_name){
        
            if(this.notimeline) return;
      
            var titem, k, ts, iconImg;

            if(window.hWin.HEURIST4.util.isArrayNotEmpty(layer_data) ){

                var group_idx = this.getTimelineGroup(layer_id);
                if(group_idx<0){
                    this.timeline_groups.push({ id:layer_id, content:dataset_name });        
                    group_idx = this.timeline_groups.length-1;
                }else{
                    this.timeline_groups[group_idx].content = dataset_name;
                }
                /*if(dataset_name=='Current query' && group_idx>0){ //swap
                    var swap = this.timeline_groups[0];
                    this.timeline_groups[0] = this.timeline_groups[group_idx];
                    this.timeline_groups[group_idx] = swap;
                }*/
                
                this.timeline_items[layer_id] = []; //remove/rest previous data
                
                var that = this;

                $.each(layer_data, function(idx, tdata){

                    iconImg = window.hWin.HAPI4.iconBaseURL + tdata.rec_RecTypeID + '.png';

                    ts = tdata.when;

                    for(k=0; k<tdata.when.length; k++){
                        ts = tdata.when[k];

                        titem = {
                            id: layer_id+'-'+tdata.rec_ID+'-'+k, //unique id
                            group: layer_id,
                            content: '<img src="'+iconImg 
                            + '"  align="absmiddle" style="padding-right:3px;" width="12" height="12"/>&nbsp;<span>'
                            + tdata.rec_Title+'</span>',
                            //'<span>'+recName+'</span>',
                            title: tdata.rec_Title,
                            start: ts[0],
                            recID: tdata.rec_ID
                        };

                        if(ts[3] && ts[0]!=ts[3]){
                            titem['end'] = ts[3];
                        }else{
                            titem['type'] = 'point';
                            //titem['title'] = singleFieldName+': '+ dres[0] + '. ' + titem['title'];
                        }

                        that.timeline_items[layer_id].push(titem); 
                    }//for timespans

                });
                
            }else if(!this.removeTimelineGroup(layer_id)){
                // no timeline data - remove entries from timeline_groups and items
                // if no entries no need to redraw
                return;
            }
                
            this.vistimeline.timeline('timelineRefresh', this.timeline_items, this.timeline_groups);          
            
            this._updatePanels()
    },
    
    //
    //
    //
    getTimelineGroup:function(layer_id){
        
        for (var k=0; k<this.timeline_groups.length; k++){
            if(this.timeline_groups[k].id==layer_id){
                return k;
            }
        }
        return -1;
    },
    
    //
    //
    //
    removeTimelineGroup:function(layer_id){
        var idx = this.getTimelineGroup(layer_id);
        if(idx>=0){
            this.timeline_groups.splice(idx,1);
            this.timeline_items[layer_id] = null;
            delete this.timeline_items[layer_id];
            return true;
        }else{
            return false;
        }
    },
    
    //
    //
    //
    _mergeBounds: function(bounds){

        var res = null;

        for(var i=0; i<bounds.length; i++){
            if(bounds[i]){

                if(!(bounds[i] instanceof L.LatLngBounds)){
                    if($.isArray(bounds[i]) && bounds[i].length>1 ){
                        bounds[i] = L.latLngBounds(bounds[i]);
                    }else{
                        continue;
                    }
                }

                if( bounds[i].isValid() ){
                    if(res==null){
                        res = bounds[i];
                    }else{
                        res.extend(bounds[i]);
                        //bounds[i].getNorthWest());
                        //res.extend(bounds[i].getSouthEast());
                    } 
                }
            }
        }

        return res;

    },

    //
    //
    //
    getBounds: function(layer_ids){
        
        if(!$.isArray(layer_ids)){
            layer_ids = [layer_ids];
        }
        
        var bounds = [];
        
        for(var i=0; i<layer_ids.length; i++){
            
            var layer_id = layer_ids[i];
            
            var affected_layer = this.all_layers[layer_id];
            if(affected_layer){
                var bnd = affected_layer.getBounds()
                bounds.push( bnd );
                
                if(window.hWin.HEURIST4.util.isArrayNotEmpty( this.all_markers[layer_id] ) 
                        && this.all_clusters[layer_id])
                {
                    bnd = this.all_clusters[layer_id].getBounds();
                    bounds.push( bnd );
                }
            }
            
        }
        
        bounds = this._mergeBounds(bounds);
        
        return bounds;
    },
    
    //
    //
    //
    zoomToLayer: function(layer_ids){
        
        var bounds = this.getBounds(layer_ids);
        
        if(bounds && bounds.isValid()) this.nativemap.fitBounds(bounds);
        
    },
    
    //
    //
    //
    removeLayer: function(layer_id)
    {
        var affected_layer = this.all_layers[layer_id];

        if(affected_layer){
            
            this._clearHighlightedMarkers();
            
            if(this.all_clusters[layer_id]){
                this.all_clusters[layer_id].clearLayers();
                this.all_clusters[layer_id].remove();
                this.all_clusters[layer_id] = null;
                delete this.all_clusters[layer_id];
            }
            if(this.all_markers[layer_id]){
                this.all_markers[layer_id] = null;
                delete this.all_markers[layer_id];
            }
            
            affected_layer.remove();
            this.all_layers[layer_id] = null;
            
            if(this.removeTimelineGroup(layer_id) && !this.notimeline){
                //update timeline
                this.vistimeline.timeline('timelineRefresh', this.timeline_items, this.timeline_groups);
                this._updatePanels()
            }
        }
    },

    //
    //
    //
    setLayerVisibility: function(layer_id, is_visible)
    {
        var affected_layer = this.all_layers[layer_id];
        if(affected_layer){
            this._clearHighlightedMarkers();
            
            if(is_visible===false){
                affected_layer.remove();
                if(this.all_clusters[layer_id]) this.all_clusters[layer_id].remove();
            }else{
                affected_layer.addTo(this.nativemap);
                if(this.all_clusters[layer_id]) this.all_clusters[layer_id].addTo(this.nativemap);
            }
        }
    },
    
    //
    //
    //
    getStyle: function(layer_id) {
        var affected_layer = this.all_layers[layer_id];
        if(!affected_layer) return null;
        var style = window.hWin.HEURIST4.util.isJSON(affected_layer.options.default_style);
        if(!style){
            return this.setStyleDefaultValues({});    
        }else{
            return style;
        }
    },
    //
    // apply style for given layer
    // it takes style from options.default_style, each feature may have its own style that overwrites layer's one
    //
    applyStyle: function(layer_id, newStyle) {
        
        var affected_layer = this.all_layers[layer_id];
        
        if(!affected_layer || affected_layer instanceof L.ImageOverlay || affected_layer instanceof L.TileLayer){
            return   
        } 

        this._clearHighlightedMarkers();

        
        var that = this;
        
        //create icons (@todo for all themes and recctypes)
        style = window.hWin.HEURIST4.util.isJSON(newStyle);
        if(!style && affected_layer.options.default_style){
            //new style is not defined and layer already has default one - no need action
            return;
        }
   
        //update markers only if style has been changed
        //var marker_style = null;
        //var myIcon = new L.Icon.Default();
        
        // set default values -------       
        style = this.setStyleDefaultValues( style );
        
        var myIcon = this._createMarkerIcon( style );

        //set default values ------- END
        
        affected_layer.options.default_style = style;
        
        
        if(this.isMarkerClusterEnabled){

            var is_new_markercluster = window.hWin.HEURIST4.util.isnull(this.all_clusters[layer_id]);
            if(is_new_markercluster){
                this.all_clusters[layer_id] = L.markerClusterGroup({showCoverageOnHover:false});
            }else{
                this.all_clusters[layer_id].clearLayers() 
            }
            
        }else{
            is_new_markercluster = window.hWin.HEURIST4.util.isnull(this.all_markers[layer_id]);
        }
            
        if(is_new_markercluster){
            
            this.all_markers[layer_id] = [];
            
            var  that = this;

            //get all markers within layer group and apply new style
            function __extractMarkers(layer, parent_layer, feature)
            {
                //var feature = layer.feature;    
                if(layer instanceof L.LayerGroup){
                    layer.eachLayer( function(child_layer){__extractMarkers(child_layer, layer, feature);} );
                    
                }else if(layer instanceof L.Marker || layer instanceof L.CircleMarker){
                    
                    layer.feature = feature;
                    
                    if(that.isMarkerClusterEnabled){
                        parent_layer.removeLayer( layer );  
                        layer.cluster_layer_id = layer_id;
                    }else{
                        //need to store reference to add/remove marker on style change  
                        //CircleMarker <> Marker
                        layer.parent_layer = parent_layer;  
                    }
                    that.all_markers[layer_id].push( layer );
                }

                layer.on('click', function(e){that._onLayerClick(e)} );
            }

            affected_layer.eachLayer( function(child_layer){ 
                    child_layer.feature.default_style = style;
                    __extractMarkers(child_layer, affected_layer, child_layer.feature);
            } );
            
        }else{
            
            affected_layer.eachLayer( function(child_layer){ 
                    child_layer.feature.default_style = style;
            } );
        }
        
        //apply marker style
        $(this.all_markers[layer_id]).each(function(idx, layer){
                
                var feature = layer.feature;
                var markerStyle;
                var setIcon;
                
                layer.feature.default_style = style;
                
                if(layer.feature.style){ //indvidual style per record
                    markerStyle = that.setStyleDefaultValues(layer.feature.style);
                    setIcon = that._createMarkerIcon( markerStyle );
                }else{
                    //heurist layer common style
                    markerStyle = style;
                    setIcon = myIcon;
                }

                //define icon for record type                                        
                if(markerStyle.iconType=='rectype' )
                {
                    var rty_ID = feature.properties.rec_RecTypeID;
                    if(that.myIconRectypes[rty_ID+markerStyle.color]){
                        setIcon = that.myIconRectypes[rty_ID+markerStyle.color];
                    }else{
                        
                        var fsize = markerStyle.iconSize;
                        setIcon = L.icon({
                            iconUrl: (window.hWin.HAPI4.iconBaseURL + rty_ID + 's.png&color='+encodeURIComponent(markerStyle.color)),
                            iconSize: [fsize, fsize]                        
                        });
                        that.myIconRectypes[rty_ID+markerStyle.color] = setIcon;
                    }
                }
                
                var new_layer = null;
                if(layer instanceof L.Marker){
                    if(markerStyle.iconType=='circle'){
                        //change to circleMarker
                        markerStyle.radius = markerStyle.iconSize/2;
                        new_layer = L.circleMarker(layer.getLatLng(), markerStyle);    
                        new_layer.feature = feature;
                    }else{
                        layer.setIcon(setIcon);    
                    }

                }else if(layer instanceof L.CircleMarker){
                    if(markerStyle.iconType!='circle'){
                        //change from circle to icon marker
                        new_layer = L.marker(layer.getLatLng(), {icon:setIcon});
                        new_layer.feature = feature;
                    }else{
                        markerStyle.radius = markerStyle.iconSize/2;
                        layer.setStyle(markerStyle);
                        //layer.setRadius(markerStyle.iconSize);                    
                    }
                }
                
                if(new_layer!=null){
                    that.all_markers[layer_id][idx] = new_layer; 
                    if(!that.isMarkerClusterEnabled){
                        layer.parent_layer.addLayer(new_layer);
                        layer.parent_layer.removeLayer(layer);
                        layer.remove();
                        layer = null;
                    }
                    new_layer.on('click', function(e){that._onLayerClick(e)});
                    
                }
            
        });
     
        //add all markers to cluster
        if(this.isMarkerClusterEnabled){
            this.all_clusters[layer_id].addLayers(this.all_markers[layer_id]);                                 
            if(is_new_markercluster){
                this.all_clusters[layer_id].addTo( this.nativemap );
            }
        }

        affected_layer.setStyle(function(feature){ return that._stylerFunction(feature); });
        
    },
    
    //
    // map layer (shape) on click event handler - highlight selection on timeline and map, opens popup
    //
    // content of popup can be retrieved by rec_ID via renderRecordData.php script
    // field rec_Info can have url, content or be calculated field (function)
    // 
    _onLayerClick: function(event){
        
        var layer = (event.target);
        if(layer && layer.feature){
            
            var  that = this;
            
            if(layer.feature.properties.rec_ID>0){
            
                that.vistimeline.timeline('setSelection', [layer.feature.properties.rec_ID]);

                that.setFeatureSelection([layer.feature.properties.rec_ID]);
                if($.isFunction(that.options.onselect)){
                    that.options.onselect.call(that, [layer.feature.properties.rec_ID]);
                }
                
                var popupURL;
                var info = layer.feature.properties.rec_Info; //popup info may be already prepared
                if(info){
                    if(info.indexOf('http://')==0 || info.indexOf('https://')==0){
                        popupURL =  info; //load content from url
                    }
                }else{
                    popupURL = window.hWin.HAPI4.baseURL + 'viewers/record/renderRecordData.php?mapPopup=1&recID='
                            +layer.feature.properties.rec_ID
                            +'&db='+window.hWin.HAPI4.database+'&ll='
                            +window.hWin.HAPI4.sysinfo['layout'];
                }                
                //open popup
                if(popupURL){
                    $.get(popupURL, function(responseTxt, statusTxt, xhr){
                        if(statusTxt == "success"){
                            that.main_popup.setLatLng(event.latlng)
                            .setContent(responseTxt) //'<div style="width:99%;">'+responseTxt+'</div>')
                            .openOn(that.nativemap);
                        }
                    });
                }else{
                    that.main_popup.setLatLng(event.latlng)
                            .setContent(info) //'<div style="width:99%;">'+responseTxt+'</div>')
                            .openOn(that.nativemap);
                }
        
            }else{
                
                    var sText = '';    
                    for(var key in layer.feature.properties) {
                        if(layer.feature.properties.hasOwnProperty(key) && key!='_deleted'){
                               sText = sText 
                                + '<div class="detailRow fieldRow" style="border:none 1px #00ff00;">'
                                + '<div class="detailType">'+key+'</div><div class="detail truncate">'
                                + window.hWin.HEURIST4.util.htmlEscape(layer.feature.properties[key])
                                + '</div></div>';                
                        }
                    }
                    if(sText!=''){
                        sText = '<div class="map_popup">' + sText + '</div>';
                        that.main_popup.setLatLng(event.latlng)
                            .setContent(sText) 
                            .openOn(that.nativemap);
                    }
            }
        
        }
    },
    
    //
    // remove special "highlight" selection circle markers from map
    //
    _clearHighlightedMarkers: function(){
      
      for(var idx in this.highlightedMarkers){
          this.highlightedMarkers[idx].remove();
      }
      
      this.highlightedMarkers = [];  
    },
    
    //
    // assigns default values for style (size,color and marker type)
    //
    setStyleDefaultValues: function(style){
        if(!style) style = {};
        if(!style.iconType || style.iconType=='default') style.iconType ='rectype';
        style.iconSize = (style.iconSize>0) ?parseInt(style.iconSize) :((style.iconType=='circle')?9:18);
        style.color = (style.color?style.color:'#00b0f0');
        style.weight = style.weight>0?style.weight:3;
        style.opacity = style.opacity>0?style.opacity:1;
        style.fillOpacity = style.fillOpacity>0?style.fillOpacity:0.2;
        return style;
    },        
    
    //
    // creates marker icon for url(image) and fonticon (divicon)
    //
    _createMarkerIcon: function(style){
        
        var myIcon;
      
        if(style.iconType=='url'){
            
            var fsize = style.iconSize;
            
            myIcon = L.icon({
                iconUrl: style.iconUrl,
                iconSize: [fsize, fsize]
                /*iconAnchor: [22, 94],
                popupAnchor: [-3, -76],
                shadowUrl: 'my-icon-shadow.png',
                shadowSize: [68, 95],
                shadowAnchor: [22, 94]*/
            });      
            //marker_style = {icon:myIcon};
            
        }else if(style.iconType=='iconfont'){
            
            if(!style.iconFont) style.iconFont = 'location';
            
            var cname = (style.iconFont.indexOf('ui-icon-')==0?'':'ui-icon-')+style.iconFont;
            var fsize = style.iconSize;
            var isize = 6+fsize;
            var bgcolor = (style.fillColor0?(';background-color:'+style.fillColor):';background:none');
            
            myIcon = L.divIcon({  
                html: '<div class="ui-icon '+cname+'" style="border:none;font-size:'    //padding:2px;;width:'+isize+'px;
                        +fsize+'px;width:'+fsize+'px;height:'+fsize+'px;color:'+style.color+bgcolor+'"/>',
                iconSize:[fsize, fsize],
                iconAnchor:[fsize/2, fsize/4]
            });
            
            //marker_style = {icon:myIcon};
        }  
        
        return myIcon;       
    },
    
    //
    // returns style for every path and polygone, either individual feature style of parent layer style.
    // for markers style is defined in applyStyle
    //
    _stylerFunction: function(feature){
        
        
        //feature.style - individual style (set in symbology field per record)
        //feature.default_style - style of parent heurist layer (can be changed via legend)
        var use_style = feature.style || feature.default_style;
        
        if( feature.properties && this.selected_rec_ids.indexOf( feature.properties.rec_ID )>=0){
            use_style = window.hWin.HEURIST4.util.cloneJSON( use_style );
            use_style.color = '#ffff00';
        }
        
        return use_style;
        
    },
    
    //
    // triggers redraw for path and polygones (assigns styler function)  and creates highlight circles for markers
    //    
    setFeatureSelection: function( _selection, is_external ){
        var that = this;
        
        this._clearHighlightedMarkers();
        
        this.selected_rec_ids = (window.hWin.HEURIST4.util.isArrayNotEmpty(_selection)) ?_selection:[];
        
        that.nativemap.eachLayer(function(top_layer){    
            if(top_layer instanceof L.LayerGroup){
                top_layer.setStyle(function(feature) { return that._stylerFunction(feature); });
            }
        });
        
        //find selected markers by id
        this.highlightedMarkers = [];
        var selected_markers = this._getMarkersByRecordID(_selection);
        for(var idx in selected_markers){
            var layer = selected_markers[idx];
            /*if(layer instanceof L.CircleMarker){
                layer.setStyle( {color: '#ffff00'});//function(feature) {that._stylerFunction(feature); });
            }else{*/
                //create special hightlight marker below this one
                var use_style = layer.feature.style || layer.feature.default_style;
                var iconSize = ((use_style && use_style.iconSize>0)?use_style.iconSize:16);
                var radius = iconSize/2+3;
                //iconSize = ((layer instanceof L.CircleMarker) ?(iconSize+2) :(iconSize/2+4));
                
                var new_layer = L.circleMarker(layer.getLatLng(), {color:'#ffff00'} );    
                new_layer.setRadius(radius);
                new_layer.addTo( this.nativemap );
                new_layer.bringToBack();
                this.highlightedMarkers.push(new_layer);
            //}
        }        
          
        //this.main_layer.remove();
        //this.main_layer.addTo( this.nativemap );
        if (is_external===true && !this.notimeline) { //call from external source (app_timemap)
            this.vistimeline.timeline('setSelection', this.selected_rec_ids);
        }
        
    },

    //
    // returns markers by heurist ids (for filter and highlight)
    //
    _getMarkersByRecordID: function( _selection ){
        
        var selected_markers = [];
        
        if(_selection.length>0)
        for(var layer_id in this.all_markers) {
            if(this.all_markers.hasOwnProperty(layer_id)){
                    var markers = this.all_markers[layer_id];
                    $(markers).each(function(idx, layer){
                        if (_selection===true || (layer.feature &&
                         window.hWin.HEURIST4.util.findArrayIndex(layer.feature.properties.rec_ID, _selection)>=0)){
                              selected_markers.push( layer );
                              if(selected_markers.length==_selection.length) return false;
                         }
                    });
            }
            if(selected_markers.length==_selection.length) break;
        }        
        
        return selected_markers;
    },

    //
    //  applies visibility for given set of heurist recIds (filter from timeline)
    // _selection - true - apply all layers, or array of rec_IDs
    //
    setFeatureVisibility: function( _selection, is_visible ){
        
        if(_selection===true || window.hWin.HEURIST4.util.isArrayNotEmpty(_selection)) {
            
            var vis_val = (is_visible==false)?'none':'block';
            
            this._clearHighlightedMarkers();
            
            //use  window.hWin.HEURIST4.util.findArrayIndex(layer.properties.rec_ID, _selection)
            var that = this;
        
            that.nativemap.eachLayer(function(top_layer){    
                if(top_layer instanceof L.LayerGroup)
                top_layer.eachLayer(function(layer){
                      if (layer instanceof L.Layer && layer.feature && (!(layer.cluster_layer_id>0)) &&
                      ( _selection===true || 
                        window.hWin.HEURIST4.util.findArrayIndex(layer.feature.properties.rec_ID, _selection)>=0)) 
                      {
                          if(is_visible==false){
                                layer.remove();    
                          }else if(layer._map==null){
                                layer.addTo( that.nativemap );    
                          }
                          /*
                          if($.isFunction(layer.getElement)){
                                var ele = layer.getElement();
                                if(ele) ele.style.display = vis_val;
                          }else{
                                    layer.setStyle({display:vis_val});
                          }
                          */
                      }
                });
            });
            
            
            if(this.isMarkerClusterEnabled){
                
                var selected_markers = this._getMarkersByRecordID(_selection);
                for(var idx in selected_markers){

                    var layer = selected_markers[idx];
                    if(layer.cluster_layer_id>0 && that.all_clusters[layer.cluster_layer_id]){
                        if(is_visible==false){
                            that.all_clusters[layer.cluster_layer_id].removeLayer(layer);
                        }else {
                            if(!that.all_clusters[layer.cluster_layer_id].hasLayer(layer)){
                                that.all_clusters[layer.cluster_layer_id].addLayer(layer);
                            }
                        }
                    }
                }
                /*
                for(var layer_id in this.all_markers) {
                    if(this.all_markers.hasOwnProperty(layer_id)){
                            var markers = this.all_markers[layer_id];
                            $(markers).each(function(idx, layer){
                                if (_selection===true || (layer.feature &&
                                 window.hWin.HEURIST4.util.findArrayIndex(layer.feature.properties.rec_ID, _selection)>=0)){
                                     
                                      if(is_visible==false){
                                          that.all_clusters[layer.cluster_layer_id].removeLayer(layer);
                                      }else {
                                            if(!that.all_clusters[layer.cluster_layer_id].hasLayer(layer)){
                                                that.all_clusters[layer.cluster_layer_id].addLayer(layer);
                                            }
                                      }
                                 }
                            });
                    }
                }*/
                
                
            }
            
        }
        
    },
    
    //
    // show/hide layout panels and map controls
    // params: 
    //   nomap, notimeline
    //   controls: [all,none,zoom,bookmark,geocoder,print,publish,legend]
    //   legend: [basemaps,search,mapdocs|onedoc]
    //   basemap: name of initial basemap
    //   extent: fixed extent    
    //
    updateLayout: function( params ){
        
        function __parseval(val){
            if(!window.hWin.HEURIST4.util.isempty(val)){
                val = val.toLowerCase();
                return !(val==0 || val=='off' || val=='no' || val=='n');
            }else{
                return false;
            }
        }
        function __splitval(val){
            
            var res = [];
            if(!$.isArray(val)){
                if(!val) val = 'all';
                val = val.toLowerCase();
                res = val.split(',');
            }
            if(!(res.length>0)) res = val.split(';');
            if(!(res.length>0)) res = val.split('|');
            
            if(res.length==0) res.push['all'];
            
            return res;
        }
        
        if(!params) return;
        
        
        this.isMarkerClusterEnabled = !__parseval(params['nocluster']);
        this.options.isPublished = __parseval(params['published']);
        this.options.isEditAllowed = !this.options.isPublished || __parseval(params['editstyle']);
        
        //show/hide map or timeline
        var nomap = __parseval(params['nomap']);
        this.notimeline = __parseval(params['notimeline']);
        
        var layout_opts = {};
        if(this.notimeline){
            layout_opts.south__size = 200;
            layout_opts.south__spacing_open = 0;
            layout_opts.south__spacing_closed = 0;
        }else{
            
            if(!this.vistimeline){
                this.vistimeline = $(this.element).find('.ui-layout-south').timeline({
                    element_timeline: this.options.element_timeline,
                    onselect: function(selected_rec_ids){
                        that.setFeatureSelection(selected_rec_ids); //highlight on map
                        if($.isFunction(that.options.onselect)){ //trigger global event
                            that.options.onselect.call(that, selected_rec_ids);
                        }
                    },                
                    onfilter: function(show_rec_ids, hide_rec_ids){
                        
                        that.setFeatureVisibility(show_rec_ids, true);
                        that.setFeatureVisibility(hide_rec_ids, false);
                    }});
            }
            
            
            if(this.options.element_layout){
                var th = Math.floor($(this.options.element_layout).height()*0.2);
                layout_opts.south__size = th>200?200:th;
                
                if(nomap){
                    layout_opts.center__minHeight = 0;
                    layout_opts.south__spacing_open = 0;
                    layout_opts.south__spacing_closed = 0;
                }else{
                    layout_opts.south__spacing_open = 7;
                    layout_opts.south__spacing_closed = 12;
                    layout_opts.center__minHeight = 30;
                    layout_opts.center__minWidth = 200;
                }
            }
        }
        
        if(this.options.element_layout){
            if(__parseval(params['noheader'])){ //outdated
                layout_opts.north__size = 0;
            }
            //$(this.mylayout).layout(layout_opts);
            var mylayout = $(this.options.element_layout).layout(layout_opts);
            if(this.notimeline){
                mylayout.hide('south');
            }
        }
        
    
        //map controls {all,none,zoom,bookmark,geocoder,print,publish,legend}
        var controls = __splitval(params['controls']);
        controls.push('zoom'); //zoom is always visible
        
        var that = this;
        function __controls(val){
            var is_visible = (controls.indexOf('all')>=0  
                                || controls.indexOf(val)>=0);
            
            if(is_visible){
                
                if(!that['map_'+val])  //not yet created
                {
                    //not yet created
                    if(val=='bookmark') //bookmark plugin
                    that.map_bookmark = new L.Control.Bookmarks({ position: 'topleft' });
                    
                    if(val=='geocoder') //geocoder plugin
                    that.map_geocoder = L.Control.geocoder({ position: 'topleft' });
                    
                    //print plugin
                    if(val=='print'){
                    that.map_print = L.control.browserPrint({ position: 'topleft' })
                    $(that.map_print).find('.browser-print-mode').css({padding: '2px 10px !important'}); //.v1 .browser-print-mode
                    }

                    if(val=='publish') //publish plugin
                    that.map_publish = L.control.publish({ position: 'topleft', mapwidget:this });//.addTo( this.nativemap );
                    
                    
                    if(val=='draw') //draw plugin
                    {
                        that.drawnItems = L.featureGroup().addTo(that.nativemap);
                        
                          /*
                        L.Edit.PolyVerticesEdit = L.Edit.PolyVerticesEdit.extend(
                           {
                                    icon: new L.DivIcon({
                                      iconSize: new L.Point(8, 8),
                                      className: 'leaflet-div-icon leaflet-editing-icon',
                                    }),
                                    touchIcon: new L.DivIcon({
                                        iconSize: new L.Point(12, 12), //was 20
                                        className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
                                    })
                          });            
                        L.Edit.Poly = L.Edit.Poly.extend(
                           {
                                    icon: new L.DivIcon({
                                      iconSize: new L.Point(8, 8),
                                      className: 'leaflet-div-icon leaflet-editing-icon',
                                    }),
                                    touchIcon: new L.DivIcon({
                                        iconSize: new L.Point(12, 12), //was 20
                                        className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
                                    })
                          });            
                        L.Draw.Polyline = L.Draw.Polyline.extend(
                           {
                                    icon: new L.DivIcon({
                                      iconSize: new L.Point(8, 8),
                                      className: 'leaflet-div-icon leaflet-editing-icon',
                                    }),
                                    touchIcon: new L.DivIcon({
                                        iconSize: new L.Point(12, 12), //was 20
                                        className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
                                    })
                          });            
                          */
                        that.map_draw = new L.Control.Draw({
                            position: 'topleft',
                            edit: {
                                featureGroup: that.drawnItems,
                                poly: {
                                    allowIntersection: false
                                }
                            },
                            draw: {
                                polygon: {
                                    allowIntersection: false,
                                    showArea: true,
                                    shapeOptions: {
                                        //color: '#bada55'
                                    },
                                    drawError: {
                                        color: '#e1e100', // Color the shape will turn when intersects
                                        message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                                    },
                                },
                                polyline: {
                                    shapeOptions: {
                                        //color: '#f357a1',
                                        weight: 4
                                    }                                    
                                },
                                circlemarker: false,
                                rectangle: {
                                    shapeOptions: {
                                        clickable: true
                                    }
                                }                                
                            }
                        }); 
                        
                        that.nativemap.tb_del = new L.EditToolbar.Delete(that.nativemap, {featureGroup: that.drawnItems});
                        that.nativemap.tb_del.enable();

                        /*                        
                        L.Map.addInitHook('addHandler', 'tb_del', L.EditToolbar.Delete, {featureGroup: that.drawnItems});
                        that.nativemap.tb_del.enable();
                        */
                        
                        
                        //adds  new shape to drawnItems
                        that.nativemap.on(L.Draw.Event.CREATED, function (e) {
                            var layer = e.layer;
                            that.drawnItems.addLayer(layer);
                            
                            that.options.ondrawend.call(that, e);
                        });        
                        that.nativemap.on('draw:drawstart', function (e) {
                               if($.isFunction(that.options.ondraw_addstart)){
                                   that.options.ondraw_addstart.call(that, e);
                               }
                        });
                        that.nativemap.on('draw:editstart', function (e) {
                               if($.isFunction(that.options.ondraw_editstart)){
                                   that.options.ondraw_editstart.call(that, e);
                               }
                        });
                        that.nativemap.on('draw:edited', function (e) {
                               if($.isFunction(that.options.ondrawend)){
                                   that.options.ondrawend.call(that, e);
                               }
                        });                    
                    }
                    
                }
                
                if(!that['map_'+val]._map) that['map_'+val].addTo(that.nativemap);
            }else if(that['map_'+val]){
                that['map_'+val].remove();
            }

        }
        __controls('legend');
        __controls('zoom');
        __controls('bookmark');
        __controls('geocoder');
        __controls('print');
        if(!this.options.isPublished) __controls('publish');
        //__controls('scale');
        if(controls.indexOf('draw')>=0) __controls('draw');
        
            
        //   legend: [basemaps,search,mapdocs|onedoc]
        this.mapManager.updatePanelVisibility(__splitval(params['legend']));
        
        // basemap: name of initial basemap
        if(params['basemap']){
            this.mapManager.loadBaseMap( params['basemap'] );  
        }else{
            this.mapManager.loadBaseMap( 0 );  
        }
        
        // extent: fixed extent    
    },
    
    
    /**
    * show/hide panels map and timeline
    */
    _updatePanels: function(){
        
        var ismap = true, no_time_data = (this.timeline_groups.length==0);
        
        if(this.is_timeline_disabled!==(this.notimeline || no_time_data)){

            this.is_timeline_disabled=(this.notimeline || no_time_data);
            
            if(this.options.element_layout){
            
                var layout_opts = {};
                var th;
                if(this.notimeline || no_time_data){
                    layout_opts.south__size = 0;
                    layout_opts.south__spacing_open = 0;
                    layout_opts.south__spacing_closed = 0;
                }else {
                    th = Math.floor($(this.options.element_layout).height()*0.2);
                    layout_opts.south__size = th>200?200:th;
                    layout_opts.south__spacing_open = 7;
                    layout_opts.south__spacing_closed = 12;
                    layout_opts.center__minHeight = 30;
                    layout_opts.center__minWidth = 200;
                }
                var mylayout = $(this.options.element_layout).layout(layout_opts);
                
                if(this.notimeline || no_time_data){
                    mylayout.hide('south');
                }else{
                    mylayout.show('south');
                    mylayout.sizePane('south', th)    
                }
                
            }

        }
    },
    
//----------------------- draw routines ----------------------    
    
    //
    //  detects format and calls appropriate method
    // 
    drawLoadGeometry: function(data){

        if (!data) {
            return;   
        }
        
        gjson = window.hWin.HEURIST4.util.isJSON(data);

        if(gjson===false){
            this.drawLoadWKT(data, false);        
        }else{
            this.drawLoadJson(gjson, false);
        }
        
        
    },
    
    //
    //
    //
    drawLoadWKT: function(wkt, force_clear){
        
        if (! wkt) {
            //wkt = decodeURIComponent(document.location.search);
            return;
        }
        
        //remove heurist prefix with type
        var typeCode;
        var matches = wkt.match(/\??(\S+)\s+(.*)/);
        if (! matches) {
            return;
        }
        if(matches.length>2){
            typeCode = matches[1];
            if( (['m','pl','l','c','r']).indexOf(typeCode)>=0 ){
                wkt = matches[2];    
            }
        }else{
            wkt = matches[1];
        }        
        
        var gjson = parseWKT(wkt); //see wellknown.js
        
        if(gjson && (gjson.coordinates || gjson.geometries)){
            this.drawLoadJson(gjson, force_clear);
        }else if(force_clear){
            this.drawClearAll();
        }else{
             window.hWin.HEURIST4.msg.showMsgFlash('It appears that WKT is not recognized'); 
        }        
        
    },
    
//{"type":"LineString","coordinates":[[-0.140634,51.501877],[-0.130785,51.525804],[-0.129325,51.505243],[-0.128982,51.5036]]}}    
    
    //
    // json -> map - adds draw items to map
    //
    drawLoadJson: function( gjson, force_clear ){
        
            gjson = window.hWin.HEURIST4.util.isJSON(gjson);

            if(gjson!==false || force_clear){
                this.drawClearAll();    
            } 
            
            if(gjson===false){
                window.hWin.HEURIST4.msg.showMsgFlash('GeoJSON is not valid');    
                return;
            }

            var that = this;
            
            var l2 = L.geoJSON(gjson);
            
            function __addDrawItems(lg){
                if(lg instanceof L.LayerGroup){
                    lg.eachLayer(function (layer) {
                        __addDrawItems(layer);    
                    });
                }else{
                    
                    function __addDrawItem(item){
                            that.nativemap.addLayer(item);                        
                            that.drawnItems.addLayer(item);
                            item.editing.enable();
                    }
                    
                    if(lg instanceof L.Polygon){
                        
                        var coords = lg.getLatLngs();

                        if(coords.length>0 && coords[0] instanceof L.LatLng ){
                            coords.push(coords[0]);
                            __addDrawItem(new L.Polygon(coords));
                        }else{
                            if($.isArray(coords) && coords.length==1) coords = coords[0];
                            if(coords.length>0 && coords[0] instanceof L.LatLng ){
                                coords.push(coords[0]);
                                __addDrawItem(new L.Polygon(coords));
                            }else{
                                for(var i=0;i<coords.length;i++){
                                      coords[i].push(coords[i][0]);
                                      __addDrawItem(new L.Polygon(coords[i]));
                                }
                            }
                        }
                        
                        
                    }else if(lg instanceof L.Polyline){
                        var coords = lg.getLatLngs();
                        if(coords.length>0 && coords[0] instanceof L.LatLng ){
                            __addDrawItem(new L.Polyline(coords));
                        }else{
                            for(var i=0;i<coords.length;i++){
                                  __addDrawItem(new L.Polyline(coords[i]));
                            }
                        }
                        
                    }else{ 

                        that.nativemap.addLayer(lg);
                        that.drawnItems.addLayer(lg);
                        lg.editing.enable();
                    }
                        
                }                
            }
            __addDrawItems(l2);
            
            this.drawZoomTo();

    },    

    drawZoomTo: function(){
        
            var bounds = this.drawnItems.getBounds();
            if(!(bounds instanceof L.LatLngBounds)){
                if($.isArray(bounds) && bounds.length>1 ){
                    bounds = L.latLngBounds(bounds);
                }
            }
            if(bounds && bounds.isValid()) this.nativemap.fitBounds(bounds);                
            
            //setTimeout(function(){
            //},300);        
        
    },

    //
    // remove all drawn items fromm map
    // 
    drawClearAll: function(){
        if(this.drawnItems) {
            this.drawnItems.eachLayer(function (layer) {
                layer.remove();
            });
            this.drawnItems.clearLayers();
        }    
    },

    //
    //
    //
    drawGetWkt: function( show_warning ){
        
        var res = '', msg = null;
                    
        var gjson = mapping.mapping( 'drawGetJson');
        
        gjson = window.hWin.HEURIST4.util.isJSON(gjson);
                
        if(gjson===false || !window.hWin.HEURIST4.util.isGeoJSON(gjson)){
            msg = 'You have to draw a shape';
        }else{
            var res = stringifyMultiWKT(gjson);
            
            if(window.hWin.HEURIST4.util.isempty(res)){
                msg = 'Cannot convert GeoJSON to WKT. '
                +'Please click "Get Geometry", copy and send GeoJSON to development team';
            }
        }
        
        if(msg!=null){
            if(show_warning){
                    window.hWin.HEURIST4.msg.showMsgDlg(msg);    
            }else{
                    res = msg;
            }
        }
        
        return res;
    },
    
    //
    // returns current drawn items as geojson
    //
    drawGetJson: function( e ){
    
        var res_gjson = []; //reset
        
        function __to_gjson( layer ){
            
            if(layer instanceof L.Circle){
               //L.Circle.toPolygon(layer, 40, this.nativemap)
               var points = layer.toPolygon(40, this.nativemap);
               lr = L.polygon(points);
               
            /*}else if(layer instanceof L.Rectangle){
               
               var points = layer.toPolygon(40, this.nativemap);
               lr = L.polygon(points);
            */    
            }else{ 
                lr = layer;
            }
            
            var gjson = lr.toGeoJSON(6);
            if(window.hWin.HEURIST4.util.isJSON(gjson)){
                res_gjson.push(gjson);
            }        
        }
        
        if(e){
            var layers = e.layers;
            if(layers){
                layers.eachLayer(__to_gjson);
            }else if(e.layer) {
               __to_gjson(e.layer);
            }
        }else if(this.drawnItems) {
            this.drawnItems.eachLayer(__to_gjson);
        } 
        
        if(res_gjson.length==1){
            res_gjson = res_gjson[0];
        }else if (res_gjson.length>1) {
            res_gjson = {"type": "FeatureCollection", "features": res_gjson};
        }
        
        return res_gjson;
    },
    
    
    //
    // set draw style
    //
    drawSetStyle: function(){

         var that = this;
        
         var current_value = this.map_draw_style;
         window.hWin.HEURIST4.ui.showEditSymbologyDialog(current_value, 2, function(new_style){
            
            that.map_draw_style = new_style; 
             
            that.map_draw.setDrawingOptions({
                polygon: {shapeOptions: new_style},
                rectangle: {shapeOptions:new_style},
                circle: {shapeOptions:new_style}
            });                
            
            var new_style2 = window.hWin.HEURIST4.util.cloneJSON(new_style);
            new_style2.fill = false;
                            
            that.map_draw.setDrawingOptions({
                polyline: {shapeOptions:new_style2},
            });

            that.drawnItems.eachLayer(function (layer) {
                if(layer instanceof L.Polyline ){
                      layer.setStyle(new_style2);
                }else if(layer instanceof L.Polygon ){
                      layer.setStyle(new_style);
                }
            });

            
            
         });

    }
                       
    
    
});