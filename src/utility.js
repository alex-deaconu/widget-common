var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.Utility = {};

/*
 * Utility classes.
 */

/*
 * Load a custom font.
 */
RiseVision.Common.Utility.loadCustomFont = function(family, url, contentDocument) {
  if (contentDocument == null) {
    contentDocument = document;
  }

  var sheet = contentDocument.styleSheets[0], rule = "font-family: " + family + "; " + "src: url('" + url + "');";

  if (sheet != null) {
    sheet.addRule("@font-face", rule);
  }
}
/*
 * Load a Google font.
 */
RiseVision.Common.Utility.loadGoogleFont = function(family, contentDocument) {
  if (contentDocument == null) {
    contentDocument = document;
  }

  var stylesheet = document.createElement("link");

  stylesheet.setAttribute("rel", "stylesheet");
  stylesheet.setAttribute("type", "text/css");
  stylesheet.setAttribute("href", "https://fonts.googleapis.com/css?family=" + family);

  if (stylesheet != null) {
    contentDocument.getElementsByTagName("head")[0].appendChild(stylesheet);
  }
}
/*
 * Load a CSS file.
 */
RiseVision.Common.Utility.loadCSS = function(url) {
  var link = $("<link>");

  link.attr({
    type : "text/css",
    rel : "stylesheet",
    href : url
  });

  $("head").append(link);
}
/*
 * Load a Javascript file.
 */
RiseVision.Common.Utility.loadJS = function(filename, callback) {
  var fileref = document.createElement("script");

  fileref.type = "text/javascript";
  fileref.onload = function() {
    if (callback) {
      callback();
    }
  };

  fileref.src = filename;

  if ( typeof fileref != "undefined") {
    document.getElementsByTagName("head")[0].appendChild(fileref);
  }
}
/*
 * Format a number to include commas.
 */
RiseVision.Common.Utility.addCommas = function(number) {
  var x, x1, x2, regex;

  number += '';
  x = number.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  regex = /(\d+)(\d{3})/;

  while (regex.test(x1)) {
    x1 = x1.replace(regex, '$1' + ',' + '$2');
  }

  return x1 + x2;
}
/*
 * Unescape HTML.
 */
RiseVision.Common.Utility.unescapeHTML = function(html) {
  var div = document.createElement("div");

  div.innerHTML = html;

  if (div.innerText !== undefined) {
    return div.innerText;
    // IE
  }

  return div.textContent;
}
/*
 * Strips script tags from an HTML string.
 */
RiseVision.Common.Utility.stripScripts = function(html) {
  var div = document.createElement("div"), scripts, i;

  div.innerHTML = html;
  scripts = div.getElementsByTagName("script");
  i = scripts.length;

  while (i--) {
    scripts[i].parentNode.removeChild(scripts[i]);
  }

  return div.innerHTML;
}
/*
 * Truncate text while preserving word boundaries.
 */
RiseVision.Common.Utility.truncate = function(text, length) {
  //Truncate the text and then go back to the end of the previous word to ensure that
  //we don't truncate in the middle of a word.
  if (text.length > length) {
    text = text.substring(0, length);
    text = text.replace(/\w+$/, '');
    text = text + " ...";
  }

  return text;
}
/*
 * Scale an image down if necessary to fit within a particular area.
 */
