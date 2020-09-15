import {Meteor} from 'meteor/meteor';
import {createWriteStream, lstatSync, readdirSync, readFile, readFileSync, existsSync} from "fs";
import {basename, extname, join, dirname, parse} from "path";
import url from "url";
import ColorScheme from "color-scheme";
import config from "./config";
import * as THREE from 'three';
import imageSize from "image-size"

let {classes} = config;

Meteor.methods({
    'getClassesSets'() {
        const data = config.setsOfClasses;
        const scheme = new ColorScheme;
        scheme.from_hue(0)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('soft');   // Use the 'soft' color variation
        let colors = scheme.colors();
        scheme.from_hue(10)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('pastel');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(20)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(30)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(40)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        colors = colors.map(c => "#" + c);
        data.forEach(soc => {
            soc.objects.forEach((oc, i) => {
                if (!oc.color) {
                    oc.color = colors[i];
                }
            })
        });
        return data;
    },
    'getDamagesSets'() {
        const data = config.setsOfDamages;
        const scheme = new ColorScheme;
        scheme.from_hue(0)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('soft');   // Use the 'soft' color variation
        let colors = scheme.colors();
        scheme.from_hue(10)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('pastel');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(20)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(30)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        scheme.from_hue(40)         // Start the scheme
            .scheme('tetrade')     // Use the 'triade' scheme, that is, colors
            // selected from 3 points equidistant around
            // the color wheel.
            .variation('hard');   // Use the 'soft' color variation
        colors = colors.concat(scheme.colors());
        colors = colors.map(c => "#" + c);
        data.forEach(sod => {
            sod.objects.forEach((od, i) => {
                if (!od.color) {
                    od.color = colors[i];
                }
            })
        });
        return data;
    },
    /*
        'rebuildTagList'() {
            const all = SseSamples.find().fetch();
            const tags = new Set();
            all.forEach(s => {
                if (s.tags) {
                    s.tags.forEach(t => {
                        tags.add(t)
                    })
                }
            });
            SseProps.remove({});
            SseProps.upsert({key: "tags"}, {key: "tags", value: Array.from(tags)});
        },
    */
    'images'(folder, pageIndex, pageLength) {
        const isDirectory = source => lstatSync(source).isDirectory();
        const isImage = source => {
            const stat = lstatSync(source);
            return (stat.isFile() || stat.isSymbolicLink()) &&
                (
                    extname(source).toLowerCase() == ".bmp" ||
                    extname(source).toLowerCase() == ".jpeg" ||
                    extname(source).toLowerCase() == ".jpg" ||
                    extname(source).toLowerCase() == ".pcd" ||
                    extname(source).toLowerCase() == ".png"
                )
        };
        const getDirectories = source =>
            readdirSync(source).map(name => join(source, name)).filter(isDirectory).map(a => basename(a));

        const getImages = source =>
            readdirSync(source).map(name => join(source, name)).filter(isImage);

        const getImageDesc = path => {
            return {
                name: basename(path),
                editUrl: "/edit/" + encodeURIComponent(folderSlash + basename(path)),
                url: (folderSlash ? "/" + folderSlash : "") + "" + basename(path)
            };
        };

        const getFolderDesc = (path) => {
            return {
                name: basename(path),
                url: `/browse/${pageIndex}/${pageLength}/` + encodeURIComponent(folderSlash + path)
            }
        };

        pageIndex = parseInt(pageIndex);
        pageLength = parseInt(pageLength);
        const folderSlash = folder ? decodeURIComponent(folder) + "/" : "/";
        const leaf = join(config.imagesFolder, (folderSlash ? folderSlash : ""));

        const existing = existsSync(leaf);

        if (existing && !isDirectory(leaf)) {
            return {error: leaf + " is a file but should be a folder. Check the documentation and your settings.json"};
        }
        if (!existing) {
            return {error: leaf + " does not exists. Check the documentation and your settings.json"};
        }

        const dirs = getDirectories(leaf);
        const images = getImages(leaf);
        const res = {
            folders: dirs.map(getFolderDesc),
            images: images.map(getImageDesc).slice(pageIndex * pageLength, pageIndex * pageLength + pageLength),
            imagesCount: images.length
        };

        if (pageIndex * pageLength + pageLength < images.length) {
            res.nextPage = `/browse/${pageIndex + 1}/${pageLength}/` + (encodeURIComponent(folder) || "");
        }
        if (pageIndex > 0) {
            res.previousPage = `/browse/${pageIndex - 1}/${pageLength}/` + (encodeURIComponent(folder) || "");
        }

        return res;
    },

    'cloudData'(path) {
                
        var m = THREE.Matrix4();

        const imagesData = path => {
            var bundlerFileName = parse(basename(decodeURIComponent(path))).name + ".out";
            var bundlerFilePath = join(config.imagesFolder, dirname(decodeURIComponent(path)), bundlerFileName); 

            var lines = readFileSync(bundlerFilePath, 'utf8').toString().split("\n");

            var imagesCount = lines[1].split(' ')[0];
            
            var res = [];

            for(i = 2; i < imagesCount * 5; i += 5) {
                var focal = lines[i].split(' ')[0];

                var M3 = new THREE.Matrix3();
                var M4 = new THREE.Matrix4();
                var D = new THREE.Matrix4();
    
                M3.set( 
                    lines[i+1].split(' ')[0], lines[i+1].split(' ')[1], lines[i+1].split(' ')[2],
                    lines[i+2].split(' ')[0], lines[i+2].split(' ')[1], lines[i+2].split(' ')[2],
                    lines[i+3].split(' ')[0], lines[i+3].split(' ')[1], lines[i+3].split(' ')[2]
                );

                M4.set( 
                    lines[i+1].split(' ')[0], lines[i+1].split(' ')[1], lines[i+1].split(' ')[2], 0,
                    lines[i+2].split(' ')[0], lines[i+2].split(' ')[1], lines[i+2].split(' ')[2], 0,
                    lines[i+3].split(' ')[0], lines[i+3].split(' ')[1], lines[i+3].split(' ')[2], 0,
                    0, 0, 0, 1 );
    
                var T = new THREE.Vector3(lines[i+4].split(' ')[0], lines[i+4].split(' ')[1], lines[i+4].split(' ')[2]).applyMatrix3(M3.transpose());
                    
                D.identity();
                D.makeScale(1, -1, -1);            
    
                var R = D.multiply(M4);          

                res.push({focal: focal, R: R, T: T});
            }

            return res;
        };
        const isImage = source => {
            const stat = lstatSync(source);
            return (stat.isFile() || stat.isSymbolicLink()) &&
                (
                    extname(source).toLowerCase() == ".bmp" ||
                    extname(source).toLowerCase() == ".jpeg" ||
                    extname(source).toLowerCase() == ".jpg" ||
                    extname(source).toLowerCase() == ".pcd" ||
                    extname(source).toLowerCase() == ".png"
                )
        };

        const data = imagesData(path);

        const getImageDesc = path => {
            var index = parseInt(parse(basename(decodeURIComponent(path))).name);
            var url = (folderSlash ? folderSlash : "") + "images/" + basename(path)
            var dimensions = imageSize(join(config.imagesFolder, url));            
            return {
                name: basename(path),
                data: data[index],
                url: url,
                width: dimensions.width,
                height: dimensions.height
            };
        };

        const getImages = source =>
            readdirSync(source).map(name => join(source, name)).filter(isImage);

        const folderSlash = path ? dirname(decodeURIComponent(path)).substring(1) + "/" : "/";
        const leaf = join(config.imagesFolder, dirname(decodeURIComponent(path)), 'images');
        const images = getImages(leaf);

        const res = {
            images: images.map(getImageDesc),
            imagesCount: images.length
        };

        return res;
    },

    'saveData'(sample) {
        const attrs = url.parse(sample.url);
        let path = decodeURIComponent(attrs.pathname);
        sample.folder = path.substring(1, path.lastIndexOf("/"));
        sample.file = path.substring(path.lastIndexOf("/") + 1);
        sample.lastEditDate = new Date();
        if (!sample.firstEditDate)
            sample.firstEditDate = new Date();
        if (sample.tags) {
            SseProps.upsert({key: "tags"}, {$addToSet: {value: {$each: sample.tags}}});
        }
        SseSamples.upsert({url: sample.url}, sample);
    }
});
