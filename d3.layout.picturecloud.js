/*
pulire
nuovo repo
nuova struttura piu' mia
citare jdavies per le spirali e il tutto
area calcolata autom
immagini

togliere dipendenza da size e esporre parametri decenti per il piazzamento
*/

// Word cloud layout by Jason Davies, http://www.jasondavies.com/word-cloud/
// Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf
(function(exports) {
  function cloud() {
    var size = [256, 256],
        extent, // the actual region occupied by the pictures
        url = cloudUrl,
        aspectRatio = 0.6, // FIXME remove fixed aspect ratio
        width = cloudWidth,
        height = cloudHeight,
        padding = cloudPadding,
        spiral = rectangularSpiral,
        pictures = [],
        timeInterval = 300,
        event = d3.dispatch("picture", "end"),
        timer = null,
        cloud = {};

    cloud.start = function() {
      var bounds = null,
          n = pictures.length,
          i = -1,
          images = [],
          data = pictures.map(function(d, i) {
            d.url = url.call(this, d, i);
            d.width = width.call(this, d, i, aspectRatio);
            d.height = height.call(this, d, i, aspectRatio);
            d.padding = padding.call(this, d, i);
            return d;
          }).sort(function(a, b) { return b.width*b.height - a.width*a.height; });

      if (timer) clearInterval(timer);
      timer = setInterval(step, 0);
      step();

      return cloud;

      function step() {
        var start = +new Date,
            d;
        while (+new Date - start < timeInterval && ++i < n && timer) {
          d = data[i];
          d.x = ((size[0] * (Math.random() + .5)) >> 1) - size[0]/2;
          d.y = ((size[1] * (Math.random() + .5)) >> 1) - size[1]/2;
          // console.log({x:d.x,y:d.y});
          if (place(data, d, i, bounds)) {
            images.push(d);
            
            // enlarge the extent
            extent = {
                left: Math.min(extent.left, d.x-d.width/2.0-d.padding),
                right: Math.max(extent.right, d.x+d.width/2.0+d.padding),
                top: Math.min(extent.top, d.y-d.height/2.0-d.padding),
                bottom: Math.max(extent.bottom, d.y+d.height/2.0+d.padding)
            };
            
            // trigger the 'picture ready' event
            event.picture(d, extent);
            
            
            // if (bounds) cloudBounds(bounds, d);
            // else bounds = [{x: d.x + d.x0, y: d.y + d.y0}, {x: d.x + d.x1, y: d.y + d.y1}];
            // Temporary hack
            // d.x -= size[0] >> 1;
            // d.y -= size[1] >> 1;
          }
        }
        if (i >= n) {
          cloud.stop();
          event.end(images, bounds, extent);
        }
      }
    }

    cloud.stop = function() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      return cloud;
    };

    cloud.timeInterval = function(x) {
      if (!arguments.length) return timeInterval;
      timeInterval = x == null ? Infinity : x;
      return cloud;
    };

    function place(data, image, i, bounds) {
      var startX = image.x,
          startY = image.y,
          maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]),
          s = spiral(size),
          dt = Math.random() < .5 ? 1 : -1,
          t = -dt,
          dxdy,
          dx,
          dy,
          collisions=0;
      
      outermost:
      while (dxdy = s(t += dt)) {
        dx = ~~dxdy[0];
        dy = ~~dxdy[1];
        
        // FIXME explicit control on maxDelta?
        // if (Math.min(dx, dy) > maxDelta) break;

        image.x = startX + dx;
        image.y = startY + dy;
        
        // check collisions
        for (var j=0; j<i; j++) {
            r1 = {
                left: image.x - image.width/2.0 - image.padding,
                right: image.x + image.width/2.0 + image.padding,
                top: image.y - image.height/2.0 - image.padding,
                bottom: image.y + image.height/2.0 + image.padding
            };
            r2 = {
                left: data[j].x - data[j].width/2.0 - data[j].padding,
                right: data[j].x + data[j].width/2.0 + data[j].padding,
                top: data[j].y - data[j].height/2.0 - data[j].padding,
                bottom: data[j].y + data[j].height/2.0 + data[j].padding
            };
            collision = !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
            if(collision) collisions++;
            if (collision) continue outermost;
        }
        // console.log('ok '+collisions);
        return true;
      }
      // console.log('ko '+collisions);
      return false;
    }

    cloud.pictures = function(x) {
      if (!arguments.length) return pictures;
      pictures = x;
      return cloud;
    };

    cloud.size = function(x) {
      if (!arguments.length) return size;
      size = [+x[0], +x[1]];
      extent = {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
      };
      return cloud;
    };

    cloud.spiral = function(x) {
      if (!arguments.length) return spiral;
      spiral = spirals[x + ""] || x;
      return cloud;
    };

    cloud.padding = function(x) {
      if (!arguments.length) return padding;
      padding = d3.functor(x);
      return cloud;
    };

    return d3.rebind(cloud, event, "on");
  }

  function cloudUrl(d) {
    return d.url;
  }
  
  function cloudWidth(d, i, aspectRatio) {
    // area encoding
    return d.width = Math.sqrt(d.weight) / Math.sqrt(aspectRatio);
  }
  
  function cloudHeight(d, i, aspectRatio) {
    // area encoding
    return d.height = Math.sqrt(d.weight) * Math.sqrt(aspectRatio);
  }

  function cloudPadding() {
    return 1;
  }

  function archimedeanSpiral(size) {
    var e = size[0] / size[1];
    return function(t) {
      return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
    };
  }

  function rectangularSpiral(size) {
    var dy = 4,
        dx = dy * size[0] / size[1],
        x = 0,
        y = 0;
    return function(t) {
      var sign = t < 0 ? -1 : 1;
      // See triangular numbers: T_n = n * (n + 1) / 2.
      switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
        case 0:  x += dx; break;
        case 1:  y += dy; break;
        case 2:  x -= dx; break;
        default: y -= dy; break;
      }
      return [x, y];
    };
  }

  exports.picturecloud = cloud;
})(typeof exports === "undefined" ? d3.layout || (d3.layout = {}) : exports);
