var masterDataTable = null;

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

    cellVal = aData[indexNums[topLevel.find(".filterSelect").val()]];

    if(cellVal === "None") return true;

    operator = topLevel.find(".filterOperator").val();
    comp = compareValues(cellVal, masterVal, operator);
    if(topLevel.find(".notOperator").val() === "!") {
        return !comp;
    } else {
        return comp;
    }
}

function recalculateTable() {
    oSettings = masterDataTable.fnSettings();
    indexNums = new Array(oSettings.aoColumns.length);
    for(i = 0; i < indexNums.length; i++) {
        indexNums[oSettings.aoColumns[i].sTitle] = i;
    }

    masterDataTable.fnDraw();
}

function addNew() {
    new Filter({"text": ""}).save();
}

$(function() {
    var indexNums;

    $("#result").load("/users", function() {
        masterDataTable = $("#userTable").dataTable({
            "bJQueryUI": true,
            "sDom": 'R<"H"lr>t<"F"ip>',
            "bScrollXInner": true,
            "sScrollX": "100%",
            "bScrollAutoCss": true
//            "bPaginate": false
        });

        masterDataTable.fnSetColumnVis(1, false);
        masterDataTable.fnSetColumnVis(4, false);
        masterDataTable.fnSetColumnVis(7, false);
        masterDataTable.fnSetColumnVis(8, false);
        masterDataTable.fnSetColumnVis(9, false);

        $.fn.dataTableExt.afnFiltering.push(
            function(oSettings, aData, iDataIndex) {
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

        Filters = can.Control({
            init: function() {
                this.element.html(can.view('static/data_app/views/filterList.ejs', {
                    filters: this.options.filters
                }));
                $(".filterSelect").ufd();
            },

            '{Filter} created': function(list, ev, filter) {
                this.options.filters.push(filter);
                $(".filterSelect").ufd();
            },

            '.filterText keypress': function(el, event) {
                if(event.keyCode == 13) {
                    recalculateTable();
                }
            }
        });

        Filter = can.Model({
            findAll: "GET /filters",
            create: "POST /filters"
        }, {});

        var FILTERS = [
            {
                id: 1,
                text: "40"
            },
            {
                id: 2,
                text: "50"
            }
        ];

        can.fixture("GET /filters", function() {
            return FILTERS;
        });

        id = 5;
        can.fixture("POST /filters", function() {
            return {id: (id++)};
        });

        $.when(Filter.findAll()).then(
            function(filterResponse) {
                new Filters('#filterDivContainer', {
                    filters: filterResponse
                });
            }
        );
    });
});