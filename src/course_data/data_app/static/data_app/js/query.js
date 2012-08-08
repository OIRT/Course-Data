var CourseData = {
    numericOperatorOptions: ['<', '>', '=', '<=', '>='],
    stringOperatorOptions: ['equals', 'contains', 'startsWith'],

    workspaceId: null,
    dIndex: null,
    displayName: null,

    fullyLoaded: false,
    masterDataTable: null,
    indexNums: null, // Relates column title to index
    workspace: null,

    workspaceUpdater: null,
    workspaceUpdateTime: null,

    // Sets up a function that will push the current workspace up to the
    // server.  However, to avoid multiple requests in a brief period,
    // it waits until everything has settled for several seconds.
    postWorkspace: function() {
        CourseData.workspaceUpdateTime = new Date().getTime() + 6000;
        if(CourseData.workspaceUpdater === null) {
            CourseData.workspaceUpdater = setInterval(function() {
                if(new Date().getTime() > CourseData.workspaceUpdateTime) {
                    CourseData.workspace.save();
                    clearInterval(CourseData.workspaceUpdater);
                    CourseData.workspaceUpdater = null;
                }
            }, 1500);
        }
    },

    Workspace: can.Model({
        findOne : function(options) {
            return $.ajax({
                url: '/data/workspace/' + options.id + '/',
                cache: false // Required so IE doesn't cache the response
            });
        },
        update  : function(id, ws) {
            return $.post('/data/workspace/' + id + '/', JSON.stringify(ws));
        }
    }, {})
};

function compareValues(a, b, operator) {
    if( operator === "<" && parseFloat(a) < parseFloat(b) ||
        operator === ">" && parseFloat(a) > parseFloat(b) ||
        operator === "=" && parseFloat(a) === parseFloat(b) ||
        operator === "<=" && parseFloat(a) <= parseFloat(b) ||
        operator === ">=" && parseFloat(a) >= parseFloat(b) ||
        operator === "equals" && a === b ||
        operator === "contains" && a.indexOf(b) !== -1 ||
        operator === "startsWith" && a.indexOf(b) === 0) {
            return true;
    }else {
        return false;
    }
}

function checkCondition(oSettings, aData, iDataIndex, topLevel) {
    var masterVal = topLevel.find(".filterText").val();

    if(masterVal === "") return true;

    cellVal = aData[CourseData.indexNums[topLevel.find(".filterSelect").val()]];

    if(cellVal === "None") return true;

    operator = topLevel.find(".filterOperator").val();
    comp = compareValues(cellVal, masterVal, operator);
    if(topLevel.find(".notOperator").val() === "!") {
        return !comp;
    } else {
        return comp;
    }
}

function calculateIndexNums() {
    var oSettings = CourseData.masterDataTable.fnSettings();
    CourseData.indexNums = new Array(oSettings.aoColumns.length);
    for(i = 0; i < CourseData.indexNums.length; i++) {
        CourseData.indexNums[oSettings.aoColumns[i].sTitle] = i;
    }
}

function updateColumnWorkspace() {
    if(CourseData.fullyLoaded) {
        var aoColumns = CourseData.masterDataTable.fnSettings().aoColumns;
        var columns = [];
        for(var column in aoColumns) {
            if(aoColumns[column].bVisible) {
                columns.push(aoColumns[column].sTitle);
            }
        }

        CourseData.workspace.displays[CourseData.dIndex].attr("columns", columns);
    }
}

function updateColumnVisibility() {
    calculateIndexNums();
    $(".colVisCheckbox").each(function() {
        CourseData.masterDataTable.fnSetColumnVis(CourseData.indexNums[$(this).attr("name")], $(this).attr("checked") === "checked", false);
    });
    CourseData.masterDataTable.fnAdjustColumnSizing();

    updateColumnWorkspace();
}

