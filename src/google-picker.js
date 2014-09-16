var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.Picker = {};

/*
 * Show Google Picker dialog box.
 */
RiseVision.Common.Picker = function() {
}
RiseVision.Common.Picker.prototype.showPicker = function(id, type) {
  gadgets.rpc.call("", "rscmd_openGooglePicker", null, id, type);
}
/*
 * Use id returned by Google picker to query Spreadsheet API for worksheets.
 */
RiseVision.Common.Picker.prototype.getSheets = function(params) {
  var data, option, href;
  var self = this, sheets = [];

  $.getJSON(encodeURI("https://spreadsheets.google.com/feeds/worksheets/" + params.docID + "/public/basic?alt=json&dummy=" + Math.ceil(Math.random() * 100)))
    .done(function(data) {
      for (var i = 0; i < data.feed.entry.length; i++) {
        option = document.createElement("option");
        option.text = data.feed.entry[i].title.$t;  //Sheet name
        //Issue 960 Start - Visualization API doesn't refresh properly if 'pub' parameter is present, so remove it.
        href = data.feed.entry[i].link[2].href;
        href = href.replace("&pub=1", "");  //Visualization URL

        //Issue 1130 - Use docs.google.com domain when using new Google Sheets due to this bug - http://goo.gl/4Zf8LQ.
        //If /gviz/ is in the URL path, then use this as an indicator that the new Google Sheets is being used.
        if (href.indexOf("/gviz/") == -1) {
          option.value = href;
        }
        else {
          option.value = href.replace("spreadsheets.google.com", "docs.google.com");
        }

        sheets.push(option);
      }

      params.callback(sheets);
    })
    .fail(function(jqxhr, textStatus, error) {
      $(".errors").empty();
      $(".errors").append("To use this spreadsheet, it first needs to be published to the web. From the Google Spreadsheet menu, select " + "<em>File > Publish to the web</em>, and then click the <em>Start Publishing</em> button. Once done, select your file from the " + "Google Drive link again.");
      $(".errors").css("display", "inline-block");
      $("li.more").hide();

      console.log(jqxhr.status + " - " + jqxhr.statusText);
      console.log(jqxhr.responseText);

      params.callback(null);
    });
}
RiseVision.Common.Picker.prototype.getURL = function(params) {
  var url = "";

  url = params.baseURL;

  if (params.headerRows != "") {
    url += "&headers=" + params.headerRows;
  }

  if (params.range != "") {
    url += "&range=" + params.range;
  }

  return url;
}