import React from 'react';

import Slider from 'rc-slider';
import {
    ArrowCollapseDown, ArrowCollapseLeft, ArrowCollapseRight, ArrowCollapseUp, ArrowExpandDown, Blur, BlurOff,
    Brightness6, CubeSend, ImageFilterTiltShift, Rotate3D, Target, Video, Lightbulb, LightbulbOn
} from 'mdi-material-ui';
import SseToolbar from "../../common/SseToolbar";

export default class SseCameraToolbar extends SseToolbar {
    constructor() {
        super();
        this.state = {
            colorBoostVisible: "none",
            pointSizeVisible: "none",
            showCameraCommands : true,
            showRgbToggle: false
        };
        this.state.data = {
            colorBoost: 0
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.addCommand("viewCameraCommand", "Camera View", false, "C", "view-camera", Video, undefined, undefined);
        this.addCommand("viewFrontCommand", "Front View", false, "F", "view-front", ArrowCollapseUp, undefined, undefined);
        this.addCommand("viewBehindCommand", "Behind View", false, "B", "view-behind", ArrowCollapseDown, undefined, undefined);
        this.addCommand("viewTopCommand", "Top View", false, "T", "view-top", ArrowExpandDown, undefined, undefined);
        this.addCommand("viewLeftCommand", "Left View", false, "L", "view-left", ArrowCollapseLeft, undefined, undefined);
        this.addCommand("viewRightCommand", "Right View", false, "R", "view-right", ArrowCollapseRight, undefined, undefined);
        this.addCommand("viewCenterCommand", "Center View", false, "X", "view-center", Target, undefined, undefined);
        this.addCommand("hullCommand", "Show Hull", false, "H", "show-hull", CubeSend, undefined, undefined);
        this.addCommand("orientationCommand", "Pointcloud Orientation", false, "-", "orientation-change", Rotate3D, undefined, " ");
        this.addCommand("colorBoostCommand", "Color Intensity", 1, "-", "color-boost-toggle", Brightness6, undefined, " ");
        this.addCommand("pointSizeCommand", "Point Size", 1, "-", "point-size-toggle", ImageFilterTiltShift, undefined, " ");
        this.addCommand("distanceAttenuationCommand", "Distance Attenuation", Blur, "", "distance-attenuation", BlurOff, undefined, undefined);
        this.addCommand("rgbCommand", "Toggle RGB", LightbulbOn, "+", "rgb-toggle", Lightbulb, undefined, undefined);

        this.setState({ready: true});

        this.onMsg("show-rgb-toggle", ()=>{
            this.setState({showRgbToggle: true})
        });
        this.onMsg("hide-camera-controls", ()=>{
            this.setState({showCameraCommands: false})
        });
        this.onMsg("show-camera-controls", ()=>{
            this.setState({showCameraCommands: true})
        });
        this.onMsg("color-boost-toggle", () => {
            if (this.state.colorBoostVisible == "none") {
                this.onMsg("mouse-down", () => {
                    this.setState({colorBoostVisible: "none"});
                    this.forgetMsg("mouse-down");
                })
            }
            this.setState({pointSizeVisible: "none"});
            this.setState({colorBoostVisible: this.state.colorBoostVisible == "none" ? "" : "none"});
        });
        this.onMsg("point-size-toggle", () => {
            if (this.state.pointSizeVisible == "none") {
                this.onMsg("mouse-down", () => {
                    this.setState({pointSizeVisible: "none"});
                    this.forgetMsg("mouse-down");
                })
            }
            this.setState({colorBoostVisible: "none"});
            this.setState({pointSizeVisible: this.state.pointSizeVisible == "none" ? "" : "none"});
        });
    }

    dataChange(filterName, dataMsg) {
        return (value) => {
            this.state.data[filterName] = value;
            const obj = {};
            obj[filterName] = value;
            this.setState({data: obj});
            this.sendMsg(dataMsg, {value});
        }
    }


    render() {
        if (!this.state.ready)
            return null;
        const colorBoostSliderStyle =
            {
                display: this.state.colorBoostVisible,
                height: "150px",
                position: "absolute",
                left: "-30px",
                top: "-110px"
            };
        const pointSizeSliderStyle =
            {display: this.state.pointSizeVisible, height: "150px", position: "absolute", left: "-30px", top: "-110px"};

        return (
            <div className="vflex flex-justify-content-space-around sse-toolbar no-shrink">
                <div className="v group">
                    {this.state.showCameraCommands ? this.renderCommand("viewCenterCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewCameraCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewFrontCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewBehindCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewLeftCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewRightCommand"): null}
                    {this.state.showCameraCommands ? this.renderCommand("viewTopCommand"): null}
                </div>
                <div className="grow v group flex-justify-content-end">
                    {this.state.showRgbToggle ? this.renderCommand("rgbCommand") : null}
                    {this.renderCommand("distanceAttenuationCommand")}
                    <div className="relative">
                        {this.renderCommand("pointSizeCommand")
                        }
                        <Slider
                            style={pointSizeSliderStyle}
                            vertical={true}
                            min={0}
                            max={1}
                            step={.05}
                            value={this.state.data.pointSize}
                            onChange={this.dataChange('pointSize', "point-size").bind(this)}
                        />
                    </div>
                    <div
                        className="relative">
                        {this.renderCommand("colorBoostCommand")
                        }
                        <Slider
                            style={colorBoostSliderStyle}
                            vertical={true}
                            min={0}
                            max={1}
                            step={.05}
                            value={this.state.data.colorBoost}
                            onChange={this.dataChange('colorBoost', "color-boost").bind(this)}
                        />
                    </div>
                    {this.renderCommand("orientationCommand")}
                </div>
            </div>
        )
    }
}