var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.Settings = {};
RiseVision.Common.Authorization = {};
RiseVision.Common.Font = {};

/*
 * Validation functions for custom Gadget settings.
 */
RiseVision.Common.Settings = function() {
}
RiseVision.Common.Settings.prototype.validateRequired = function($element, errors, fieldName) {
  //Don't validate element if it's hidden.
  if (!$element.is(":visible")) {
    return false;
  }
  else {
    if (!$.trim($element.val())) {
      errors.innerHTML += fieldName + " is a required field.<br />";
      return true;
    }
    else {
      return false;
    }
  }
}
RiseVision.Common.Settings.prototype.validateNumeric = function($element, errors, fieldName) {
  //Don't validate element if it's hidden.
  if (!$element.is(":visible")) {
    return false;
  }
  else {
    if (isNaN($element.val())) {
      errors.innerHTML += "The " + fieldName + " field must contain only numbers.<br />";
      return true;
    }
    else {
      return false;
    }
  }
}

RiseVision.Common.Authorization = function() {
  this.clientID = "726689182011.apps.googleusercontent.com";
  this.scope = "https://www.googleapis.com/auth/drive";
}
RiseVision.Common.Authorization.prototype.checkAuth = function() {
  var self = this;

  gapi.auth.authorize({
    client_id : this.clientID,
    scope : this.scope,
    immediate : true
  }, function(authResult) {
    self.handleAuthResult(authResult);
  });
}
RiseVision.Common.Authorization.prototype.handleAuthResult = function(authResult) {
  if (authResult && !authResult.error) {
    this.oauthToken = authResult.access_token;
    $(window).trigger("authorized");
  }
  else {
    $(window).trigger("notAuthorized");
  }
}
RiseVision.Common.Authorization.prototype.handleLogin = function() {
  var self = this;

  gapi.auth.authorize({
    client_id : this.clientID,
    scope : this.scope,
    immediate : false
  }, function(authResult) {
    self.handleAuthResult(authResult);
  });

  return false;
}

RiseVision.Common.Font = function(font, fontStyle, fontURL, customFont) {
  this.font = font;
  this.fontStyle = fontStyle;
  this.customFont = customFont;

  if (font == "Use Custom Font") {
    if (fontURL != "") {
      RiseVision.Common.Utility.loadCustomFont(customFont, fontURL);
    }
  }
  else if (fontStyle == "Google") {
    RiseVision.Common.Utility.loadGoogleFont(this.font);
  }
}
RiseVision.Common.Font.prototype.getFontFamily = function() {
  if (this.font == "Use Custom Font") {
    return this.customFont;
  }
  else if (this.fontStyle == "Google") {
    return this.font;
  }
  else {
    return this.fontStyle;
  }
}

RiseVision.Common.CKEditorFonts = function() {
  this.reset();
}
RiseVision.Common.CKEditorFonts.prototype.reset = function() {
  this.customFonts = [];
  this.googleFonts = [];
}
/* Extract custom and Google fonts from CKEditor data. */
RiseVision.Common.CKEditorFonts.prototype.getFonts = function(data) {
  var html = $.parseHTML(data), self = this;

  if (html != null) {
    $.each(html, function(i, elem) {
      //Find all elements that have custom font data attributes associated with them.
      var customFontElems = $(elem).find("[data-custom-font-url]").andSelf().filter("[data-custom-font-url]"), googleFontElems = $(elem).find("[data-google-font-url]").andSelf().filter("[data-google-font-url]");

      $.each(customFontElems, function() {
        var customFont = $(this).attr("data-custom-font"), customFontURL = $(this).attr("data-custom-font-url"), found = false;

        //Check that this custom font does not already exist in the array.
        $.each(self.customFonts, function(j, value) {
          if (value.font == customFont) {
            found = true;
            return false;
          }
        });

        //Only add the custom font if it has not already been added.
        if (!found) {
          self.customFonts.push({
            font : customFont,
            url : customFontURL
          });
        }
      });

      $.each(googleFontElems, function() {
        var googleFont = $(this).attr("data-google-font"), googleFontURL = $(this).attr("data-google-font-url"), found = false;

        //Check that this Google font does not already exist in the array.
        $.each(self.googleFonts, function(j, value) {
          if (value == googleFontURL) {
            found = true;
            return false;
          }
        });

        //Only add the Google font if it has not already been added.
        if (!found) {
          self.googleFonts.push({
            font : googleFont,
            url : googleFontURL
          });
        }
      });
    });
  }
}
RiseVision.Common.CKEditorFonts.prototype.loadFonts = function(contentDocument) {
  if (this.customFonts != null) {
    if (this.customFonts.length > 0) {
      //Load each of the custom fonts.
      $.each(this.customFonts, function(i, value) {
        RiseVision.Common.Utility.loadCustomFont(value.font, value.url, contentDocument);
      });
    }
  }

  if (this.googleFonts != null) {
    if (this.googleFonts.length > 0) {
      //Load each of the Google fonts.
      $.each(this.googleFonts, function(i, value) {
        RiseVision.Common.Utility.loadGoogleFont(value.font, contentDocument);
      });
    }
  }
}
