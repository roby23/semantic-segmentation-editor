import React from 'react';
import {Button, Dialog, IconButton} from '@material-ui/core';
import MDI, {ChevronRight, Eye, EyeOff} from 'mdi-material-ui';
import SseGlobals from './SseGlobals';
import SseToolbar from "./SseToolbar";
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

export default class SseDamageChooser extends SseToolbar {

    constructor(props) {
        super();
        this.pendingState.counters = {};
        this.damagesSets = props.damagesSets;
        this.damagesSetByName = new Map();
        this.damagesSets.map(cset => {
            this.damagesSetByName.set(cset.name, cset)
        });
        this.state = {
            counters: {},
            sod: this.damagesSets[0],
            activeDamageIndex: 0
        };
    }

    getIcon(objDesc) {
        if (MDI[objDesc.icon]) {
            return MDI[objDesc.icon]();
        } else {
            return MDI.Label();
        }
    }

    messages() {
        this.onMsg("damageSelection", (arg) => {
            this.setState({activeDamageIndex: arg.descriptor.damageIndex});
        });

        this.onMsg("damageIndex-select", (arg) => {
            this.setState({activeDamageIndex: arg.value});
        });

        this.onMsg("damage-instance-count", arg => {
            this.pendingState.counters[arg.damageIndex] = arg.count;
            this.invalidate();
        });

        this.onMsg("currentSample", (arg) => {
            if (arg.data.sodName)
                this.changeDamagesSet(arg.data.sodName);
        });

        this.onMsg("editor-ready", (arg) => {
            if (arg && arg.value && arg.value.sodName)
                this.sendMsg("active-sod", {value: this.damagesSetByName.get(arg.value.sodName)});
            else
                this.sendMsg("active-sod", {value: this.damagesSets[0]});
        });

        this.onMsg("active-sod", (arg) => {
            this.sod = arg.value;
            this.displayAll();

        });

        this.onMsg("active-sod-name", (arg) => {
            const value = this.damagesSetByName.get(arg.value);
            this.sendMsg("active-sod", {value});
        });

    }

    displayAll() {
        if (this.state) {
            Object.keys(this.state).forEach(k => {
                if (k.toString().startsWith("mute") || k.toString().startsWith("solo")) {
                    delete this.state[k];
                }
            })
        }
    }

    toggleButton(prop, idx) {
        const o = {};
        const p = this.state[prop + idx] || false;
        o[prop + idx] = !p;
        this.setState(o);
    }

    muteOrSolo(name, argument, idx) {
        if (this.state.counters[argument.damagesIndex] ||
            (!this.state.counters[argument.damagesIndex] && this.state[name + idx])) {
            this.toggleButton(name, idx);
            this.sendMsg(name, argument);
        }
    }

    changeDamagesSet(name) {
        const newSod = this.damagesSetByName.get(name);
        const usedDamages = Object.keys(this.state.counters).filter(x => this.state.counters[x] > 0);
        const missing = [];
        usedDamages.forEach(x => {
            if (!newSod.labels.has(x)) {
                missing.push(x);
            }
        });
        //debugger;
        const t = this.state.counters;
        let maxDamageIndex = Math.max(...Object.keys(t).filter(k => t[k] > 0));

        if (newSod.descriptors.length >= maxDamageIndex) {
            this.setState({
                sod: newSod,
                damages: newSod.descriptors,
                mode: "normal",
                activeDamageIndex: 0
            });
            this.sendMsg("active-sod", {value: newSod});

        }
        else
            this.sendMsg("alert",
                {
                    variant: "error",
                    forceCloseMessage: "dismiss-not-enough-damages",
                    message: "This set of damages only supports " + newSod.descriptors.length
                    + " different damages (index from 0 to " + (newSod.descriptors.length - 1) +
                    ") but the current maximum damage index for your data is " + maxDamageIndex
                });
    }

    shouldComponentUpdate(np, ns) {
        if (this.state.mode == "set-chooser" && ns.mode == "normal")
            this.sendMsg("dismiss-not-enough-damages");
        return true;
    }

    renderDialog() {
        return (<Dialog open={this.state.mode == "set-chooser"}>
            <DialogTitle>Sets of Object Damages</DialogTitle>
            <DialogContent>
                <div className="vflex">
                    <span>Choose which set to use:</span>
                    <div className="hflex w100 wrap">
                        {this.damagesSets.map((cset) => (
                            <Button
                                onClick={(e) => this.changeDamagesSet(cset.name)}
                                key={cset.name}>{cset.name + (cset.name == this.state.sod.name ? " (current)" : "")}</Button>
                        ))
                        }
                    </div>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    this.setState({mode: "normal"})
                }} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>)
    }

    initSetChange() {
        this.setState({mode: "set-chooser"});
    }

    render() {
        const smallIconStyle = {width: "25px", height: "25px", color: "darkgray"};
        const smallIconSelected = {width: "25px", height: "25px", color: "red"};
        return (

            <div className="sse-class-chooser vflex scroller"
                 style={{"backgroundColor": "#393536", "padding": "5px 5px 0 0"}}>
                {this.state.sod.descriptors.map((objDesc, idx) => {
                    const isSelected = objDesc.damageIndex == this.state.activeDamageIndex;
                    return <div className="hflex flex-align-items-center no-shrink" key={objDesc.label}>
                        <ChevronRight className="chevron" color={isSelected ? "primary" : "disabled"}/>
                        <Button className="class-button"
                                onDoubleClick={() => this.sendMsg("damage-multi-select", {name: objDesc.label})}
                                onClick={() => {
                                    this.sendMsg('damageSelection', {descriptor: objDesc});
                                }}
                                style={
                                    {
                                        "width": "100%",
                                        "minHeight": "20px",
                                        "margin": "1px",
                                        "backgroundColor": objDesc.color,
                                        "color": SseGlobals.computeTextColor(objDesc.color),
                                        "border": isSelected ? "solid 1px #E53935" : "solid 1px black",
                                        "padding": "0 3px"
                                    }}>
                            <div
                                className="hflex flex-align-items-center w100">
                                {this.getIcon(objDesc)}{objDesc.label}
                            </div>
                            <sup>{this.state.counters[objDesc.damageIndex] > 0 ? this.state.counters[objDesc.damageIndex] : ""}</sup>
                        </Button>
                        {this.props.mode == "3d" ?
                            <div className="hflex">
                                <IconButton
                                    onClick={() => this.muteOrSolo("mute", objDesc, idx)}
                                    style={this.state["mute" + idx] ? smallIconSelected : smallIconStyle}>
                                    <EyeOff/>
                                </IconButton>
                                <IconButton
                                    onClick={() => this.muteOrSolo("solo", objDesc, idx)}
                                    style={this.state["solo" + idx] ? smallIconSelected : smallIconStyle}>
                                    <Eye/>
                                </IconButton>

                            </div> : null}
                    </div>
                })}
                {this.renderDialog()}
            </div>
        );
    }
}