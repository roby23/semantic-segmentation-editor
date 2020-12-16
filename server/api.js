import SseDataWorkerServer from "./SseDataWorkerServer";
import configurationFile from "./config";
import {basename} from "path";
import {readFile, writeFile} from "fs";
import * as THREE from 'three';
import SsePCDLoader from "../imports/editor/3d/SsePCDLoader";
import SsePLYLoader from "../imports/editor/3d/SsePLYLoader";

WebApp.connectHandlers.use("/api/json", generateJson);
WebApp.connectHandlers.use("/api/plyfile", saveLabelledPointCloud.bind({fileMode: true}));
WebApp.connectHandlers.use("/api/listing", imagesListing);

const {imagesFolder, pointcloudsFolder, setsOfClassesMap} = configurationFile;
new SsePCDLoader(THREE);
new SsePLYLoader(THREE);

function imagesListing(req, res, next) {
    const all = SseSamples.find({}, {
        fields: {
            url: 1,
            folder: 1,
            file: 1,
            tags: 1,
            firstEditDate: 1,
            lastEditDate: 1
        }
    }).fetch();
    res.end(JSON.stringify(all, null, 1));
}

function generateJson(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    const item = SseSamples.findOne({url: req.url});
    if (item) {
        const soc = setsOfClassesMap.get(item.socName);
        item.objects.forEach(obj => {
            obj.label = soc.objects[obj.classIndex].label;
            //obj.damage = soc.objects[obj.damageIndex].label;
        });
        res.end(JSON.stringify(item, null, 1));
    }else{
        res.end("{}");
    }
}

function generatePCDOutput(req, res, next) {
    const pcdFile = imagesFolder + decodeURIComponent(req.url);
    const fileName = basename(pcdFile);
    const labelFile = pointcloudsFolder + decodeURIComponent(req.url) + ".labels";
    const damageFile = pointcloudsFolder + decodeURIComponent(req.url) + ".damages";
    const objectFile = pointcloudsFolder + decodeURIComponent(req.url) + ".objects";

    if (this.fileMode) {
        res.setHeader('Content-disposition', 'attachment; filename=DOC'.replace("DOC", fileName));
        res.setHeader('Content-type', 'text/plain');
        res.charset = 'UTF-8';
    }


    readFile(pcdFile, (err, content) => {
        if (err) {
            res.end("Error while parsing PCD file.")
        }

        const loader = new THREE.PCDLoader(true);
        const pcdContent = loader.parse(content.buffer, "");
        const hasRgb = pcdContent.rgb.length > 0;
        const head = pcdContent.header;
        const rgb2int = rgb => rgb[2] + 256 * rgb[1] + 256 * 256 * rgb[0];

        let out = "VERSION .7\n";
        out += hasRgb ? "FIELDS x y z rgb label damage object\n" : "FIELDS x y z label damage object\n";
        out += hasRgb ? "SIZE 4 4 4 4 4 4 4\n" : "SIZE 4 4 4 4 4 4\n";
        out += hasRgb ? "TYPE F F F I I I I\n" : "TYPE F F F I I I\n";
        out += hasRgb ? "COUNT 1 1 1 1 1 1 1\n" : "COUNT 1 1 1 1 1 1\n";
        out += "WIDTH " + pcdContent.header.width + "\n";
        out += "HEIGHT " + pcdContent.header.height + "\n";
        out += "POINTS " + pcdContent.header.width*pcdContent.header.height + "\n";
        out += "VIEWPOINT " + head.viewpoint.tx;
        out += " " + head.viewpoint.ty;
        out += " " + head.viewpoint.tz;
        out += " " + head.viewpoint.qw;
        out += " " + head.viewpoint.qx;
        out += " " + head.viewpoint.qy;
        out += " " + head.viewpoint.qz + "\n";
        out += "DATA ascii\n";
        res.write(out);
        out = "";
        readFile(labelFile, (labelErr, labelContent) => {
            if (labelErr) {
                res.end("Error while parsing labels file.")
            }
            const labels = SseDataWorkerServer.uncompress(labelContent);

            readFile(damageFile, (damageErr, damageContent) => {
                if (damageErr) {
                    res.end("Error while parsing damages file.")
                }
                const damages = SseDataWorkerServer.uncompress(damageContent);

                readFile(objectFile, (objectErr, objectContent) => {
                    let objectsAvailable = true;
                    if (objectErr) {
                        objectsAvailable = false;
                    }

                    const objectByPointIndex = new Map();

                    if (objectsAvailable) {
                        const objects = SseDataWorkerServer.uncompress(objectContent);
                        objects.forEach((obj, objIndex) => {
                            obj.points.forEach(ptIdx => {
                                objectByPointIndex.set(ptIdx, objIndex);
                            })
                        });
                    }
                    let obj;

                    pcdContent.position.forEach((v, i) => {
                        const position = Math.floor(i / 3);

                        switch (i % 3) {
                            case 0:
                                if (hasRgb) {
                                    obj = {rgb: pcdContent.rgb[position], x: v};
                                }else{
                                    obj = {x: v};
                                }
                                break;
                            case 1:
                                obj.y = v;
                                break;
                            case 2:
                                obj.z = v;
                                out += obj.x + " " + obj.y + " " + obj.z + " ";
                                if (hasRgb) {
                                    out += rgb2int(obj.rgb) + " ";
                                }
                                out += labels[position] + " ";
                                out += damages[position] + " ";
                                const assignedObject = objectByPointIndex.get(position);
                                if (assignedObject != undefined)
                                    out += assignedObject;
                                else
                                    out += "-1";
                                out += "\n";
                                res.write(out);
                                out = "";
                                break;
                        }
                    });

                    res.end()
                })
            })
        });
    });
}

