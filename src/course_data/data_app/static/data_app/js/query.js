$(function() {
    var table = null;

    var indexNums;

    function compare(a, b) {
        operator = $("#queryOperator").val();
        if( operator === "<" && a < b ||
            operator === ">" && a > b ||
            operator === "=" && a === b ||
            operator === "<=" && a <= b ||
            operator === ">=" && a >= b ||
            operator === "equals" && a === b ||
            operator === "contains" && a.indexOf(b) !== -1 ||
            operator === "startsWith" && a.indexOf(b) === 0) {
                return true;
        }else {
            return false;
        }
    }

    $("#result").load("/users", function() {
        table = $("#userTable").dataTable({
            "bJQueryUI": true,
            "sDom": 'R<"H"lr>t<"F"ip>'
//            "bPaginate": false
        });

        table.fnSetColumnVis(1, false);
        table.fnSetColumnVis(4, false);
        table.fnSetColumnVis(7, false);
        table.fnSetColumnVis(8, false);
        table.fnSetColumnVis(9, false);

        aoColumns = table.fnSettings().aoColumns;
        for(var c in aoColumns) {
            $("#querySelect").append("<option value=\"" + aoColumns[c].sTitle + "\">" + aoColumns[c].sTitle + "</option>");
        }

        $("#querySelect").ufd({});

        $.fn.dataTableExt.afnFiltering.push(
            function(oSettings, aData, iDataIndex) {
                val = $("#query").val();

                if(val === "") return true;

                comp = compare(aData[indexNums[$("#querySelect").val()]], val);
                if($("#notOperator").val() === "!") {
                    return !comp;
                }else {
                    return comp;
                }
            }
        );
    });

    var b = true;
    $("#query").keypress(function(e) {
        if(e.which == 13) {
            oSettings = table.fnSettings();
            indexNums = new Array(oSettings.aoColumns.length);
            for(i = 0; i < indexNums.length; i++) {
                indexNums[oSettings.aoColumns[i].sTitle] = i;
            }

            table.fnDraw();
        }
    });
});