function tableInitialized() {
    $.fn.dataTableExt.afnFiltering.push(
        function(oSettings, aData, iDataIndex) {
            calculateIndexNums();
            var andVor = $("#andVor").val() === "all";

            var show;
            if(andVor) {
                show = true;
            }else {
                show = false;
            }

            var filters = $("#filterDivContainer").find(".filterDiv");

            if(filters.size() > 0) {
                filters.each(function() {
                    var r = checkCondition(oSettings, aData, iDataIndex, $(this));
                    if(!r && andVor) {
                        show = false;
                        return;
                    }else if(r && !andVor) {
                        show = true;
                        return;
                    }
                });

                return show;
            }else {
                return true;
            }
        }
    );

    FiltersControl = can.Control({
        init: function(element, options) {
            this.element.html(can.view('static/data_app/views/filterList.ejs', {
                filters: this.options.filters
            }));
            $(".filterSelect").ufd();
        },

        '.notOperator change': function(el, ev) {
            var index = this.findIndex(el);
            this.options.filters[index].attr("not", (el.val() === "!"));
            this.updateWorkspace();
        },

        '.ufd select change': function(el, ev) {
            var index = this.findIndex(el);
            var oldSelection = this.options.filters[index].attr("selection");
            this.options.filters[index].attr("selection", el.val());
            this.updateOptions(el.parents(".filterDiv").find(".filterOperator"), oldSelection, index);
            this.updateWorkspace();
        },

        '.filterOperator change': function(el, ev) {
            var index = this.findIndex(el);
            this.options.filters[index].attr("operator", el.val());
            this.updateWorkspace();
        },

        '.filterText keyup': function(el, ev) {
            if(ev.keyCode == 13) {
                CourseData.masterDataTable.fnStandingRedraw();
            } else {
                var index = this.findIndex(el);
                this.options.filters[index].attr("text", el.val());
                this.updateWorkspace();
            }
        },

        '.deleteFilter click': function(el, ev) {
            var index = this.findIndex(el);
            this.options.filters.splice(index, 1);
            this.updateWorkspace();
            $(".filterSelect").ufd();
            CourseData.masterDataTable.fnStandingRedraw();
        },

        findIndex: function(el) {
            return $('.filterItem').index(el.closest('.filterItem'));
        },

        updateWorkspace: function() {
            CourseData.workspace.displays[CourseData.dIndex].attr("filters", this.options.filters);
        },

        // Updates the options in the operator dropdown based on the column selected
        // in the filter dropdown. In this way, it'll only show string-based operators
        // to filters with a string column selected, and numeric operators to filters
        // with a numeric column selected.  The operator lists are stored in CourseData.
        updateOptions: function(item, oldSelection, index) {
            var column = this.options.filters[index].attr("selection");
            var options;
            var aoColumns = CourseData.masterDataTable.fnSettings().aoColumns;
            if(CourseData.indexNums[oldSelection] === undefined || CourseData.indexNums[column] === undefined ||
                    aoColumns[CourseData.indexNums[column]].sType !== aoColumns[CourseData.indexNums[oldSelection]].sType) {

                if(CourseData.indexNums[column] !== undefined && aoColumns[CourseData.indexNums[column]].sType === "string") {
                    options = CourseData.stringOperatorOptions;
                }else {
                    options = CourseData.numericOperatorOptions;
                }

                item.children("option").remove();
                for(var option in options) {
                    item.append("<option " + (option === 0? "selected='selected'" : "") + ">" + options[option] + "</option>");
                }

                this.options.filters[index].attr("operator", options[0]);
            }
        }
    });

    AndVOrControl  = can.Control({
        init: function(element, options) {
            this.element.html(can.view('static/data_app/views/andVor.ejs', {
                andVor: this.options.andVor
            }));
        },

        '#andVor change': function(el, ev) {
            this.options.andVor.attr("andVor", (el.val() === "all"? "and" : "or"));
            CourseData.workspace.displays[CourseData.dIndex].attr("andVor", (el.val() === "all"? "and" : "or"));
        }
    });

    ColumnsControl = can.Control({
        // Make sure all of the columns are in the correct order, with correct visibility
        init: function(element, options) {
            var columns = this.options.columns;

            var oSettings = CourseData.masterDataTable.fnSettings();

            calculateIndexNums();

            // Goes through and puts all of the visible columns in the correct
            // order on the left, and the invisible columns on the right.
            for(i = 0; i < columns.length; i++) {
                var from = CourseData.indexNums[columns[i]];
                var to = i;
                toTitle = oSettings.aoColumns[to].sTitle;

                if(from !== to) {
                    CourseData.masterDataTable.fnColReorder(from, to);


                    // Updates our cache of column order
                    var min = (to < from)? to : from;
                    var max = (to > from)? to : from;
                    for(j = min; j <= max; j++) {
                        CourseData.indexNums[oSettings.aoColumns[j].sTitle] = j;
                    }
                }
            }

            // Hide the columns that aren't mentioned in the column list
            for(i = 0; i < oSettings.aoColumns.length; i++) {
                // The 'false' here is very important for performance on large sites.
                // Keeps it from redrawing the table for each column.
                CourseData.masterDataTable.fnSetColumnVis(i, (i < columns.length), false);
            }

            // Recalculates column widths now that we've removed a bunch
            CourseData.masterDataTable.fnAdjustColumnSizing();

            CourseData.masterDataTable.bind('column-reorder', this.updateColumns);

            // Set the sort types
            var aoColumns = oSettings.aoColumns;
            var aoData = oSettings.aoData;
            columnLoop: for(var column in aoColumns) {
                for(var i = 0; i < aoData.length; i++) {
                    var value = aoData[i]._aData[column];
                    if(value === "None" || value === "") {
                        continue;
                    }else {
                        if(/[a-zA-Z]/.test(value)) {
                            aoColumns[column].sType = "string";
                        }else {
                            aoColumns[column].sType = "course-numeric";
                        }
                        continue columnLoop;
                    }
                }
            }

            // Restore sorting order from workspace
            if(CourseData.workspace.displays[CourseData.dIndex].sorting) {
                oSettings.aaSorting[0][0] = CourseData.indexNums[CourseData.workspace.displays[CourseData.dIndex].sorting.column];
                oSettings.aaSorting[0][1] = CourseData.workspace.displays[CourseData.dIndex].sorting.direction;
                oSettings.aaSorting[0][2] = CourseData.workspace.displays[CourseData.dIndex].sorting.direction === "asc"? 0 : 1;
            }else {
                CourseData.workspace.displays[CourseData.dIndex].attr({sorting: {column: "", direction: ""}});
            }

            CourseData.masterDataTable.bind('sort', function() {
                var sortData = oSettings.aaSorting[0];
                if(!CourseData.workspace.displays[CourseData.dIndex].sorting ||
                        CourseData.workspace.displays[CourseData.dIndex].sorting.column !== oSettings.aoColumns[sortData[0]].sTitle ||
                        CourseData.workspace.displays[CourseData.dIndex].sorting.direction !== sortData[2]) {
                    CourseData.workspace.displays[CourseData.dIndex].attr("sorting.column", oSettings.aoColumns[sortData[0]].sTitle);
                    CourseData.workspace.displays[CourseData.dIndex].attr("sorting.direction", sortData[1]);
                }
            });
        },

        updateColumns: function() {
            var oSettings = CourseData.masterDataTable.fnSettings();
            var aoColumns = oSettings.aoColumns;
            var size = aoColumns.length;

            var newColumns = [];
            for(i = 0; i < size; i++) {
                if(aoColumns[i].bVisible) {
                    newColumns.push(aoColumns[i].sTitle);
                }
            }

            CourseData.workspace.displays[CourseData.dIndex].attr("columns", newColumns);
        }
    });

    VisControl = can.Control({
        init: function() {
            this.element.html(can.view('static/data_app/views/visDialog.ejs', {
                columns: CourseData.alphabetizedColumns
            }));

            $("#visDialog").dialog({
                autoOpen: false,
                buttons: {
                    "Ok": function() {
                        updateColumnVisibility();
                        $(this).dialog("close");
                    }
                },
                modal: true,
                draggable: false,
                minWidth: 500,
                title: "Show / Hide Columns",
                show: { effect: "fade", speed: 1000 },
                hide: { effect: "fade", speed: 1000 }
            });
        },

        '#visDialogButton click': function() {
            $("#visDialog").dialog('open');
        },

        '#visDialog close': function() {
            updateColumnVisibility();
        }
    });


    // Grab a workspace object and then configure the view to match its preferences
    CourseData.Workspace.findOne({"id": CourseData.workspaceId}, function(ws) {
        CourseData.workspace = ws;

        if(CourseData.dIndex < 0) {
            appendNewDisplayToWorkspace();
        }

        CourseData.workspace["id"] = CourseData.workspace["_id"]["$oid"];
        if(!CourseData.workspace.displays[CourseData.dIndex].filters) {
            CourseData.workspace.displays[CourseData.dIndex].filters = [];
        }
        var filters = new can.Observe.List(CourseData.workspace.displays[CourseData.dIndex].filters);

        if(!CourseData.workspace.displays[CourseData.dIndex].andVor) {
            CourseData.workspace.displays[CourseData.dIndex].andVor = can.Observe("and");
        }
        var andVor = new can.Observe().attr("andVor", CourseData.workspace.displays[CourseData.dIndex].andVor);

        if(!CourseData.workspace.displays[CourseData.dIndex].columns) {
            CourseData.workspace.displays[CourseData.dIndex].columns = [];
        }
        var columns = new can.Observe.List(CourseData.workspace.displays[CourseData.dIndex].columns);

        // Alphabetize the Columns
        // .slice(0) makes sure to clone the array so that we're not modifying the
        // internal DataTables column array when we sort
        var alphabetizedColumns = CourseData.masterDataTable.fnSettings().aoColumns.slice(0);
        alphabetizedColumns.sort(function(a,b) {
            if(a.sTitle.toLowerCase() > b.sTitle.toLowerCase()) {
                return 1;
            }else if(a.sTitle.toLowerCase() < b.sTitle.toLowerCase()) {
                return -1;
            }else {
                return 0;
            }
        });

        CourseData.alphabetizedColumns = alphabetizedColumns;

        new ColumnsControl('#userTable', {
            columns: columns
        });

        new FiltersControl('#filterDivContainer', {
            filters: filters
        });

        new AndVOrControl('#andVorDiv', {
            andVor: andVor
        });

        new VisControl('#visDialogContainer');

        $("#newFilter").bind("click", function() {
            filters.push({not: false, "selection": "", operator: "<", "text": ""});
            $(".filterSelect").ufd();
        });

        // Leaving this at the end in-case any jq-buttons are added in templates
        $(".jq-button").button();


        // Adding the dropdown to the email dialog, has to be done after data is loaded
        $(".markItUpUfd").html(can.view('static/data_app/views/filterSelect.ejs'));
        // The z-index of the dialog starts counting at 1000, so setting this significantly
        // higher, to prevent the dropdown from hiding behind the dialog
        $(".markItUpUfd select").ufd({"zIndexPopup": 2000});

        CourseData.workspace.bind('change', function(ev, attr, how, newVal, oldVal) {
            if(attr !== "updated") {
                CourseData.postWorkspace();
            }
        });

        CourseData.fullyLoaded = true;

        $("#loadingDialog").dialog("close");
        $("#mainDisplayDiv").show();
        CourseData.masterDataTable.fnAdjustColumnSizing();
        CourseData.masterDataTable.fnDraw();
    });
}

