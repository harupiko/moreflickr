
$(document).ready(function() {

    var API_KEY = "9c1aad3c59cc7857a6ce3f5611723faf";
    var FLICKR_URL_REG = /.*flickr\.com/;

    // create Flickr Url obj
    function parseFlickrUrl(url) { // {{{
        var parser = document.createElement('a');
        parser.href = url;

        if (!parser.hostname.match(FLICKR_URL_REG)) {
            return null;
        }
        var paths = parser.pathname.split('/');
        var files = paths[2].split('_');
        var exts  = files[2].split('.');
        var flickr = {url: url};
        flickr.protocol = parser.protocol;
        flickr.hostname = parser.hostname;
        flickr.serverid = paths[1];
        flickr.id = files[0];
        flickr.secret = files[1];
        flickr.size = exts[0];
        flickr.type = exts[1];

        return flickr;
    } // }}}

    //Square, Large Square, Thumbnail, Small, Small 320, Medium, Medium 640, Medium 800, Large, Large 1600, Large 2048
    function getFlickrImageUrl(photo_id, size, callback) { // {{{
        $.getJSON(
            "http://api.flickr.com/services/rest/",
            {
                method: "flickr.photos.getSizes",
                api_key: API_KEY,
                photo_id: photo_id,
                format: "json",
                nojsoncallback: 1
            }, function(data) {
                if(data.stat == 'ok'){
                    $.each(data.sizes.size, function(i, item) {
                        if (typeof size === "function") {
                            callback = size;
                            size = "Medium";
                        }
                        if (item.label === size) {
                            callback&&callback(item.source);
                            return;
                        }
                    });
                }
            });
    } // }}}

    // Get Exif
    function getFlickrExif(photo_id, callback) { // {{{
        $.getJSON(
            "http://api.flickr.com/services/rest/",
            {
                method: "flickr.photos.getExif",
                api_key: API_KEY,
                photo_id: photo_id,
                format: "json",
                nojsoncallback: 1
            }, function(data) {
                if(data.stat == 'ok'){
                    var f = {};
                    f.camera = data.photo.camera;
                    $.each(data.photo.exif, function(i, item) {
                        if (item.label === "Exposure") f.exposure = item.raw._content;
                        if (item.label === "Aperture") f.aperture = item.raw._content;
                        if (item.label === "Focal Length") f.focallength = item.raw._content.replace(' ','');
                        if (item.label === "ISO Speed") f.iso = item.raw._content;
                    })
                    callback&&callback(f);
                }
            });
    } // }}}

    // Change Flickr image size
    function changeFlickrImages(size) { // {{{
        var imgs = $("img").filter(function(idx) {
            return $(this).attr("src").match(FLICKR_URL_REG)
        }).each(function() {
            var url = $(this).attr("src");
            var f = parseFlickrUrl(url);

            var self = $(this);
            getFlickrImageUrl(f.id, size, function(new_url) {
                // add Exif info
                getFlickrExif(f.id, function(obj) {
                    function makeText(obj) {
                        var t = '';
                        if (obj.camera&&typeof obj.camera !== "undefined") {
                            t += obj.camera;
                        }
                        if (typeof obj.focallength !== "undefined") {
                            t += ' ' + obj.focallength;
                        }
                        if (typeof obj.aperture !== "undefined") {
                            t += ' F' + obj.aperture;
                        }
                        if (typeof obj.iso !== "undefined") {
                            t += ' ISO' + obj.iso;
                        }
                        if (typeof obj.exposure !== "undefined") {
                            t += ' ' + obj.exposure + 'sec';
                        }
                        return t;
                    }
                    var h = makeText(obj);
                    if (h) {
                        $('<p class="flickr_exif">' + h + '</p>').insertAfter(self);
                    }
                });

                // Do nothing for same image
                if (url === new_url) {
                    return;
                }

                // if new image is not found, revert to original one
                function revert(target) {
                    target.attr("src", url);
                }

                self.one("load", function() {
                    var width = self.width();
                    var height = self.height();
                    if (width === 500 && height === 374) { // flickr redirect image
                        revert(self);
                    }
                }).one("error", function() {
                    revert(self);
                });

                self.attr("src", new_url);
            });

        });
    } // }}}


    function update() {
        var dpr = 1;
        if (window.devicePixelRatio !== undefined) {
            dpr = window.devicePixelRatio;
        }

        if (dpr > 1) {
            changeFlickrImages("Large 2048");
        } else {
            changeFlickrImages("Large");
        }
    }

    update();
});


