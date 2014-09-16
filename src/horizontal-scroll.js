var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.HorizontalScroll = {};
RiseVision.Common.Item = {};
RiseVision.Common.Scroller = {};

/*
 * Scroll horizontally on HTML5 canvas.
 */
RiseVision.Common.HorizontalScroll = function(settings, data) {
  //Private variables
  var scrollers = [], totalPixels = 0, isStopped = false, interactivityTimerID = null, options = {
    width : 800,
    height : 75,
    scrollBy : "item",
    scrollDirection : "rtl",
    speed : "medium",
    spacing : 20,
    duration : 10000,
    interactivityTimeout : 5000
  };

  //Merge settings with options.
  if (settings) {
    $.extend(options, settings);
  }

  //Public variables
  this.scroller = document.createElement("canvas");
  this.scroller.id = "scroller"
  this.scroller.width = options.width;
  this.scroller.height = options.height;
  //this.scroller.height = 75;
  this.interactivityTimeout = options.interactivityTimeout;
  this.context = this.scroller.getContext("2d");
  this.data = data;
  this.isHolding = false;
  this.isLoading = true;

  this.items = [];
  this.previousItemIndex = -1;
  this.itemCount = 0;
  this.currentItemIndex = 0;

  this.mouseDown = false;
  this.mouseMove = false;
  this.lastMouseX = 0;

  //Number of pixels to move per each redraw.
  if (options.speed) {
    if (options.speed == "fastest") {
      this.speed = 5;
    }
    else if (options.speed == "fast") {
      this.speed = 4;
    }
    else if (options.speed == "medium") {
      this.speed = 3;
    }
    else if (options.speed == "slow") {
      this.speed = 2;
    }
    else if (options.speed == "slowest") {
      this.speed = 1;
    }
  }
  else {
    this.speed = 3;
    //Backwards compatability.
  }

  if (options.scrollDirection == "ltr") {
    this.speed = -this.speed;
  }

  //Getters
  this.getScrollBy = function() {
    return options.scrollBy;
  }
  this.getScrollDirection = function() {
    return options.scrollDirection;
  }
  this.getDuration = function() {
    return options.duration;
  }
  this.getScroller = function(index) {
    return scrollers[index];
  }
  this.getScrollers = function() {
    return scrollers;
  }
  this.getTotalPixels = function() {
    return totalPixels;
  }
  this.getIsStopped = function() {
    return isStopped;
  }
  this.getInteractivityTimerID = function() {
    return interactivityTimerID;
  }
  this.getSpacing = function() {
    return options.spacing;
  }
  //Setters
  this.setScroller = function(index, value) {
    scrollers[index] = value;
  }
  this.setTotalPixels = function(value) {
    totalPixels = value;
  }
  this.setIsStopped = function(value) {
    isStopped = value;
  }

  document.body.appendChild(this.scroller);

  window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
    function(/* function */callback, /* DOMElement */element) {
      return window.setTimeout(callback, 1000 / 60);
    };
  })();

  window.cancelRequestAnimFrame = (function() {
    return window.cancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame || clearTimeout
  })();
}
//Create separate canvas for each data item.
RiseVision.Common.HorizontalScroll.prototype.initialize = function() {
  var text = "", self = this;

  this.scroller.onmousemove = function(e) {
    self.handleMouseMove(e);
  }

  this.scroller.onmousedown = function(e) {
    self.handleMouseDown(e);
  }

  this.scroller.onmouseup = function(e) {
    self.handleMouseUp(e);
  }

  this.scroller.onmouseout = function(e) {
    self.handleMouseOut(e);
  }
  //Create 2 Scroller objects.
  for (var i = 0; i < 2; i++) {
    if (this.getScrollDirection() == "rtl") {
      this.setScroller(i, new RiseVision.Common.Scroller(i * this.scroller.width, this.scroller.width, this.scroller.height));
    }
    else {
      this.setScroller(i, new RiseVision.Common.Scroller(-i * this.scroller.width, this.scroller.width, this.scroller.height));
    }
  }

  this.totalWidth = 0;
  this.itemsCount = 1;

  var length = this.data.length;

  if (length > 0) {
    this.loadItem();
  }
}
RiseVision.Common.HorizontalScroll.prototype.loadItem = function() {
  var item = new RiseVision.Common.Item(this.data[this.currentItemIndex], this.scroller, this.getSpacing(), this.getScrollDirection()), self = this;

  item.initialize(function() {
    self.items[self.currentItemIndex] = this;
    self.totalWidth += this.getWidth();
    self.onItemInitialized();
  });
}
RiseVision.Common.HorizontalScroll.prototype.onItemInitialized = function() {
  this.itemCount++;

  //All items have been loaded.
  if (this.itemCount == this.data.length) {
    for (var i = 0; i < this.getScrollers().length; i++) {
      this.adjustCanvas(i);
    }

    this.currentItemIndex = 0;

    readyEvent();
  }
  else {
    this.currentItemIndex++;
    this.loadItem();
  }
}
RiseVision.Common.HorizontalScroll.prototype.adjustCanvas = function(i, swipeDirection) {
  var itemPosition = 0, isCopied = false, isMovingForward = true;

  if (!swipeDirection) {//Auto-scroll
    swipeDirection = this.getScrollDirection();
  }

  if (this.getScrollDirection() == "rtl") {
    if (swipeDirection == "rtl") {
      this.getScroller(i).writeDirection = "forward";
    }
    else {
      this.getScroller(i).writeDirection = "backward";
    }
  }
  else {
    if (swipeDirection == "rtl") {
      this.getScroller(i).writeDirection = "backward";
    }
    else {
      this.getScroller(i).writeDirection = "forward";
    }
  }

  if (this.getScrollBy() == "item") {
    var j, index;

    //Get position at which to start copying based on position of other scroller at which copying was stopped.
    this.getScroller(i).holdPositions = [];
    itemPosition = this.getItemPosition(this.getNextScrollerIndex(i), swipeDirection);

    //Copy until the scroller is filled, or until we have finished copying all of the text associated with the current ID.
    while (this.getScroller(i).totalPixelsCopied < this.getScroller(i).canvas.width) {
      if (this.getScroller(i).totalPixelsCopied == 0) {
        if (((this.getScrollDirection() == "rtl") && (swipeDirection == "rtl")) || ((this.getScrollDirection() == "ltr") && (swipeDirection == "rtl"))) {
          //Save the index of the first item that is being copied.
          this.getScroller(i).startCanvasIndex = this.currentItemIndex;
          this.getScroller(i).startCanvasItem = this.items[this.currentItemIndex];
        }
        else {
          this.getScroller(i).endCanvasIndex = this.currentItemIndex;
          this.getScroller(i).endCanvasItem = this.items[this.currentItemIndex];
        }
      }

      if (this.currentItemIndex != this.previousItemIndex) {
        if (this.getScrollDirection() == "rtl") {
          if (swipeDirection == "rtl") {
            if (this.getScroller(i).writeDirection == "forward") {
              this.getScroller(i).holdPositions.push({
                position : this.getScroller(i).writePosition,
                wasHeld : false
              });
            }
          }
          else {
            if (itemPosition != 0) {
              this.getScroller(i).holdPositions.push({
                position : this.getScroller(i).writePosition,
                wasHeld : false
              });
            }
          }
        }
        else {
          this.getScroller(i).holdPositions.push({
            position : this.getScroller(i).writePosition,
            wasHeld : false
          });
        }
      }

      if (this.getScrollDirection() == "rtl") {
        if (swipeDirection == "rtl") {
          isCopied = this.getScroller(i).drawCanvasFromStart(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection());

          //If the scroller is filled and the ending position is 0, move to the next item.
          if (this.getScroller(i).endCanvasPosition == 0 && this.getScroller(i).writePosition == 0) {
            this.setNextItem(this.currentItemIndex);
          }

          this.getScroller(i).endCanvasIndex = this.currentItemIndex;
          this.getScroller(i).endCanvasItem = this.items[this.currentItemIndex];
        }
        else {
          isCopied = this.getScroller(i).drawCanvasFromEnd(this.items[this.currentItemIndex].canvas, itemPosition);
          this.getScroller(i).startCanvasIndex = this.currentItemIndex;
          this.getScroller(i).startCanvasItem = this.items[this.currentItemIndex];
        }
      }
      else {
        if (swipeDirection == "ltr") {
          isCopied = this.getScroller(i).drawCanvasFromEnd(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection());
          this.getScroller(i).startCanvasIndex = this.currentItemIndex;
          this.getScroller(i).startCanvasItem = this.items[this.currentItemIndex];
        }
        else {
          isCopied = this.getScroller(i).drawCanvasFromStart(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection());
          this.getScroller(i).endCanvasIndex = this.currentItemIndex;
          this.getScroller(i).endCanvasItem = this.items[this.currentItemIndex];
        }
      }

      if (isCopied) {//This item has been copied. Copy the next item if it shares the same id.
        if (this.getScroller(i).writeDirection == "forward") {
          this.setNextItem(this.currentItemIndex);
        }
        else {
          this.setPreviousItem(this.currentItemIndex);
        }
      }

      itemPosition = 0;
    }
  }
  else {
    itemPosition = this.getItemPosition(this.getNextScrollerIndex(i), swipeDirection);

    while (this.getScroller(i).totalPixelsCopied < this.getScroller(i).canvas.width) {
      //Save the index of the first canvas that is being copied.
      if (this.getScroller(i).totalPixelsCopied == 0) {
        if (((this.getScrollDirection() == "rtl") && (swipeDirection == "rtl")) || ((this.getScrollDirection() == "ltr") && (swipeDirection == "rtl"))) {
          this.getScroller(i).startCanvasIndex = this.currentItemIndex;
        }
        else {
          this.getScroller(i).endCanvasIndex = this.currentItemIndex;
        }
      }

      if (this.getScrollDirection() == "rtl") {
        if (swipeDirection == "rtl") {
          isCopied = this.getScroller(i).drawCanvasFromStart(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection());
        }
        else {
          isCopied = this.getScroller(i).drawCanvasFromEnd(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection(), this.getScroller(this.getNextScrollerIndex(i)).writeDirection);
        }
      }
      else {
        if (swipeDirection == "rtl") {
          isCopied = this.getScroller(i).drawCanvasFromStart(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection());
        }
        else {
          isCopied = this.getScroller(i).drawCanvasFromEnd(this.items[this.currentItemIndex].canvas, itemPosition, this.getScrollDirection(), this.getScroller(this.getNextScrollerIndex(i)).writeDirection);
        }
      }

      if (isCopied) {
        if (this.getScroller(i).writeDirection == "forward") {
          this.setNextItem(this.currentItemIndex);
        }
        else {
          this.setPreviousItem(this.currentItemIndex);
        }
      }

      itemPosition = 0;
    }

    //Save the index of the last canvas that is being copied.
    if (((this.getScrollDirection() == "rtl") && (swipeDirection == "rtl")) || ((this.getScrollDirection() == "ltr") && (swipeDirection == "rtl"))) {
      this.getScroller(i).endCanvasIndex = this.currentItemIndex;
    }
    else {
      this.getScroller(i).startCanvasIndex = this.currentItemIndex;
    }
  }

  this.isLoading = false;
  this.getScroller(i).totalPixelsCopied = 0;
}
RiseVision.Common.HorizontalScroll.prototype.getItemPosition = function(j, swipeDirection) {
  var itemPosition;

  if (this.getScrollDirection() == "rtl") {
    if (swipeDirection == "rtl") {
      //Row, Left, auto-scroll
      itemPosition = this.getPositionFromEnd(j, swipeDirection);
    }
    else {
      //Row, Left, swipe in opposite direction
      itemPosition = this.getPositionFromStart(j, swipeDirection);
    }
  }
  else {
    if (swipeDirection == "rtl") {
      //Row, Right, swipe in opposite direction
      itemPosition = this.getPositionFromEnd(j, swipeDirection);
    }
    else {
      //Row, Right, auto-scroll
      itemPosition = this.getPositionFromStart(j, swipeDirection);
    }
  }

  return itemPosition;
}
RiseVision.Common.HorizontalScroll.prototype.getPositionFromStart = function(j, swipeDirection) {
  var itemPosition;

  itemPosition = this.getScroller(j).startCanvasPosition;
  this.currentItemIndex = this.getScroller(j).startCanvasIndex;

  if (this.getScrollDirection() == "rtl" && swipeDirection == "ltr") {
    //If we're at the very beginning of a canvas, move to the previous canvas.
    if (itemPosition == 0) {
      this.setPreviousItem(this.getScroller(j).startCanvasIndex);
    }
  }
  else if (this.getScrollDirection() == "ltr" && swipeDirection == "ltr") {
    //If we're at the very beginning of a canvas, move to the previous canvas.
    if (!this.isLoading) {
      if (itemPosition == 0) {
        this.setNextItem(this.getScroller(j).startCanvasIndex);
      }
    }
  }

  if (!this.isLoading) {
    this.previousItemIndex = this.currentItemIndex;
  }

  return itemPosition;
}
RiseVision.Common.HorizontalScroll.prototype.getPositionFromEnd = function(j, swipeDirection) {
  var itemPosition;

  this.currentItemIndex = this.getScroller(j).endCanvasIndex;
  itemPosition = this.getScroller(j).endCanvasPosition;

  if (this.getScrollDirection() == "ltr" && swipeDirection == "rtl") {
    if (itemPosition == this.items[this.currentItemIndex].canvas.width) {
      this.setPreviousItem(this.getScroller(j).endCanvasIndex);
      itemPosition = 0;
    }
  }
  else if (this.getScrollDirection() == "rtl" && swipeDirection == "rtl") {
    //If we're at the very end of a canvas, move to the next canvas.
    if (itemPosition == this.items[this.currentItemIndex].canvas.width) {
      this.setNextItem(this.getScroller(j).endCanvasIndex);
      itemPosition = 0;
    }
  }

  if (!this.isLoading) {
    this.previousItemIndex = this.currentItemIndex;
  }

  return itemPosition;
}
RiseVision.Common.HorizontalScroll.prototype.getNextScrollerIndex = function(index) {
  var next = ++index;

  if (next >= this.getScrollers().length) {
    next = 0;
  }

  return next;
}
RiseVision.Common.HorizontalScroll.prototype.setNextItem = function(index) {
  var next = ++index;

  if (next >= this.items.length) {
    next = 0;
  }

  this.currentItemIndex = next;

  return next;
}
RiseVision.Common.HorizontalScroll.prototype.setPreviousItem = function(index) {
  var previous = --index;

  if (previous < 0) {
    previous = this.items.length - 1;
  }

  this.currentItemIndex = previous;

  return previous;
}
RiseVision.Common.HorizontalScroll.prototype.drawScene = function() {
  var self = this, difference;

  if (!this.mouseDown && !this.isStopped) {
    this.context.clearRect(0, 0, this.scroller.width, this.scroller.height);

    for (var i = 0; i < this.getScrollers().length; i++) {
      var scroller = this.getScroller(i);

      scroller.x = scroller.x - this.speed;

      if (this.getScrollDirection() == "rtl") {
        difference = scroller.x + this.scroller.width;
      }
      else {
        difference = scroller.x - this.scroller.width;
      }

      if ((difference < 0) && (this.getScrollDirection() == "rtl")) {
        //Move canvas to the end.
        scroller.x = this.scroller.width;
        scroller.x = scroller.x - (-difference);
        this.adjustCanvas(i);
      }
      else if ((difference > 0) && (this.getScrollDirection() == "ltr")) {
        //Move canvas to the start.
        scroller.x = -this.scroller.width;
        scroller.x = scroller.x - (-difference);
        this.adjustCanvas(i);
      }

      this.drawCanvas(scroller.x, i);
    }

    this.setTotalPixels(this.getTotalPixels() + Math.abs(this.speed));

    if (this.totalWidth == 0) {
      this.pause();

      //Wait 5 seconds before triggering Done to prevent it from firing continuously.
      setTimeout(function() {
        if (self.totalWidth == 0) {
          $(self).trigger("done");
        }
        else {
          self.tick();
        }
      }, 5000);
    }
    //PUD is implemented by counting the number of pixels that have been scrolled.
    else if (this.getTotalPixels() > this.totalWidth) {
      this.setTotalPixels(this.getTotalPixels() - this.totalWidth);
      $(this).trigger("done");
    }
  }
}
RiseVision.Common.HorizontalScroll.prototype.drawSceneByItem = function() {
  if (!this.mouseDown && !this.isStopped) {
    var difference = 0;

    //Check if either of the Scrollers should be held.
    for (var i = 0; i < this.getScrollers().length; i++) {
      var scroller = this.getScroller(i);

      if (scroller.holdPositions.length > 0) {
        for (var j = 0; j < scroller.holdPositions.length; j++) {
          if ((scroller.x <= -scroller.holdPositions[j].position) && !scroller.holdPositions[j].wasHeld && this.getScrollDirection() == "rtl") {
            //Position scroller at the hold position.
            difference = scroller.x + scroller.holdPositions[j].position;
            scroller.x = -scroller.holdPositions[j].position;
            this.holdScroller(scroller, i, j);

            break;
          }
          else if ((scroller.x >= scroller.holdPositions[j].position) && !scroller.holdPositions[j].wasHeld && this.getScrollDirection() == "ltr") {
            //Position scroller at the hold position.
            difference = scroller.x - scroller.holdPositions[j].position;
            scroller.x = scroller.holdPositions[j].position;
            this.holdScroller(scroller, i, j);

            break;
          }
          else {
            this.isHolding = false;
          }
        }

        if (this.isHolding) {
          //Adjust other scroller by the same number of pixels.
          var index = this.getNextScrollerIndex(i);

          this.getScroller(index).x = this.getScroller(index).x - difference;
          this.moveCanvas(i);
          this.drawCanvas(this.getScroller(index).x, index);

          break;
        }
      }
      else {
        this.isHolding = false;
      }
    }

    //Draw only if the scroller is not holding.
    if (!this.isHolding) {
      this.context.clearRect(0, 0, this.scroller.width, this.scroller.height);

      for (var i = 0; i < this.getScrollers().length; i++) {
        var scroller = this.getScroller(i), newX = scroller.x - this.speed;

        scroller.x = newX;
        this.moveCanvas(i);
        this.drawCanvas(scroller.x, i);
      }
    }
  }
}
RiseVision.Common.HorizontalScroll.prototype.holdScroller = function(scroller, i, j) {
  scroller.holdPositions[j].wasHeld = true;

  this.context.clearRect(0, 0, this.scroller.width, this.scroller.height);
  this.moveCanvas(i);
  this.drawCanvas(scroller.x, i);
  this.setHoldTimer();
  this.isHolding = true;
}
RiseVision.Common.HorizontalScroll.prototype.moveCanvas = function(i) {
  var scroller = this.getScroller(i), difference;

  if (this.getScrollDirection() == "rtl") {
    difference = scroller.x + this.scroller.width;
  }
  else {
    difference = scroller.x - this.scroller.width;
  }

  //Move canvas to the end.
  if ((difference < 0) && (this.getScrollDirection() == "rtl")) {
    scroller.x = this.scroller.width;
    scroller.x = scroller.x - (-difference);
    this.adjustCanvas(i);
  }
  //Move canvas to the beginning.
  else if ((difference > 0) && (this.getScrollDirection() == "ltr")) {
    scroller.x = -this.scroller.width;
    scroller.x = scroller.x - (-difference);
    this.adjustCanvas(i);
  }
}
//Draw entire Scroller piece onto scroller at 0, 0.
RiseVision.Common.HorizontalScroll.prototype.drawCanvas = function(x, i) {
  var canvas = this.getScroller(i).canvas;

  this.context.save();
  this.context.translate(x, 0);
  this.context.drawImage(canvas, 0, 0, canvas.width, canvas.height);
  this.context.restore();
}
RiseVision.Common.HorizontalScroll.prototype.setHoldTimer = function() {
  var self = this;

  clearTimeout(this.holdTimerID);

  //PUD is implemented by counting the number of items that have been shown.
  if (this.itemsCount > this.items.length - 1) {
    this.itemsCount = 0;
    $(this).trigger("done");
  }
  else {
    this.isHolding = true;
    this.isStopped = true;
    this.holdTimerID = setTimeout(function() {
      self.isHolding = false;
      self.isStopped = false;
      self.itemsCount++;
    }, this.getDuration());
  }
}
RiseVision.Common.HorizontalScroll.prototype.handleMouseDown = function(event) {
  this.mouseDown = true;
  this.lastMouseX = event.clientX;
}
RiseVision.Common.HorizontalScroll.prototype.handleMouseUp = function(event) {
  var self = this;

  this.mouseDown = false;

  if (!this.mouseMove) {
    clearTimeout(this.interactivityTimerID);
    this.isStopped = true;
    this.interactivityTimerID = setTimeout(function() {
      self.isStopped = false;
    }, this.interactivityTimeout);
  }
  else {
    this.mouseMove = false;
  }
}
RiseVision.Common.HorizontalScroll.prototype.handleMouseOut = function(event) {
  this.mouseDown = false;
}
RiseVision.Common.HorizontalScroll.prototype.handleMouseMove = function(event) {
  if (!this.mouseDown) {
    return;
  }

  clearTimeout(this.holdTimerID);
  this.isHolding = false;

  var newX = event.clientX, deltaX = this.lastMouseX - newX, difference;

  this.mouseMove = true;
  this.context.clearRect(0, 0, this.scroller.width, this.scroller.height);

  for (var i = 0; i < this.getScrollers().length; i++) {
    var scroller = this.getScroller(i);

    scroller.x = scroller.x - deltaX;

    if (this.getScrollDirection() == "rtl") {
      if (deltaX > 0) {//Swipe left
        difference = scroller.x + this.scroller.width;

        if (difference < 0) {
          scroller.x = this.scroller.width;
          scroller.x = scroller.x - (-difference);
          this.adjustCanvas(i, "rtl");
        }
      }
      else if (deltaX < 0) {//Swipe right
        difference = scroller.x - this.scroller.width;

        if (difference > 0) {
          scroller.x = -this.scroller.width;
          scroller.x = scroller.x - (-difference);
          this.adjustCanvas(i, "ltr");
        }
      }

      //Flag hold position(s) as having been held when swiping past it.
      for (var j = 0; j < scroller.holdPositions.length; j++) {
        if ((scroller.x <= -scroller.holdPositions[j].position) && !scroller.holdPositions[j].wasHeld) {
          scroller.holdPositions[j].wasHeld = true;
        }
      }
    }
    else {//right
      if (deltaX > 0) {//Swipe left
        difference = scroller.x + this.scroller.width;

        if (difference < 0) {
          scroller.x = this.scroller.width;
          scroller.x = scroller.x - (-difference);
          this.adjustCanvas(i, "rtl");
        }
      }
      else if (deltaX < 0) {//Swipe right
        difference = scroller.x - this.scroller.width;

        if (difference > 0) {
          scroller.x = -this.scroller.width;
          scroller.x = scroller.x - (-difference);
          this.adjustCanvas(i, "ltr");
        }
      }

      //Flag hold position(s) as having been held when swiping past it.
      //Prevent scroller from snapping back to hold position if user has swiped past it.
      for (var j = 0; j < scroller.holdPositions.length; j++) {
        if ((scroller.x <= -scroller.holdPositions[j].position) && !scroller.holdPositions[j].wasHeld && scroller.writeDirection == "forward") {
          scroller.holdPositions[j].wasHeld = true;
        }
        else if ((scroller.x >= scroller.holdPositions[j].position) && !scroller.holdPositions[j].wasHeld && scroller.writeDirection == "backward") {
          scroller.holdPositions[j].wasHeld = true;
        }
      }
    }

    this.drawCanvas(scroller.x, i);
  }

  this.isStopped = false;
  this.lastMouseX = newX;
}
RiseVision.Common.HorizontalScroll.prototype.tick = function() {
  var self = this;

  this.request = requestAnimFrame(function() {
    self.tick();
  });

  if (this.getScrollBy() == "item") {
    this.drawSceneByItem();
  }
  else {
    this.drawScene();
  }
}
RiseVision.Common.HorizontalScroll.prototype.pause = function() {
  cancelRequestAnimFrame(this.request);
}
RiseVision.Common.HorizontalScroll.prototype.updateItem = function(index, data, callback) {
  var self = this, oldItem = this.items[index], newItem = null;

  if (oldItem != null) {
    this.totalWidth -= oldItem.getWidth();
    this.items[index] = null;
    oldItem.destroy();
  }

  newItem = new RiseVision.Common.Item(data, this.scroller, this.getSpacing(), this.getScrollDirection(), index);
  newItem.initialize(function() {
    self.items[index] = this;
    self.totalWidth += this.getWidth();
    newItem = null;

    if (callback) {
      callback();
    }
  });
}
RiseVision.Common.HorizontalScroll.prototype.clear = function() {
  for (var i = 0; i < this.getScrollers().length; i++) {
    this.getScroller(i).clear();
  }

  for (var i = 0; i < this.items.length; i++) {
    this.items[i].destroy();
  }

  this.totalWidth = 0;
  this.items = [];
}

