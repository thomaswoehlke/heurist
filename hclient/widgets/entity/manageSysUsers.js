/**
* manageSysUsers.js - main widget to manage sysUGrps users
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


$.widget( "heurist.manageSysUsers", $.heurist.manageEntity, {
   
    _entityName:'sysUsers',

    //
    //
    //    
    _init: function() {
        
        this.options.layout_mode = 'short';
        this.options.use_cache = false;
        //this.options.edit_mode = 'popup';
        
        //this.options.select_return_mode = 'recordset';
        this.options.edit_need_load_fullrecord = true;
        this.options.edit_height = 640;
        this.options.height = 640;

        if(this.options.edit_mode=='editonly'){
            this.options.edit_mode = 'editonly';
            this.options.select_mode = 'manager';
            this.options.layout_mode = 'editonly';
            this.options.width = 790;
            //this.options.height = 640;
        }else
        //for selection mode set some options
        if(this.options.select_mode!='manager'){
            this.options.width = (isNaN(this.options.width) || this.options.width<750)?750:this.options.width;                    
            //this.options.edit_mode = 'none'
        }
    
        this._super();
    },
    
    //  
    // invoked from _init after load entity config    
    //
    _initControls: function() {
        
        if(!this._super()){
            return false;
        }
        
        if(this.options.edit_mode=='editonly'){
            this._initEditorOnly();
            return;
        }
        
        //update dialog title
        if(this.options.isdialog){ // &&  !this.options.title
            var title = null;
            var usr_ID = 0;
            if(this.options.ugl_GroupID>0){
                usr_ID = this.options.ugl_GroupID;
                title = 'Manage Users of Workgroup #'+this.options.ugl_GroupID+': ';
            }else if(this.options.ugl_GroupID<0){
                usr_ID = Math.abs(this.options.ugl_GroupID);
                title = 'Select Users to add to Workgroup #'+usr_ID+': ';
            }else{
                if(window.hWin.HAPI4.is_admin()){
                    title = 'Manage All Users as Database Administrator';    
                }else{                    
                    usr_ID = window.hWin.HAPI4.currentUser['ugr_ID'];
                    title = 'Manage workgroups for user #'+window.hWin.HAPI4.currentUser['ugr_ID']+': ';    
                }
            }
            
            if(usr_ID>0 && title){
                var that = this;
                function __set_dlg_title(res){
                    if(res && res.status==window.hWin.HAPI4.ResponseStatus.OK){
                        that._as_dialog.dialog('option','title', title+res.data[usr_ID]);    
                    }
                } 
                window.hWin.HAPI4.SystemMgr.usr_names({UGrpID: usr_ID}, __set_dlg_title);
            }else{
                this._as_dialog.dialog('option','title', title);    
            }
        }
        
        // init search header
        this.searchForm.searchSysUsers(this.options);
        
        var iheight = 6;
        if(this.options.edit_mode=='inline'){            
            iheight = iheight + 6;
        }
        this.searchForm.css({'height':iheight+'em'});
        this.recordList.css({'top':iheight+0.5+'em'});
        //init viewer 
        var that = this;
        
        if(this.options.select_mode=='manager'){
            this.recordList.parent().css({'border-right':'lightgray 1px solid'});
            
            
            this.recordList.resultList('option','rendererHeader',
                    function(){
                    var s = '<div style="width:60px"></div><div style="width:3em">ID</div>'
                +'<div style="width:7em">Name</div>'
                +'<div style="width:12em;">Full name</div>'
                +'<div style="width:7em;border:none">Institution/Organisation</div>'
                +'<div style="position:absolute;right:76px;width:80px;border-left:1px solid gray">'
                        +'Membership</div>';
                        
                        if (window.hWin.HAPI4.is_admin()){
                            s = s+'<div style="position:absolute;right:4px;width:60px">Edit</div>';
                        }
                        
                        return s;
                    }
                );
            //this.recordList.resultList('applyViewMode');
        }

        this._on( this.searchForm, {
                "searchsysusersonresult": this.updateRecordList,
                "searchsysusersonadd": function() { this.addEditRecord(-1); },
                "searchsysusersonfind": function() { 
                    
                        var ugl_GroupID = this.searchForm.find('#input_search_group').val(); 
                    
                        var options = {select_mode: 'select_multi',
                                ugl_GroupID: -ugl_GroupID,
                                edit_mode:'none',
                                title: ("Select Users to add to Workgroup #"+ugl_GroupID),
                                onselect:function(event, data){
                        
                                    if(data && window.hWin.HEURIST4.util.isArrayNotEmpty(data.selection))
                                    {
                                    
                                        var request = {};
                                        request['a']        = 'action'; //batch action
                                        request['entity']   = 'sysGroups';
                                        request['role']     = 'member';
                                        request['userIDs']  = data.selection;
                                        request['groupID']  = ugl_GroupID;
                                        request['request_id'] = window.hWin.HEURIST4.util.random();
                                        
                                        window.hWin.HAPI4.EntityMgr.doRequest(request, 
                                            function(response){
                                                if(response.status == window.hWin.HAPI4.ResponseStatus.OK){
                                                    //reload
                                                    that.searchForm.searchSysUsers('startSearch');
                                                    
console.log('ON_CRED???');                                                    
                                                    if(data.selection.indexOf(window.hWin.HAPI4.currentUser['ugr_ID'])>=0){
                                                        window.hWin.HAPI4.currentUser['ugr_Groups'][ugl_GroupID] = 'member';
                                                        $(window.hWin.document).trigger(window.hWin.HAPI4.Event.ON_CREDENTIALS); 
                                                    }
                                                    
                                                }else{
                                                    window.hWin.HEURIST4.msg.showMsgErr(response);      
                                                }
                                            });
                                    
                                    }                                    
                                }};                    
                        
                        window.hWin.HEURIST4.ui.showEntityDialog('sysUsers', options);
                    }
                });
        

        this._on( this.recordList, {
            "resultlistonpagerender": function(event){

                //init role dropdown selector
                this.recordList.find('select.user-role')
                .each(function(idx,item){$(item).val($(item).attr('data-value'))})
                .change(function(event){

                    var ugl_GroupID = that.searchForm.find('#input_search_group').val(); 
                    if(!(ugl_GroupID>0)) return;
                    /*if(!(ugl_GroupID>0)) {
                        
                        var that = this;
                        this.recordList.find('.user-list-edit')
                        .each(function(idx,item){
                            $(item).attr('title','Edit user membership');
                        })
                        .click(function(event){
                            alert('Need open group mgr')
                        });
                        return;   
                    } */

                    //apply new role to user
                    
                    var selector = $(event.target);
                    var usr_ID = selector.parents('.recordDiv').attr('recid');  
                    var newRole = selector.val();

                    var request = {};
                    request['a']        = 'action';
                    request['entity']   = 'sysGroups';
                    request['role']     = newRole;
                    request['userIDs']  = usr_ID;
                    request['groupID']  = ugl_GroupID;
                    request['request_id'] = window.hWin.HEURIST4.util.random();

                    window.hWin.HAPI4.EntityMgr.doRequest(request, 
                        function(response){             
                            if(response.status == window.hWin.HAPI4.ResponseStatus.OK){
                                //reload
                                //that.searchForm.searchSysUsers('startSearch');
                                if(newRole=='remove'){
                                    var recset = that.recordList.resultList('getRecordSet');
                                    recset.removeRecord(usr_ID);
                                    that.recordList.resultList('refreshPage');  
                                    window.hWin.HEURIST4.msg.showMsgFlash('User removed from group');
                                }else{
                                    selector.attr('data-value', newRole);
                                    window.hWin.HEURIST4.msg.showMsgFlash('New role applied');      
                                }

                                if(usr_ID==window.hWin.HAPI4.currentUser['ugr_ID']){
                                    if(newRole=='remove'){
                                        window.hWin.HAPI4.currentUserRemoveGroup(ugl_GroupID);
                                    }else{
                                        window.hWin.HAPI4.currentUser['ugr_Groups'][ugl_GroupID] = newRole;
                                    }
                                    $(window.hWin.document).trigger(window.hWin.HAPI4.Event.ON_CREDENTIALS); 
                                }
                                
                            }else{
                                //restore current value
                                selector.val( selector.attr('data-value') );
                                window.hWin.HEURIST4.msg.showMsgErr(response);      
                            }
                    });
                });

                //manage membership of user in all groups
                this.recordList.find('.user-list-edit')
                .click(function(event){
                    var user_ID = $(event.target).parents('.recordDiv').attr('recid');

                    var options = {select_mode: 'manager',
                        ugl_UserID: user_ID,
                        edit_mode:'popup',
                        title: ("Manage Membership for User #"+user_ID),
                        //before close - count for membership and refresh
                        beforeClose:function(){
                            
                            //count user memebrship in groups
                            var request = {
                                'a'          : 'search',
                                'entity'     : 'sysUsers',
                                'details'    : 'count',
                                'ugr_ID'     : user_ID
                            };
                            window.hWin.HAPI4.EntityMgr.doRequest(request, 
                                function(response){
                                    if(response.status == window.hWin.HAPI4.ResponseStatus.OK){
                                        var resp = new hRecordSet( response.data );
                                        var rec_updated = resp.getFirstRecord();
                                        var cnt = resp.fld(rec_updated, 'ugr_Member');
                                        if(cnt>0){
                                            var record = that.getRecordSet().getById(user_ID);
                                            that.getRecordSet().setFld(record, 'ugr_Member', cnt);
                                            that.recordList.resultList('refreshPage');  
                                            $('body').find('div[id^="heurist-dialog-SysGroups-"]').manageSysGroups('closeDialog', true);
                                        }else{
                                            window.hWin.HEURIST4.msg.showMsgErr('User must belong to one group at least');
                                        }
                                    }else{
                                        window.hWin.HEURIST4.msg.showMsgErr(response);
                                    }
                                }
                            );
                            return false;
                        }
                    };

                    window.hWin.HEURIST4.ui.showEntityDialog('sysGroups', options);
                });


            }
        });

        
        return true;
    },
    
    _initEditorOnly: function(){
        
            //load user for given record id
            if(this.options.usr_ID>0){
                    var request = {};
                    request['ugr_ID']  = this.options.usr_ID;
                    request['a']          = 'search'; //action
                    request['entity']     = this.options.entity.entityName;
                    request['details']    = 'full';
                    request['request_id'] = window.hWin.HEURIST4.util.random();
                    
                    //request['DBGSESSID'] = '423997564615200001;d=1,p=0,c=0';

                    var that = this;                                                
                    
                    window.hWin.HAPI4.EntityMgr.doRequest(request, 
                        function(response){
                            if(response.status == window.hWin.HAPI4.ResponseStatus.OK){
                                var recset = new hRecordSet(response.data);
                                if(recset.length()>0){
                                    that.updateRecordList(null, {recordset:recset});
                                    that.addEditRecord( recset.getOrder()[0] );
                                }
                                else {
                                    //nothing found - add new bookmark
                                    that.addEditRecord(-1);
                                }                            
                            }else{
                                window.hWin.HEURIST4.msg.showMsgErr(response);
                                that.closeEditDialog();
                            }
                        });        
                        
            }else{
                this.addEditRecord(-1);
            }
    }

    //----------------------
    //
    //
    //
    , _recordListItemRenderer:function(recordset, record){
        
        function fld(fldname){
            return window.hWin.HEURIST4.util.htmlEscape(recordset.fld(record, fldname));
        }
        function fld2(fldname, col_width){
            swidth = '';
            if(!window.hWin.HEURIST4.util.isempty(col_width)){
                swidth = ' style="width:'+col_width+'"';
            }
            return '<div class="item" '+swidth+'>'+window.hWin.HEURIST4.util.htmlEscape(recordset.fld(record, fldname))+'</div>';
        }
        
        //ugr_ID,ugr_Type,ugr_Name,ugr_Description, ugr_eMail,ugr_FirstName,ugr_LastName,ugr_Enabled,ugl_Role
        
        var recID   = fld('ugr_ID');
        
        //var recTitle = fld2('ugr_ID','3em')+fld2('ugr_Name','10em')+fld('ugr_FirstName')+' '+fld('ugr_LastName');
        var recTitleHint = fld('ugr_Organisation');
        
        var recTitle = fld2('ugr_ID','3em')
                    + '<a class="item" style="width:8em" href="mailto:'+fld('ugr_eMail')+'" title="'+fld('ugr_eMail')+'">'
                    + fld('ugr_Name')+'</a>'
                    + '<div class="item" style="width:15em">'+fld('ugr_FirstName')+' '+fld('ugr_LastName')+'</div>'
                    + fld2('ugr_Organisation','8em');
        
        var recOpacity = (fld('ugr_Enabled')=='y')?1:0.3;
        
        var rtIcon = window.hWin.HAPI4.getImageUrl(this._entityName, 0, 'icon');
        //var rtThumb = window.hWin.HAPI4.getImageUrl(this._entityName, 0, 'thumb');
        var recThumb = window.hWin.HAPI4.getImageUrl(this._entityName, recID, 'thumb', 2, this.options.database);
        
        var html_thumb = '<div class="recTypeThumb" style="background-image: url(&quot;'+recThumb+'&quot;);opacity:'+recOpacity+'">'
        +'</div>';

        var html = '<div class="recordDiv" id="rd'+recID+'" recid="'+recID+'">'
        + html_thumb
        + '<div class="recordSelector"><input type="checkbox" /></div>'
        + '<div class="recordIcons" style="min-width:16px;">' //recid="'+recID+'" bkmk_id="'+bkm_ID+'">'
        +     '<img src="'+window.hWin.HAPI4.baseURL+'hclient/assets/16x16.gif'
        +     '" style="background-image: url(&quot;'+rtIcon+'&quot;);opacity:'+recOpacity+'">'
        + '</div>'
        + '<div class="recordTitle" title="'+recTitleHint+'">'
        +     recTitle
        + '</div>';
        
        // add edit/remove action buttons
        if(this.options.select_mode=='manager' && this.options.edit_mode=='popup'){
        
            var ugl_GroupID = this.searchForm.find('#input_search_group').val(); 
            if(window.hWin.HAPI4.is_admin() && !(ugl_GroupID>0)){  //all groups - show count of groups where user is a member
                html = html 
                    + '<div class="rec_actions user-list user-list-edit" style="right:80px;width:50px;" title="Edit participation of user in groups">'
                    + fld('ugr_Member') + '<span class="ui-icon ui-icon-pencil" style="font-size:0.8em;right:2px"/></div>';
            }
            
            
            var ugl_GroupID = this.searchForm.find('#input_search_group').val();
                
            if(ugl_GroupID>0){
                html = html + '<div class="rec_actions user-list" style="top:4px;width:140px;">'
                if(recID==2 && ugl_GroupID==window.hWin.HAPI4.sysinfo.db_managers_groupid){
                    html = html + '<div style="min-width:78px;text-align:center">admin</div>';
                }else 
                if(window.hWin.HAPI4.has_access(ugl_GroupID)){//current user is admin of given group
                    html = html 
                        + '<select title="Role" style="min-width:70px;text-align:center;margin:0 4px;" class="user-role" data-value="'
                        + fld('ugl_Role')+'">'
                        +'<option>admin</option><option>member</option><option>remove</option></select>';
                    
                }else{
                    html = html 
                        + '<div title="Role" style="min-width:78px;text-align:center">'
                        + fld('ugl_Role')+'</div>';
                }
            }else{
                html = html + '<div class="rec_actions user-list" style="top:4px;width:60px;">'
                //placeholder
                //html = html + '<div style="min-width:78px;"></div>';
            }
            
            if( window.hWin.HAPI4.is_admin() ) {//current user is admin of database managers
                
                html = html 
                    + '<div title="Click to edit user" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only" role="button" aria-disabled="false" data-key="edit" style="height:16px">'
                    +     '<span class="ui-button-icon-primary ui-icon ui-icon-pencil"></span><span class="ui-button-text"></span>'
                    + '</div>&nbsp;&nbsp;';
               if(recID != 2){ //owner
                    html = html      
                    + '<div title="Click to delete user" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only" role="button" aria-disabled="false" data-key="delete" style="height:16px">'
                    +     '<span class="ui-button-icon-primary ui-icon ui-icon-circle-close"></span><span class="ui-button-text"></span>'
                    + '</div>';
               }
               
            }else{
               /*
                html = html 
                    + '<div title="Status: not admin - locked" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only" role="button" aria-disabled="false" style="height:16px">'
                    +     '<span class="ui-button-icon-primary ui-icon ui-icon-lock"></span><span class="ui-button-text"></span>'
                    + '</div>&nbsp;&nbsp;';
               */
            }
            html = html + '</div>';
            
        }
        

        html = html + '</div>';

        return html;
        
    },
    
    //overwritten    
    _recordListGetFullData:function(arr_ids, pageno, callback){

        var request = {
                'a'          : 'search',
                'entity'     : this.options.entity.entityName,
                'details'    : 'list',
                'pageno'     : pageno,
                'db'         : this.options.database  
                
        };
        var ugl_GroupID = this.searchForm.find('#input_search_group').val();
        if(ugl_GroupID>0){
            request['ugl_GroupID'] = ugl_GroupID;
        }
        
        
        request[this.options.entity.keyField] = arr_ids;
        window.hWin.HAPI4.EntityMgr.doRequest(request, callback);
    },
    
    
    //-----
    // adding group ID value for new user
    //
    _afterInitEditForm: function(){

        this._super();
        
        var ugl_GroupID = this.searchForm.find('#input_search_group').val();
        if(ugl_GroupID>0 && !this._currentEditRecordset){ //insert       

            var ele = this._editing.getFieldByName('ugl_GroupID');
            ele.editing_input('setValue', ugl_GroupID);
            //hide save button
            if(this._toolbar){
                this._toolbar.find('#btnRecSave').css('visibility', 'visible');
            }
        }else
        //hide after edit init btnRecRemove for dbowner (user #2)
        if(this._currentEditID==2 || !window.hWin.HAPI4.is_admin()){
            var ele = this._toolbar;
            ele.find('#btnRecRemove').hide();
        }
        
        if(!window.hWin.HAPI4.is_admin()){
            var input_ele = this._editing.getFieldByName('ugr_Enabled');
            input_ele.hide();
            //input_ele.editing_input('f', 'rst_Display', 'hidden');
        }

    },    
    
    // update list after save (refresh)
    //
    _afterSaveEventHandler: function( recID, fieldvalues ){

        // close on addition of new record in select_single mode    
        if(this._currentEditID<0 && this.options.select_mode=='select_single'){
            
                this._selection = new hRecordSet();
                //{fields:{}, order:[recID], records:[fieldvalues]});
                this._selection.addRecord(recID, fieldvalues);
                this._selectAndClose();
                return;        
        }if (this._currentEditID<0) {
            fieldvalues['ugl_Role'] = 'member';    
        }
        
        this._super( recID, fieldvalues );
        this.getRecordSet().setRecord(recID, fieldvalues);
        
        
        if(this.options.edit_mode == 'editonly'){
            this.closeDialog(true); //force to avoid warning
        }else{
            this.recordList.resultList('refreshPage');  
        }
    },
});