RiseVision.Common.Utility.scaleToFit = function(settings) {
  var objImage = new Image();

  //Use an Image object in order to get the actual dimensions of the image.
  objImage.onload = function() {
    var imageWidth, imageHeight, ratioX, ratioY, scale, newWidth, newHeight;

    imageWidth = objImage.width;
    imageHeight = objImage.height;

    //Scale down images only. Don't scale up.
    if ((imageWidth > 0) && (imageHeight > 0) && ((imageWidth > settings.rsW) || (imageHeight > settings.rsH))) {
      //Calculate scale ratios.
      ratioX = settings.rsW / imageWidth;
      ratioY = settings.rsH / imageHeight;
      scale = ratioX < ratioY ? ratioX : ratioY;

      //Calculate and set new image dimensions.
      newWidth = parseInt(imageWidth * scale, 10);
      newHeight = parseInt(imageHeight * scale, 10);

      //Call the callback function and pass the new dimensions.
      settings.callback(newWidth, newHeight);
    }
    else {//Pass the original dimensions unchanged.
      settings.callback(imageWidth, imageHeight);
    }
  }
  //Call the error handler if the image could not be loaded.
  objImage.onerror = function() {
    settings.onerror(objImage);
  }

  objImage.setAttribute("src", settings.url);
}
RiseVision.Common.Utility.getNodeValue = function(node) {
  if ((node != null) && (node.length > 0)) {
    if (node[0].childNodes.length > 0) {
      return node[0].childNodes[0].nodeValue;
    }
    else {
      return "";
    }
  }

  return "";
}
//Helper function for node names that include a prefix and a colon, such as "<yt:rating>"
RiseVision.Common.Utility.getElementByNodeName = function(parentNode, nodeName) {
  var colonIndex = nodeName.indexOf(":"), tag = nodeName.substr(colonIndex + 1), nodes = parentNode.getElementsByTagNameNS("*", tag);

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].nodeName == nodeName) {
      return nodes;
    }
  }

  return null;
}
/*
 * Adjust a date to compensate for differences in time zone.
 */
RiseVision.Common.Utility.adjustTime = function(date, offset) {
  return date.setTimezoneOffset(offset);
}
//Find and return the contents of a particular CSS rule.
RiseVision.Common.Utility.getStyle = function(className) {
  var i, j, styleSheet, classes, style = "";

  //Iterate over all style sheets.
  for ( i = 0; i < document.styleSheets.length; i++) {
    styleSheet = document.styleSheets[i];
    classes = styleSheet.rules || styleSheet.cssRules;

    for ( j = 0; j < classes.length; j++) {
      if (classes[j].selectorText == className) {
        style = classes[j].cssText ? classes[j].cssText : classes[j].style.cssText;

        return style;
      }
    }
  }

  return style;
}
RiseVision.Common.Utility.parseCSSRule = function(rule) {
  var a = rule.indexOf("{"), b = rule.indexOf("}"), selector = rule.substring(0, a), rules = rule.substring(++a, b).split(";"), values = [], position;

  //Now remove property name and just keep the value.
  for (var i = 0; i < rules.length; i++) {
    position = -1;

    //Issue 963 Start - font-weight and font-style can switch positions.
    //Ensure font-weight is always in third position and font-style is in the fourth.
    if (rules[i].indexOf("font-family:", 0) != -1) {
      position = 0;
    }
    else if (rules[i].indexOf("color:", 0) != -1) {
      position = 1;
    }
    else if (rules[i].indexOf("font-size:", 0) != -1) {
      position = 2;
    }
    else if (rules[i].indexOf("font-weight:", 0) != -1) {
      position = 3;
    }
    else if (rules[i].indexOf("font-style:", 0) != -1) {
      position = 4;
    }

    if (position == -1) {
      values.push(rules[i].substring(rules[i].indexOf(":", 0) + 1).trim());
    }
    else {
      values[position] = rules[i].substring(rules[i].indexOf(":", 0) + 1).trim();
    }
    //Issue 963 End
  }

  return values;
}
//Issue 953 Start
RiseVision.Common.Utility.isTouchDevice = function() {
  return "ontouchstart" in window;
}
//Issue 953 End
RiseVision.Common.Utility.getQueryParam = function(param) {
  var query = window.location.search.substring(1), vars = query.split("&"), pair;

  for (var i = 0; i < vars.length; i++) {
    pair = vars[i].split("=");

    if (pair[0] == param) {
      return decodeURIComponent(pair[1]);
    }
  }

  return null;
}