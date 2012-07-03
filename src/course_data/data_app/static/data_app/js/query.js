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
    masterVal = topLevel.find(".query").val();

    if(masterVal === "") return true;

    cellVal = aData[indexNums[topLevel.find(".querySelect").val()]];

    if(cellVal === "None") return true;

    operator = topLevel.find(".queryOperator").val();
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
    $(".hiddenQuery").children(".queryDiv").clone().appendTo(".queryDivContainer");
    $(".queryDivContainer").find(".querySelect").ufd({});
    $(".query").unbind("keypress");
    $(".query").keypress(function(e) {
        if(e.which == 13) {
            recalculateTable();
        }
    });
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

        aoColumns = masterDataTable.fnSettings().aoColumns;
        for(var c in aoColumns) {
            $(".querySelect").append("<option value=\"" + aoColumns[c].sTitle + "\">" + aoColumns[c].sTitle + "</option>");
        }

        $(".querySelect").ufd({});

        $.fn.dataTableExt.afnFiltering.push(
            function(oSettings, aData, iDataIndex) {
                andVor = $("#andVor").val() === "all";

                if(andVor) {
                    show = true;
                }else {
                    show = false;
                }
                $(".queryDivContainer").children(".queryDiv").each(function() {
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

        addNew();
    });
});