var CourseData = {
    fullyLoaded: false,
    masterDataTable: null,
    indexNums: null,
    workspace: null,

    workspaceUpdater: null,
    workspaceUpdateTime: null,

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
    }
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
    masterVal = topLevel.find(".filterText").val();

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

        CourseData.workspace.attr("display.columns", columns);
    }
}

function updateColumnVisibility() {
    calculateIndexNums();
    $(".colVisCheckbox").each(function() {
        CourseData.masterDataTable.fnSetColumnVis(CourseData.indexNums[$(this).attr("name")], $(this).attr("checked") === "checked");
    });

    updateColumnWorkspace();
}

function tableInitialized() {
    $.fn.dataTableExt.afnFiltering.push(
        function(oSettings, aData, iDataIndex) {
            calculateIndexNums();
            andVor = $("#andVor").val() === "all";

            if(andVor) {
                show = true;
            }else {
                show = false;
            }
            $("#filterDivContainer").find(".filterDiv").each(function() {
                r = checkCondition(oSettings, aData, iDataIndex, $(this));
                if(!r && andVor) {
                    show = false;
                    return;
                }else if(r && !andVor) {
                    show = true;
                    return;
                }
            });

            return show;
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
            this.options.filters[index].attr("selection", el.val());
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
            CourseData.workspace.attr("display.filters", this.options.filters);
        }
    });

    AndVOrControl  = can.Control({
        init: function(element, options) {
            this.element.html(can.view('static/data_app/views/andVor.ejs', {
                andVor: this.options.andVor
            }));
        },

        '#andVor change': function(el, ev) {
            this.options.andVor.attr("andVor", el.val());
            CourseData.workspace.attr("display.andVor", el.val());
        }
    });

    ColumnsControl = can.Control({
        // Make sure all of the columns are in the correct order, with correct visibility
        init: function(element, options) {
            columns = this.options.columns;

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
                CourseData.masterDataTable.fnSetColumnVis(i, (i < columns.length));
            }

            CourseData.masterDataTable.bind('column-reorder', this.updateColumns);
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

            columns.attr(newColumns);
        }
    });

    VisControl = can.Control({
        init: function() {
            this.element.html(can.view('static/data_app/views/visDialog.ejs', {
                columns: CourseData.masterDataTable.fnSettings().aoColumns
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

    var Workspace = can.Model({
        findOne : 'GET /data/workspace/{id}/',
        update  : function(id, ws) {
            return $.post('/data/workspace/' + id + '/', JSON.stringify(ws));
        }
    }, {});

    Workspace.findOne({"id": "5005bccab1bf6a076d000000"}, function(ws) {
        CourseData.workspace = ws;
        CourseData.workspace["id"] = CourseData.workspace["_id"]["$oid"];
        var filters = new can.Observe.List(CourseData.workspace.display.filters);
        var andVor = new can.Observe().attr("andVor", CourseData.workspace.display.andVor);
        var columns = new can.Observe.List(CourseData.workspace.display.columns);

        new FiltersControl('#filterDivContainer', {
            filters: filters
        });

        new AndVOrControl('#andVorDiv', {
            andVor: andVor
        });

        new ColumnsControl('#userTable', {
            columns: columns
        });

        new VisControl('#visDialogContainer');

        $("#newFilter").bind("click", function() {
            filters.push({not: false, "selection": "", operator: "<", "text": ""});
            $(".filterSelect").ufd();
        });

        // Restore sorting order from workspace
        calculateIndexNums();
        var settings = CourseData.masterDataTable.fnSettings();
        settings.aaSorting[0][0] = CourseData.indexNums[CourseData.workspace.display.sorting.column];
        settings.aaSorting[0][1] = CourseData.workspace.display.sorting.direction;
        settings.aaSorting[0][2] = CourseData.workspace.display.sorting.direction === "asc"? 0 : 1;

        CourseData.masterDataTable.bind('sort', function() {
            var sortData = settings.aaSorting[0];
            if(CourseData.workspace.display.sorting.column !== settings.aoColumns[sortData[0]].sTitle ||
                    CourseData.workspace.display.sorting.direction !== sortData[2]) {
                CourseData.workspace.attr("display.sorting.column", settings.aoColumns[sortData[0]].sTitle);
                CourseData.workspace.attr("display.sorting.direction", sortData[2]);
            }
        });

        CourseData.masterDataTable.fnDraw();

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
    });
}

$(document).ready(function() {

    markItUpSettings = {
        onTab:          {keepDefault:false, replaceWith:'    '},
        markupSet:  [
            {name:'Bold', key:'B', openWith:'(!(<strong>|!|<b>)!)', closeWith:'(!(</strong>|!|</b>)!)' },
            {name:'Italic', key:'I', openWith:'(!(<em>|!|<i>)!)', closeWith:'(!(</em>|!|</i>)!)'  },
            {separator:'---------------' },
            {
                name:"Insert Variable",
                replaceWith: function(markItUp) {
                    return "{{" + $(".markItUpUfd input").val() + "}}";
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
                    $.ajax({
                        url: "/data/email",
                        type: "POST",
                        data: {"subject": $("#subject").val(), "body": $("#body").val()},
                        success: function(data) {
                            alert(data.results);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            alert(errorThrown);
                        }
                    });
                    $(this).dialog("close");
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
        $("#emailDialog").dialog('open');
    });

    $.ajax( {
        "dataType": "text",
        "type": "GET",
        "url": "/static/data_app/formatted.txt",
        "success": function(dataStr) {
            var data = eval('(' + dataStr + ')');

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

                "aaData": data.aaData,
                "aoColumns": data.aoColumns
            });

            tableInitialized();
        }
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