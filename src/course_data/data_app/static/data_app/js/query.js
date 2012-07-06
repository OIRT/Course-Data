var masterDataTable = null;
var indexNums;

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

function calculateIndexNums() {
    oSettings = masterDataTable.fnSettings();
    indexNums = new Array(oSettings.aoColumns.length);
    for(i = 0; i < indexNums.length; i++) {
        indexNums[oSettings.aoColumns[i].sTitle] = i;
    }
}

$(function() {
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
            },

            '.ufd select change': function(el, ev) {
                var index = this.findIndex(el);
                this.options.filters[index].attr("selection", el.val());
            },

            '.filterOperator change': function(el, ev) {
                var index = this.findIndex(el);
                this.options.filters[index].attr("operator", el.val());
            },

            '.filterText keyup': function(el, ev) {
                if(ev.keyCode == 13) {
                    masterDataTable.fnDraw();
                } else {
                    var index = this.findIndex(el);
                    this.options.filters[index].attr("text", el.val());
                }
            },

            '.deleteFilter click': function(el, ev) {
                var index = this.findIndex(el);
                this.options.filters.splice(index, 1);
                $(".filterSelect").ufd();
            },

            findIndex: function(el) {
                return $('.filterItem').index(el.closest('.filterItem'));
            }
        });

        AndVOrControl  = can.Control({
            init: function(element, options) {
                this.element.html(can.view('static/data_app/views/andVor.ejs', {
                    andVor: this.options.andVor
                }));
            }
        });

        var workspace = {
            "andVor": "and",
            "filters": [
                {
                    not: false,
                    selection: "Budget Assignment",
                    operator: "<=",
                    text: "4"
                },
                {
                    not: true,
                    selection: "Internal Control Assignment",
                    operator: ">",
                    text: "2"
                }
            ]
        };

        var filters = new can.Observe.List(workspace.filters);
        var andVor = new can.Observe().attr("andVor", workspace.andVor);

        new FiltersControl('#filterDivContainer', {
            filters: filters
        });

        new AndVOrControl('#andVorDiv', {
            andVor: andVor
        });

        $("#newFilter").bind("click", function() {
            filters.push({not: false, "selection": "", operator: "<", "text": ""});
            $(".filterSelect").ufd();
        });

        masterDataTable.fnDraw();
    });
});