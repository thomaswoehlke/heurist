<?php

/**
* Main script initializing Heurist layout and performing initial search of parameter q is defined
*
* @package     Heurist academic knowledge management system
* @link        http://HeuristNetwork.org
* @copyright   (C) 2005-2016 University of Sydney
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
define('PDIR','');

require_once(dirname(__FILE__)."/hclient/framecontent/initPage.php");
?>

        <!-- it is needed in preference dialog -->
        <link rel="stylesheet" type="text/css" href="ext/fancytree/skin-themeroller/ui.fancytree.css" />

        <script type="text/javascript" src="ext/layout/jquery.layout-latest.js"></script>

        <!-- Gridster layout is an alternative similar to Windows tiles, not useful except with small
        number of widgets. Currently it is commented out of the code in layout_default.js -->

        <!-- for gridster layout, development version - remove comments to use
        <link rel="stylesheet" type="text/css" href="ext/gridster/jquery.gridster.css" />
        <script type="text/javascript" src="ext/gridster/utils.js"></script>
        <script type="text/javascript" src="ext/gridster/jquery.collision.js"></script>
        <script type="text/javascript" src="ext/gridster/jquery.coords.js"></script>
        <script type="text/javascript" src="ext/gridster/jquery.draggable.js"></script>
        <script type="text/javascript" src="ext/gridster/jquery.gridster.js"></script>
        -->
        <!-- for gridster layout, production (minimised) version - remove comments to use
        <link rel="stylesheet" type="text/css" href="ext/gridster/jquery.gridster.all.css" />
        <script type="text/javascript" src="ext/gridster/jquery.gridster.all.js"></script>
        -->

        <script type="text/javascript" src="ext/js/jquery.ui-contextmenu.min.js"></script>
        <!-- script type="text/javascript" src="ext/js/moment.min.js"></script -->
        <script type="text/javascript" src="ext/js/date.format.js"></script>

        <!-- init layout and loads all apps.widgets -->
        <script type="text/javascript" src="hclient/core/layout.js"></script>
        <!-- array of possible layouts -->
        <script type="text/javascript" src="layout_default.js"></script>
        
        <!-- script type="text/javascript" src="js/hintDiv.js"></script -->

        <script type="text/javascript" src="hclient/widgets/topmenu/help_tips.js"></script>

        <script type="text/javascript" src="common/js/temporalObjectLibrary.js"></script>

        <!-- DOCUMENTATION TODO: explain this -->
        <!-- these scripts are loaded explicitely - for debug purposes -->
        <script type="text/javascript" src="hclient/widgets/viewers/recordListExt.js"></script>
        <script type="text/javascript" src="hclient/widgets/search/search_faceted.js"></script>
        <script type="text/javascript" src="hclient/widgets/search/search_faceted_wiz.js"></script>
        <script type="text/javascript" src="hclient/widgets/viewers/app_timemap.js"></script>
        <script type="text/javascript" src="hclient/widgets/search/search.js"></script>
        <script type="text/javascript" src="hclient/widgets/topmenu/mainMenu.js"></script>
        <script type="text/javascript" src="hclient/widgets/search/svs_edit.js"></script>
        <script type="text/javascript" src="hclient/widgets/search/svs_list.js"></script>
        <script type="text/javascript" src="hclient/widgets/viewers/resultList.js"></script>

        <script type="text/javascript" src="hclient/widgets/digital_harlem/dh_search.js"></script>
        <script type="text/javascript" src="hclient/widgets/digital_harlem/dh_maps.js"></script>
        <script type="text/javascript" src="hclient/widgets/viewers/connections.js"></script>

        <!-- DOCUMENTATION TODO: What are these, why are they commented out -->
        <!-- these widgets are loaded dynamically, but for debug they should be loaded explicitely

        @TODO: FOLLOWING FILE IS NOT IN THIS LOCATION
        <script type="text/javascript" src="hclient/widgets/profile/profile.js"></script>

        <script type="text/javascript" src="hclient/widgets/viewers/recordDetails.js"></script>
        <script type="text/javascript" src="hclient/widgets/topmenu/mainMenu.js"></script>
        script type="text/javascript" src="hclient/widgets/search.js"></script>
        <script type="text/javascript" src="hclient/widgets/rec_list.js"></script>
        <script type="text/javascript" src="hclient/widgets/pagination.js"></script>
        <script type="text/javascript" src="hclient/widgets/rec_list.js"></script>
        -->
        <!-- DEBUG -->

        <script type="text/javascript" src="hclient/widgets/profile/profile_login.js"></script>
        <script type="text/javascript" src="hclient/widgets/viewers/resultListMenu.js"></script>
        <script type="text/javascript" src="hclient/widgets/editing/editing_input.js"></script> <!-- move to common js???? -->
        <!-- todo: load dynamically
        <script type="text/javascript" src="hclient/widgets/editing/rec_search.js"></script>
        <script type="text/javascript" src="hclient/widgets/editing/rec_relation.js"></script>
        -->

        <!-- move to profile.js dynamic load -->
        <script type="text/javascript" src="ext/js/themeswitchertool.js"></script>
        
        <!--  media viewer -->
        <script type="text/javascript" src="ext/yoxview/yoxview-init.js"></script>

        <script type="text/javascript">

           function onPageInit(success){
                
                if(!success) return;
                
                // OLD H3 stuff
                window.HEURIST.baseURL_V3  = window.HAPI4.basePathV3;
                window.HEURIST.loadScript(window.HAPI4.basePathV3+"common/php/loadUserInfo.php?db=" + window.HAPI4.database);
                window.HEURIST.iconBaseURL = window.HAPI4.iconBaseURL;
                window.HEURIST.database = {  name: window.HAPI4.database };
                
                //
                // cfg_widgets and cfg_layouts are defined in layout_default.js
                //
                top.HAPI4.LayoutMgr.init(cfg_widgets, cfg_layouts);

                top.HAPI4.LayoutMgr.appInitAll( top.HAPI4.sysinfo['layout'], "#layout_panes");

                //perform search in the case that parameter "q" is defined
                var qsearch = '<?php echo str_replace("'","\'",@$_REQUEST['q']); ?>';
                if(!top.HEURIST4.util.isempty(qsearch)){
                    var qdomain = '<?=@$_REQUEST['w']?>';
                    if(top.HEURIST4.util.isempty(qdomain)) qdomain = 'a';
                    var request = {q: qsearch, w: qdomain, f: 'map', source:'init' };
                    //top.HEURIST4.query_request = request;
                    setTimeout(function(){
                            top.HAPI4.SearchMgr.doSearch(document, request);
                    }, 3000);
                }else if( top.HAPI4.sysinfo['layout']!='DigitalHarlem'){
                    var init_search = top.HEURIST.displayPreferences['defaultSearch'];
                    if(!top.HEURIST4.util.isempty(init_search)){
                        var request = {q: init_search, w: 'a', f: 'map', source:'init' };
                        setTimeout(function(){
                            top.HAPI4.SearchMgr.doSearch(document, request);
                        }, 3000);
                    }
                }        
                //definition of ABOUT dialog, called from Help > About, see content below
                $( "#heurist-about" ).dialog(
                    {
                        autoOpen: false,
                        height: 400,
                        width: 450,
                        modal: true,
                        resizable: false,
                        draggable: false,
                        hide: {
                            effect: "puff",
                            duration: 500
                        }
                    }
                );

                //if database is empty show welcome screen
                if(!(top.HAPI4.sysinfo.db_total_records>0)){
                    showTipOfTheDay(false);
                }

                $(document).trigger(top.HAPI4.Event.ON_SYSTEM_INITED, []);
                                                    
                
            }

        </script>

    </head>
    <body style="background-color:#c9c9c9">


        <!-- These are old H3 stuff - needed to support existing features in popups -->
        <script>top.installDirFromH4="<?=HEURIST_BASE_URL?>";</script>
        <script src="<?=HEURIST_BASE_URL?>common/js/utilsLoad.js"></script>
        <script src="<?=HEURIST_BASE_URL?>common/php/displayPreferences.php"></script>


        <div id="layout_panes" style="height:100%">
            &nbsp;
        </div>

        <div id="heurist-about" title="About" style="width:300px;display:none;">
            <div class='logo'></div>
            <h4>Heurist Academic Knowledge Management System</h4>
            <p style="margin-top: 1em;">version <?=HEURIST_VERSION?></p>
            <p style="margin-top: 1em;">
                author: Dr Ian Johnson<br/>
                programmers: Artem Osmakov, Tom Murtagh, Kim Jackson, Stephen White and others...</p>

            <p style="margin-top: 1em;">Copyright (C) 2005-2016 <a href="http://sydney.edu.au/arts/" target="_blank">University of Sydney</a></p>

            <p style="font-size: x-small;margin-top: 1em;">
                Licensed under the GNU General Public License Version 3.0 (the "License"); you may not use this file except
                in compliance with the License. You may obtain a copy of the License at
                <a href="http://www.gnu.org/licenses/gpl-3.0.txt" target="_blank">http://www.gnu.org/licenses/gpl-3.0.txt</a></p>

            <p style="font-size: x-small;margin-top: 1em;">
                Unless required by applicable law or agreed to in writing, software distributed under the License
                is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
                or implied. See the License for the specific language governing permissions and limitations under
                the License.
            </p>
        </div>

        <div id="heurist-dialog">
        </div>
    </body>
</html>