function fetchTable() {
    $.ajax( {
        "dataType": "text",
        "type": "GET",
        "url": "/data/table/" + CourseData.workspaceId + "/",
        cache: false,
        "success": function(dataStr) {
            var data = eval('(' + dataStr + ')');

            var tempColumns = data[0];
            var aoColumns = [];
            for(var column in tempColumns) {
                aoColumns.push({"sTitle": tempColumns[column]});
            }
            data.splice(0, 1); // Remove the list of column headers
            var aaData = data;

            CourseData.masterDataTable = $("#userTable").dataTable({
                "bJQueryUI": true,
                "bProcessing": true,
                "sDom": 'R<"H"lr>t<"F"ip>',
                "bScrollXInner": true,
                "sScrollX": "100%",
                "bScrollAutoCss": true,
                "bDeferRender": true,
                "oColReorder": {
                    "fnReorderCallback": updateColumnWorkspace
                },

                "aaData": aaData,
                "aoColumns": aoColumns
            });

            tableInitialized();
        }
    });
}

function removeDisplay(workspaceId, dIndex, name) {
    CourseData.Workspace.findOne({"id": workspaceId}, function(ws) {
        ws["id"] = ws["_id"]["$oid"];

        $("#deleteText").html("Are you sure you want to delete <b>\"" + name + "\"</b>?");

        $("#confirmDeleteDialog").dialog({
            autoOpen: true,
            modal: true,
            draggable: false,
            resizable: false,
            closeOnEscape: false,
            title: "Are you sure?",
            buttons: {
                "Cancel": function() {
                    $(this).dialog("close");
                },
                "Delete!": {
                    text: "Delete!",
                    click: function() {
                        ws.displays.splice(dIndex, 1);
                        ws.save(function() {
                            // Force a page refresh once the item is removed.
                            window.location.reload(true);
                        });
                    }
                }
            }
        });
    });
}