//var svgCanvases = [];
RiseVision.Common.Item = function(data, scroller, padding, scrollDirection, position, isRefreshing) {
  this.svgCanvases = [];
  this.canvas = document.createElement("canvas");
  this.canvas.className = "item";
  this.context = this.canvas.getContext("2d");
  this.context.canvas.height = scroller.height;

  this.data = data;
  //Array of JSON objects representing contents to be drawn for a single item.
  this.index = 0;
  this.width = 0;
  this.writePosition = 0;
  this.scroller = scroller;
  this.padding = padding;
  this.scrollDirection = scrollDirection;
  this.isRefreshing = isRefreshing;
  this.dataIndex = 0;

  if ( typeof position === "undefined") {
    this.position = -1;
  }
  else {
    this.position = position;
  }
}
RiseVision.Common.Item.prototype.getWidth = function() {
  return this.context.canvas.width;
}
RiseVision.Common.Item.prototype.initialize = function(callback) {
  this.callback = callback;
  this.getImage();
}
RiseVision.Common.Item.prototype.getImage = function() {
  var self = this, data = this.data[this.dataIndex], padding;

  if (data) {
    //Remain backwards compatible with old method of specifying padding via the padding parameter.
    //New method is to attach it to the data object.
    padding = (data.padding == null) ? this.padding : data.padding;

    //Check if there are any images to load.
    if (data.type == "image") {
      this.index = this.dataIndex;

      //First check if the image has been cached.
      if (this.svgCanvases.length > 0) {
        $.each(this.svgCanvases, function(index, canvas) {
          if (canvas.url == data.value) {
            data.svg = self.svgCanvases[index].canvas;
            return false;
          }
        });

        if (data.svg) {
          this.width += data.svg.width + padding;
          this.dataIndex++;
          this.getImage();
        }
        else {
          this.loadImage(data.value);
        }
      }
      else {
        this.loadImage(data.value);
      }
    }
    else {//Text
      this.createTempText(data.value, data.fontRule, padding);
      this.dataIndex++;
      this.getImage();
    }
  }
  else {//All images loaded.
    this.drawCanvas();
  }
}
RiseVision.Common.Item.prototype.loadImage = function(url) {
  var params = {}, self = this;

  //Need to use makeRequest to get around cross-domain issues for loading SVG images.
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT;
  gadgets.io.makeRequest(url, function(obj) {
    //Save the SVG data.
    if (obj.data) {
      var data = self.data[self.dataIndex];

      data.svg = obj.data;
      self.createTempImage(self.dataIndex, data.svg, data.value);
    }

    self.dataIndex++;
    self.getImage();
  }, params);

  //Load regular images.
  //    var image = new Image();
  //
  //    image.onload = function() {
  //  callback(this);
  //    };
  //    image.onerror = function(e) {
  //  callback(this);
  //    };
  //    image.crossOrigin = 'anonymous'; // no credentials flag
  //    image.src = this.logo;
  //    this.image = image;
}
//Necessary for getting the width of the image when drawn onto the canvas.
RiseVision.Common.Item.prototype.createTempImage = function(i, svg, url) {
  var svgCanvas = document.createElement("canvas"), //Canvas on which the SVG image will be drawn.
  svgContext = svgCanvas.getContext("2d"), padding = (this.data[i].padding == null) ? this.padding : this.data[i].padding, id = "svg";

  svgCanvas.id = id;
  svgCanvas.height = this.scroller.height - 10;
  //Leave 5px of padding at top and bottom.
  svgCanvas.width = this.scroller.height - 10;
  //Necessary in order for scaling to work.

  document.body.appendChild(svgCanvas);

  //Draw the image and scale the height to fill the scroller.
  canvg(id, svg, {
    scaleHeight : true,
    ignoreDimensions : true
  });

  this.width += svgCanvas.width + padding;
  this.data[i].svg = svgCanvas;

  this.svgCanvases.push({
    "url" : url,
    "canvas" : svgCanvas
  });

  document.body.removeChild(svgCanvas);
}
RiseVision.Common.Item.prototype.createImage = function(i, svg) {
  var padding = (this.data[i].padding == null) ? this.padding : this.data[i].padding;

  //Scale the non-SVG image if necessary.
  //    var ratio = 1;
  //
  //    if (this.image.height > scroller.height) {
  //  ratio = scroller.height / this.image.height;
  //    }
  //    else if (this.image.width > scroller.width) {
  //  ratio = scroller.width / this.image.width;
  //    }

  //Draw the image after the text and starting 5px from the top.
  if (this.scrollDirection == "rtl") {
    this.context.drawImage(this.data[i].svg, 0, 0, this.data[i].svg.width, this.data[i].svg.height, this.writePosition, 5, this.data[i].svg.width, this.data[i].svg.height);
    this.writePosition += this.data[i].svg.width + padding;
  }
  else {
    this.context.drawImage(this.data[i].svg, 0, 0, this.data[i].svg.width, this.data[i].svg.height, this.writePosition + padding, 5, this.data[i].svg.width, this.data[i].svg.height);
    this.writePosition += this.data[i].svg.width + padding;
  }
}
/* Text is written to a temporary canvas first so that the width of the text can be determined.
 This is then used to set the width of the actual canvas, which needs to be done before being written to. */
