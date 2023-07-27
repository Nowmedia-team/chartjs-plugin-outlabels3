import { getFontString } from './helpers'
import { FontOptions } from './OutLabelsOptions'
import OutLabelsManager from './OutLabelsManager'

export default class Tooltip {
    ctx: any
    canvas: any
    div: any
    parent: any // HTMLBaseElement ?
    visible: boolean
    region: any
    timeout: number
    identifier: number
    chartId: any

    constructor(
        ctx: any,
        region: any,
        text: string,
        minWidth: number,
        timeout: number,
        chartId: any
    ) {
        this.chartId = chartId
        this.identifier = Math.random()
        this.ctx = ctx
        this.canvas = ctx.canvas
        this.div = document.createElement("div"),
        this.parent = this.canvas.parentNode,
        this.visible = false;
        this.ctx.save()
        const tmp = new FontOptions()
        tmp.size = 14
        tmp.family = 'Akrobat'
        this.ctx.font = getFontString(tmp)
        const calcedWidth = Math.max(ctx.measureText(text).width + 30, minWidth)
        this.ctx.restore()
        this.div.style.cssText = "position: fixed; padding: 7px; font-size: 14px; font-family: 'Akrobat'; color: #F59D24; border-radius: 60px; background-color: #FFFFFF; box-shadow: 0px 4px 4px 0px #00000040; pointer-events: none; width: " + calcedWidth + "px";
        this.div.innerHTML = text;
        this.region = region
        this.timeout = timeout

        window.addEventListener("mousemove", function(this:Tooltip, e:any) {
            this.check(e);
        }.bind(this), false);
        this.canvas.addEventListener("click", function(this:Tooltip, e:any) {
            this.check(e);
        }.bind(this), false);
        window.addEventListener("scroll", function(this:Tooltip, e:any) {
            this.check(e);
        }.bind(this), false);
    }

    updateRegion(region: any): void {
        this.region = region
    }

    show(pos: any): void {
        if (!this.visible) {
            const outLabelsManager = OutLabelsManager.getInstance()
            const allIdentifiers: Array<Number> = []
            const chartOutlabels = outLabelsManager.get(this.chartId)
            if (chartOutlabels) {
                chartOutlabels.forEach((label: any) => {
                    if (label.tooltip)
                        allIdentifiers.push(label.tooltip.identifier)
                })
            }

            if (allIdentifiers.includes(this.identifier)) {
                this.visible = true;
                this.setDivPos(pos);
                this.parent.appendChild(this.div);
                setInterval(function(this:Tooltip) {
                    // this.hide()
                }.bind(this), this.timeout);
            }
        }
    }

    hide(): void {
        this.visible = false;
        this.parent.removeChild(this.div);
    }

    isInside(e: any): boolean {
        const pos = this.getPos(e);
        const isInside = pos.x >= this.region.x &&
            pos.x < this.region.x + this.region.w &&
            pos.y >= this.region.y &&
            pos.y < this.region.y + this.region.h;

        return isInside;
    }

    check(e: any): void {
        const posAbs = { x: e.clientX, y: e.clientY };

        if (!this.visible) {
            if (this.isInside(e)) {
                this.show(posAbs);
            }
        }
        else {
            if (this.isInside(e)) {
                this.setDivPos(posAbs);
            } else {
                this.hide()
            }
        }
    }

    getPos(e: any): any {
        var r = this.canvas.getBoundingClientRect();

        return {x: e.clientX - r.left, y: e.clientY - r.top}
    }

    setDivPos(pos: any): void {
        if (this.visible) {
            if (pos.x < 0) pos.x = 0;
            if (pos.y < 0) pos.y = 0;
            this.div.style.left = pos.x + "px";
            this.div.style.top = pos.y + "px";
        }
    }
}