function addNewDisplay(workspaceId) {
    CourseData.workspaceId = workspaceId;
    CourseData.dIndex = -1;

    var closedByUser = true;

    $("#pickWorkspaceDialog").dialog("close");
    $("#newDisplayDialog").dialog({
        modal: true,
        draggable: false,
        resizable: false,
        minWidth: 400,
        closeOnEscape: false,
        title: "Create New Display",
        buttons: {
            "Create!": {
                text: "Create!",
                click: function() {
                    CourseData.displayName = $("#newDisplayName").val();
                    closedByUser = false;
                    $(this).dialog("close");
                    $("#loadingDialog").dialog("open");
                    fetchTable();
                }
            }
        },

        // If the user backs out of creating a new display, this will open
        // up the picker again.
        close: function() {
            if(closedByUser) {
                $("#pickWorkspaceDialog").dialog("open");
            }
        },
        dialogClass: "centerText"
    });

    var buttons = $('#newDisplayDialog').dialog('option', 'buttons');

    $.each(buttons, function(buttonIndex, button) {
        button.disabled = true;
    });
    $("#newDisplayDialog").dialog("option", "buttons", buttons);

    $("#newDisplayName").bind("keyup", function() {
        $.each(buttons, function(buttonIndex, button) {
            if($("#newDisplayName").val().length > 0) {
                button.disabled = false;
            }else {
                button.disabled = true;
            }
        });

        $("#newDisplayDialog").dialog("option", "buttons", buttons);
    });
}

