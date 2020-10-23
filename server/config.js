import {Meteor} from "meteor/meteor";
import {join} from "path";
import {mkdirSync, existsSync} from "fs";
import os from "os";
import download from "download";

const configurationFile = {};
const defaultClasses = [{
    "name": "Materiali",
    "objects": [
      {
        "label": "Nessuno", 
        "color": "#FFFFFF"          
      },
      {
        "label": "Lapidei naturali", 
        "color": "#FF8800"
      },
      {
        "label": "Aggregati artificiali",
        "color": "#CFCFCF"
      },
      {
        "label": "Organici naturali",
        "color": "#799024"
      },
      {
        "label": "Metalli",
        "color": "#FAFFF5"
      },
      {
        "label": "Materiali sintetici",
        "color": "#9E9BFF"
      }
    ]
  }];
const defaultDamages = [{
    "name": "Danni", "objects": [
        {"label": "Nessuno", "color": "#CFCFCF"},
        {"label": "Muffa", "color": "#804080"},
        {"label": "Umidita'", "color": "#F423E8"}
    ]
}];
const init = ()=> {
    try {
        const config = Meteor.settings;

        if (config.configuration && config.configuration["images-folder"] != "") {
            configurationFile.imagesFolder = config.configuration["images-folder"].replace(/\/$/, "");
        }else{
            configurationFile.imagesFolder = join(os.homedir(), "sse-images");
        }

        if (!existsSync(configurationFile.imagesFolder)){
            mkdirSync(configurationFile.imagesFolder);
            download("https://raw.githubusercontent.com/Hitachi-Automotive-And-Industry-Lab/semantic-segmentation-editor/master/private/samples/bitmap_labeling.png", configurationFile.imagesFolder);
            download("https://raw.githubusercontent.com/Hitachi-Automotive-And-Industry-Lab/semantic-segmentation-editor/master/private/samples/pointcloud_labeling.pcd", configurationFile.imagesFolder);
        }

        if (config.configuration && config.configuration["internal-folder"] != "") {
            configurationFile.pointcloudsFolder = config.configuration["internal-folder"].replace(/\/$/, "");
        }else{

            configurationFile.pointcloudsFolder = join(os.homedir(), "sse-internal");
        }

        configurationFile.setsOfClassesMap = new Map();
        configurationFile.setsOfClasses = config["sets-of-classes"];
        if (!configurationFile.setsOfClasses){
            configurationFile.setsOfClasses = defaultClasses;
        }
        configurationFile.setsOfClasses.forEach(o => configurationFile.setsOfClassesMap.set(o.name, o));

        configurationFile.setsOfDamagesMap = new Map();
        configurationFile.setsOfDamages = config["sets-of-damages"];
        if (!configurationFile.setsOfDamages){
            configurationFile.setsOfDamages = defaultDamages;
        }
        configurationFile.setsOfDamages.forEach(o => configurationFile.setsOfDamagesMap.set(o.name, o));

        console.log("Semantic Segmentation Editor");
        console.log("Images (JPG, PNG, PCD) served from", configurationFile.imagesFolder);
        console.log("PCD binary segmentation data stored in", configurationFile.pointcloudsFolder);
        console.log("Number of available sets of object classes:", configurationFile.setsOfClasses.length);
        console.log("Number of available sets of object damages:", configurationFile.setsOfDamages.length);
        return configurationFile;
    }catch(e){
        console.error("Error while parsing settings.json:", e);
    }
};
export default init();