RiseVision.Common.Item.prototype.createTempText = function(value, fontRule, padding) {
  var textCanvas = document.createElement("canvas"), textContext = textCanvas.getContext("2d");

  this.writeText(value, fontRule, padding, textContext);
  this.width += textContext.measureText(value).width + padding;
}
/* Write the text to the actual canvas. */
RiseVision.Common.Item.prototype.createText = function(value, fontRule, padding) {
  this.writeText(value, fontRule, padding, this.context);
  this.writePosition += this.context.measureText(value).width + padding;
}
RiseVision.Common.Item.prototype.writeText = function(text, fontRule, padding, context) {
  var topOffset = context.canvas.height / 2, //Y coordinate at which to being drawing (vertical alignment).
  rules = "", canvasFont = "";

  rules = RiseVision.Common.Utility.parseCSSRule(fontRule);

  if ((rules[3] != null) && (rules[3] != "normal")) {
    canvasFont += rules[3] + " ";
  }

  if ((rules[4] != null) && (rules[4] != "normal")) {
    canvasFont += rules[4] + " ";
  }

  canvasFont += rules[2] + " " + rules[0];

  context.font = canvasFont;
  context.strokeStyle = rules[1];
  context.textAlign = "left";
  context.textBaseline = "middle";

  context.save();
  context.translate(0, topOffset);

  context.fillStyle = rules[1];

  if (this.scrollDirection == "rtl") {
    context.fillText(text, this.writePosition + padding, 0);
  }
  else {//ltr
    context.fillText(text, this.writePosition + padding, 0);
  }

  context.restore();
}
RiseVision.Common.Item.prototype.drawCanvas = function() {
  var length = this.data.length, padding;

  this.context.canvas.width = this.width;
  this.context.canvas.style.display = "none";

  //Draw to canvas.
  for (var i = 0; i < length; i++) {
    padding = (this.data[i].padding == null) ? this.padding : this.data[i].padding;

    if (this.data[i].type == "text") {
      this.createText(this.data[i].value, this.data[i].fontRule, padding);
    }
    else if (this.data[i].type == "image") {
      if (this.data[i].svg) {
        this.createImage(i, this.data[i].svg);
      }
    }
  }

  this.addCanvas();
  this.callback();
}
RiseVision.Common.Item.prototype.addCanvas = function() {
  if (this.position != -1) {
    var $item = $(".item").eq(this.position);

    if ($item.length > 0) {
      $(this.canvas).insertBefore($item);
    }
    else {//Add it to the end.
      document.body.appendChild(this.canvas);
    }
  }
  else {
    document.body.appendChild(this.canvas);
  }
}
RiseVision.Common.Item.prototype.destroy = function() {
  document.body.removeChild(this.canvas);
  this.context = null;
  this.canvas = null;
  this.data = null;
  this.scroller = null;
  this.callback = null;
}
RiseVision.Common.Item.prototype.getFontHeight = function(fontStyle) {
  var body = document.getElementsByTagName("body")[0], dummy = document.createElement("div"), dummyText = document.createTextNode("M"), result;

  dummy.setAttribute("style", fontStyle);
  body.appendChild(dummy);
  dummy.appendChild(dummyText);

  result = dummy.offsetHeight;

  dummy.removeChild(dummyText);
  body.removeChild(dummy);

  body = null;
  dummy = null;
  dummyText = null;

  return result;
}
/* Parent class for all scrollers. */
RiseVision.Common.Scroller = function(xPos, width, height) {
  this.canvas = document.createElement("canvas");
  this.canvas.width = width;
  this.canvas.height = height;
  this.context = this.canvas.getContext("2d");

  this.x = xPos;
  this.startCanvasItem = null;
  this.endCanvasItem = null;
  this.startCanvasIndex = 0;
  //Index of the first canvas to be copied onto the scroller.
  this.endCanvasIndex = 0;
  //Index of the last canvas to be copied onto the scroller.
  this.startCanvasPosition = 0;
  //Position at which the canvas at index startCanvasIndex started being copied.
  this.endCanvasPosition = 0;
  //Position at which the canvas at index endCanvasIndex finished being copied.
  this.writeDirection = "forward";
  this.totalPixelsCopied = 0;
  this.writePosition = 0;
  this.holdPositions = [];

  //document.body.appendChild(document.createElement("div"));
  //document.body.appendChild(this.canvas);
}
RiseVision.Common.Scroller.prototype.clear = function() {
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
/* Draw starting from beginning of scroller. */
RiseVision.Common.Scroller.prototype.drawCanvasFromStart = function(canvas, currentItemPosition, scrollDirection) {//canvas = item's canvas
  var context2D = canvas.getContext("2d"), pixelsRemaining = this.canvas.width - this.totalPixelsCopied, isCanvasCopied = false, pixelsCopied = 0, imageData = null, width;

  //Only set this on first time through.
  if (this.totalPixelsCopied == 0) {
    this.startCanvasPosition = currentItemPosition;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  if (scrollDirection == "rtl") {
    if (currentItemPosition == 0) {//All canvases except first one to be written.
      width = canvas.width;
    }
    else {
      width = canvas.width - currentItemPosition;
    }
  }
  else {
    width = canvas.width - currentItemPosition;
  }

  //Content that remains to be shown is shorter than the scroller.
  if (width <= pixelsRemaining) {
    if (width > 0) {
      imageData = context2D.getImageData(currentItemPosition, 0, width, canvas.height);
    }

    pixelsCopied = width;
    this.totalPixelsCopied += pixelsCopied;
    currentItemPosition = 0;
    isCanvasCopied = true;
  }
  else {
    imageData = context2D.getImageData(currentItemPosition, 0, pixelsRemaining, canvas.height);
    pixelsCopied = pixelsRemaining;
    this.totalPixelsCopied += pixelsRemaining;
    currentItemPosition += pixelsRemaining;
  }

  //Paint the pixel data into the context.
  if (imageData) {
    this.context.putImageData(imageData, this.writePosition, 0);
  }

  this.writePosition += pixelsCopied;
  this.endCanvasPosition = currentItemPosition;
  //Indicates how many pixels have been copied already.

  if (this.totalPixelsCopied >= this.canvas.width) {
    this.writePosition = 0;
  }

  imageData = null;

  return isCanvasCopied;
}
/* Draw starting from end of scroller. */
RiseVision.Common.Scroller.prototype.drawCanvasFromEnd = function(canvas, currentItemPosition) {
  var context2D = canvas.getContext("2d"), pixelsRemaining = this.canvas.width - this.totalPixelsCopied, isCanvasCopied = false, pixelsCopied = 0, imageData, width;

  if (currentItemPosition == 0) {//All canvases except first one to be written.
    width = canvas.width;
    currentItemPosition = width;
  }
  else {
    width = currentItemPosition;
  }

  //Only set this on first time through. We're working backwards here.
  if (this.totalPixelsCopied == 0) {
    this.endCanvasPosition = width;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  //Content that remains to be shown is shorter than the scroller.
  if (width <= pixelsRemaining) {
    imageData = context2D.getImageData(0, 0, width, canvas.height);
    pixelsCopied = width;
    this.totalPixelsCopied += pixelsCopied;
    currentItemPosition = 0;
    isCanvasCopied = true;
  }
  else {
    imageData = context2D.getImageData(width - pixelsRemaining, 0, pixelsRemaining, canvas.height);
    pixelsCopied = pixelsRemaining;
    this.totalPixelsCopied += pixelsRemaining;
    currentItemPosition -= pixelsRemaining;
  }

  //Paint the pixel data into the context.
  this.context.putImageData(imageData, this.canvas.width - this.totalPixelsCopied, 0);
  this.startCanvasPosition = currentItemPosition;
  //Indicates how many pixels have been copied already.
  this.writePosition += pixelsCopied;

  if (this.totalPixelsCopied >= this.canvas.width) {
    this.writePosition = 0;
  }

  imageData = null;

  return isCanvasCopied;
}