function appendNewDisplayToWorkspace() {
    CourseData.workspace.displays.push({
        "andVor" : "and",
        "sorting" : {
            "column" : "lastname",
            "direction" : "desc"
        },
        "columns" : [
            "lastname",
            "firstname",
            "email"
        ],
        "filters" : [
            {
                "not" : false,
                "operator" : "<",
                "selection" : "",
                "text" : ""
            }
        ],
        "name" : CourseData.displayName
    });
    CourseData.dIndex = CourseData.workspace.displays.length - 1;
}

$(document).ready(function() {
    $("#loadingDialog").dialog({
        autoOpen: false,
        modal: true,
        draggable: false,
        resizable: false,
        minWidth: 400,
        height: 168,
        closeOnEscape: false,
        dialogClass: "no-title"
    });

    $("#pickWorkspaceDialog").dialog({
        autoOpen: true,
        buttons: {
            "Select!": {
                text: "Select!",
                click: function() {
                    var workspaceInfo = $(".workspaceRadio:checked").val();
                    var workspaceInfoSplit = workspaceInfo.split("--");
                    CourseData.workspaceId = workspaceInfoSplit[0];
                    CourseData.dIndex = parseInt(workspaceInfoSplit[1], 10);
                    $(this).dialog("close");
                    $("#loadingDialog").dialog("open");
                    fetchTable();
                }
            }
        },
        modal: true,
        draggable: false,
        resizable: false,
        minWidth: 700,
        closeOnEscape: false,
        title: "Select a Workspace",
        dialogClass: "no-close"
    });

    markItUpSettings = {
        onTab:          {keepDefault:false, replaceWith:'    '},
        markupSet:  [
            {name:'Bold', key:'B', openWith:'(!(<strong>|!|<b>)!)', closeWith:'(!(</strong>|!|</b>)!)' },
            {name:'Italic', key:'I', openWith:'(!(<em>|!|<i>)!)', closeWith:'(!(</em>|!|</i>)!)'  },
            {separator:'---------------' },
            {
                name:"Insert Variable",
                replaceWith: function(markItUp) {
                    return "{{" + $(".markItUpUfd input").val().replace(/ /g, "_") + "}}";
                }
            },
            {
                name:"Help",
                beforeInsert: function() {
                    $("#templateHelp").toggle("slideDown");
                }

            }
        ]
    };

    $("#body").markItUp(markItUpSettings);
    $(".markItUpButton3").before("<li class='markItUpUfd'></li>");

    $("#emailDialog").dialog({
        autoOpen: false,
        buttons: {
            "Cancel": function() {
                $(this).dialog("close");
            },
            "Send!": {
                text: "Send!",
                "class": 'sendButton',
                click: function() {
                    $("#emailSuccess").hide("slideDown");
                    $("#emailError").hide("slideDown");
                    $("#templateHelp").hide("slideDown");

                    if($("#subject").val() === "") {
                        $("#emailError").html("<strong>No E-Mails Sent:</strong> Please Enter a Subject.");
                        $("#emailError").show("slideDown");
                        return;
                    }else if($("#body").val() === "") {
                        $("#emailError").html("<strong>No E-Mails Sent:</strong> Please Enter a Message Body.");
                        $("#emailError").show("slideDown");
                        return;
                    }

                    var data = {"subject": $("#subject").val(), "body": $("#body").val(), "wid": "500d6b12b1bf6a0381000000"};

                    data.users = [];
                    var settings = CourseData.masterDataTable.fnSettings();

                    for(var index in settings.aiDisplay) {
                        var dataIndex = settings.aiDisplay[index];
                        var rcpid = settings.aoData[dataIndex]._aData[CourseData.indexNums["rcpid"]];
                        data.users.push(rcpid);
                    }

                    if(data.users.length === 0) {
                        $("#emailError").html("No Users Are Selected to Receive E-Mails.");
                        $("#emailError").show("slideDown");
                        return;
                    }

                    $("#emailPending").show("slideDown");

                    $.ajax({
                        url: "/data/email",
                        type: "POST",
                        data: data,
                        success: function(data) {
                            $("#emailPending").hide("slideDown");
                            if(data.result === "success") {
                                $("#emailSuccess").show("slideDown");
                            }else {
                                $("#emailError").html(data.error);
                                $("#emailError").show("slideDown");
                            }
                        }
                    });
                }
            }
        },
        modal: true,
        draggable: false,
        resizable: false,
        minWidth: 700,
        title: "Send E-Mails",
        show: { effect: "fade", speed: 1000 },
        hide: { effect: "fade", speed: 1000 }
    });

    $("#sendEmail").click(function() {
        var numEmails = CourseData.masterDataTable.fnSettings().aiDisplay.length;
        if(numEmails > 1) {
            $(".sendButton span").text("Send " + numEmails + " E-Mails!");
        }else {
            $(".sendButton span").text("Send " + numEmails + " E-Mail!");
        }

        $("#emailStatusDiv div").hide();
        $("#templateHelp").hide();

        $("#emailDialog").dialog('open');
    });

    $("#uploadDiv").dialog({
        autoOpen: false,
        modal: true,
        draggable: false,
        resizable: false,
        minWidth: 700,
        title: "Upload File",
        show: { effect: "fade", speed: 1000 },
        hide: { effect: "fade", speed: 1000 },
        buttons: {
            "Cancel": function() {
                $(this).dialog("close");
            },
            "Upload!": {
                text: "Upload!",
                click: function() {
                    $("#uploadForm").attr("action", "/data/upload/" + CourseData.workspace.id + "/");
                    $("#uploadForm").submit();
                    $(this).dialog("close");
                }
            }
        }
    });

    $("#uploadButton").bind('click', function() {
        $("#uploadDiv").dialog('open');
    });
});

// Adds a function to DataTables that recalculates the filters while
// staying on the current page.
$.fn.dataTableExt.oApi.fnStandingRedraw = function(oSettings) {
    if(oSettings.oFeatures.bServerSide === false){
        var before = oSettings._iDisplayStart;

        oSettings.oApi._fnReDraw(oSettings);

        if(before < oSettings.fnRecordsDisplay()) {
            // iDisplayStart has been reset to zero - so lets change it back
            oSettings._iDisplayStart = before;
            oSettings.oApi._fnCalculateEnd(oSettings);
        }
    }

    // draw the 'current' page
    oSettings.oApi._fnDraw(oSettings);
};

// Ensures the CSRF header is configured, to prevent XSS
jQuery(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && !settings.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});
jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "course-numeric-pre": function ( a ) {
        if(a === "None" || a === "") {
            a = "-1";
        }
        return parseFloat(a);
    },

    "course-numeric-asc": function ( a, b ) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },

    "course-numeric-desc": function ( a, b ) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
} );