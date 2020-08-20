import React from 'react';

import SseToolbar from "../../common/SseToolbar";
import SseImageThumbnail from "../../navigator/SseImageThumbnail";

export default class SseImagesPreview extends SseToolbar {
    constructor() {
        super();
    }

    serverCall(props){
        Meteor.call("cloudData", this.props.imageUrl, (err, res) => {
            this.setState({data: res});
        });
    }

    componentDidMount() {
        super.componentDidMount();           
        this.serverCall(this.props);     
        this.setState({ready: true});
    }

    render() {          
        if (!this.state.ready)
            return null;
        if (this.state.data == undefined)
            return <div></div>
        console.log(this.state.data.images[0]);  
        return (    
            <div className="sse-class-chooser vflex no-shrink scroller">
                <div className="hflex wrap w100 h100">
                {this.state.data.images.map((image) =>
                    (<div onClick={() => { this.sendMsg('setCameraView', image); }}>                    
                        <SseImageThumbnail image={image}/>
                    </div>)
                )}
                </div>
            </div>
        )
    }
}