function generatePLYOutput(req, res, next) {
    const plyFile = imagesFolder + decodeURIComponent(req.url);
    const fileName = basename(plyFile);
    const labelFile = pointcloudsFolder + decodeURIComponent(req.url) + ".labels";
    const damageFile = pointcloudsFolder + decodeURIComponent(req.url) + ".damages";    

    if (this.fileMode) {
        res.setHeader('Content-disposition', 'attachment; filename=DOC'.replace("DOC", fileName));
        res.setHeader('Content-type', 'text/plain');
        res.charset = 'UTF-8';
    }

    readFile(plyFile, (err, content) => {
        if (err) {
            res.end("Error while parsing PLY file.")
        }

        const loader = new THREE.PLYLoader(true);
        const plyContent = loader.parse(content.buffer, "");
        const hasRgb = plyContent.rgb.length > 0;
        const head = plyContent.header;
        const rgb2int = rgb => rgb[2] + 256 * rgb[1] + 256 * 256 * rgb[0];

        let out = "ply\n";
        out += "format ascii 1.0\n";
        out += "element vertex " + (plyContent.position.length / 3) + "\n";
        out += "property float x\n";
        out += "property float y\n";
        out += "property float z\n";
        
        if (hasRgb)
        {
            out += "property uchar red\n";
            out += "property uchar green\n";
            out += "property uchar blue\n";
        }
        
        out += "property float scalar_material\n";
        out += "property float scalar_damage\n";

        out += "end_header\n";

        res.write(out);
        
        out = "";
        readFile(labelFile, (labelErr, labelContent) => {
            if (labelErr) {
                res.end("Error while parsing labels file.")
            }
            const labels = SseDataWorkerServer.uncompress(labelContent);

            readFile(damageFile, (damageErr, damageContent) => {
                if (damageErr) {
                    res.end("Error while parsing damages file.")
                }
                const damages = SseDataWorkerServer.uncompress(damageContent);
                
                let obj;

                plyContent.position.forEach((v, i) => {
                    const position = Math.floor(i / 3);

                    switch (i % 3) {
                        case 0:
                            if (hasRgb) {
                                obj = {rgb: plyContent.rgb[position], x: v};
                            }else{
                                obj = {x: v};
                            }
                            break;
                        case 1:
                            obj.y = v;
                            break;
                        case 2:
                            obj.z = v;
                            out += obj.x.toFixed(6) + " " + obj.y.toFixed(6) + " " + obj.z.toFixed(6) + " ";
                            if (hasRgb) {
                                out += obj.rgb[0] + " " + obj.rgb[1] + " " + obj.rgb[2] + " ";
                            }
                            out += labels[position] + " ";
                            out += damages[position] + " ";                            
                            out += "\n";
                            res.write(out);
                            out = "";
                            break;
                    }
                });
                res.end()                
            })
        });
    });
}

function saveLabelledPointCloud(req) {
    const plyFile = imagesFolder + decodeURIComponent(req.url);
    const fileName = basename(plyFile);
    const labelFile = pointcloudsFolder + decodeURIComponent(req.url) + ".labels";
    const damageFile = pointcloudsFolder + decodeURIComponent(req.url) + ".damages";    

    readFile(plyFile, (err, content) => {
        if (err) {
            console.log("Error while parsing PLY file.")
        }

        const loader = new THREE.PLYLoader(true);
        const plyContent = loader.parse(content.buffer, "");
        const hasRgb = plyContent.rgb.length > 0;
        const head = plyContent.header;
        const rgb2int = rgb => rgb[2] + 256 * rgb[1] + 256 * 256 * rgb[0];        

        readFile(labelFile, (labelErr, labelContent) => {
            if (labelErr) {
                console.log("Error while parsing labels file.")
            }
            const labels = SseDataWorkerServer.uncompress(labelContent);

            readFile(damageFile, (damageErr, damageContent) => {
                if (damageErr) {
                    console.log("Error while parsing damages file.")
                }
                const damages = SseDataWorkerServer.uncompress(damageContent);
                
                let obj;
                let content = "";
                let vertexNumber = 0;

                plyContent.position.forEach((v, i) => {
                    const position = Math.floor(i / 3);
                    
                    if (labels[position] != 0)
                    {
                        vertexNumber++;

                        switch (i % 3) {
                            case 0:
                                if (hasRgb) {
                                    obj = {rgb: plyContent.rgb[position], x: v};
                                }else{
                                    obj = {x: v};
                                }
                                break;
                            case 1:
                                obj.y = v;
                                break;
                            case 2:
                                obj.z = v;
                                content += obj.x.toFixed(6) + " " + obj.y.toFixed(6) + " " + obj.z.toFixed(6) + " ";
                                if (hasRgb) {
                                    content += obj.rgb[0] + " " + obj.rgb[1] + " " + obj.rgb[2] + " ";
                                }
                                content += labels[position] + " ";
                                content += damages[position] + " ";                            
                                content += "\n";
                                break;
                        }
                    }
                });

                let out = "ply\n";
                out += "format ascii 1.0\n";
                out += "element vertex " + (vertexNumber / 3) + "\n";
                out += "property float x\n";
                out += "property float y\n";
                out += "property float z\n";
                
                if (hasRgb)
                {
                    out += "property uchar red\n";
                    out += "property uchar green\n";
                    out += "property uchar blue\n";
                }
                
                out += "property float scalar_material\n";
                out += "property float scalar_damage\n";

                out += "end_header\n";

                out += content;

                writeFile(plyFile + ".labelled.ply", out, function (err) {
                    if (err){
                        return console.log(err);
                    }
        
                    console.log('Saved ply file.');
                });             
            })
        });        
    });
}
