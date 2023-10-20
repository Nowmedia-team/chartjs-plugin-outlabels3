import { Chart } from 'chart.js'
import OutLabel from './OutLabel'

export default class OutLabelsManager {
    labels: Map<string, Map<number, OutLabel>> = new Map()
    fixCnt: number = 0
    fixLimitCnt: number = 100
    private static instance: OutLabelsManager;

    public static getInstance(): OutLabelsManager {
        if (!OutLabelsManager.instance) {
            OutLabelsManager.instance = new OutLabelsManager();
        }

        return OutLabelsManager.instance;
    }

    set(id: string): void {
        this.labels.set(id, new Map())
    }

    get(id: string): Map<number, OutLabel> | undefined {
        return this.labels.get(id)
    }

    clean(id: string): void {
        this.labels.set(id, new Map())
    }

    setLabel(id: string, number: number, label: OutLabel): void {
        const labels = this.get(id)
        if (!labels) return

        labels?.set(number, label)
    }

    private adjustQuadrant(list: OutLabel[]): boolean {
        if (list.length < 2) {
            return false
        }

        list.sort((i1, i2) => i1.rect.y - i2.rect.y)

        let lastPos = 0
        let adjusted = false
        const shifts = []
        let totalShifts = 0

        for (let i = 0; i < list.length; i++) {
            const item = list[i]
            const rect = item.rect
            // eslint-disable-next-line prefer-const
            let delta = rect.y - lastPos
            if (delta < 0) {
                rect.y -= delta
                item.y -= delta
                adjusted = true
            }
            const shift = Math.max(-delta, 0)
            shifts.push(shift)
            totalShifts += shift

            lastPos = rect.y + item.rect.height
        }

        if (totalShifts > 0) {
            // Shift back to make the distribution more equally.
            const delta = -totalShifts / list.length
            if (delta !== 0) adjusted = true

            for (let i = 0; i < list.length; i++) {
                const item = list[i]
                const rect = item.rect
                rect.y += delta
                item.rect.y += delta
            }
        }

        return adjusted
    }

    private recalculateX(chart: Chart<'doughnut'>, list: OutLabel[]) {
        if (list.length < 1) return

        const cx = (chart.chartArea.left + chart.chartArea.right) / 2
        const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2
        const r = list[0].arc.outerRadius
        const dir = list[0].nx < 0 ? -1 : 1

        let maxY = 0
        let rB = 0

        list.forEach(item => {
            const dy = Math.abs(item.rect.y - cy)
            if (dy > maxY) {
                const dx = item.rect.x - cx
                const rA = r + item.length
                rB =
                    Math.abs(dx) < rA
                        ? Math.sqrt((dy * dy) / (1 - (dx * dx) / rA / rA))
                        : rA
                maxY = dy
                // console.log('rB == rA', rB == rA);

            }
        })

        const rB2 = rB * rB
        list.forEach(item => {
            const dy = Math.abs(item.rect.y - cy)
            // horizontal r is always same with original r because x is not changed.
            const rA = r + item.length
            const rA2 = rA * rA
            // Use ellipse implicit function to calculate x
            const dx = Math.sqrt(Math.abs((1 - Math.abs((dy * dy) / rB2)) * rA2)) // added Math.abs (else NaN)
            // console.log('abs rA2 rB2 dy / dx  dir ', Math.abs((1 - Math.abs((dy * dy) / rB2)) * rA2), rA2, ' ', rB2, ' ', dy, ' / ', dx, ' ', dir);

            const newX = cx + dx * dir
            // console.log('text x cx dx dir newX: r: ', item.text, item.x, cx, dx, dir, newX, r);

            item.x = newX
        })
    }

    avoidOverlap(chart: Chart<'doughnut'>, config: any): void {
        const labels = this.get(chart.id)
        if (labels) {
            const cx = (chart.chartArea.left + chart.chartArea.right) / 2
            const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2

            const topLeftList: OutLabel[] = []
            const topRightList: OutLabel[] = []
            const bottomLeftList: OutLabel[] = []
            const bottomRightList: OutLabel[] = []

            labels.forEach(label => {
                if (label.x < cx) {
                    if (label.y < cy) topLeftList.push(label)
                    else bottomLeftList.push(label)
                } else {
                    if (label.y < cy) topRightList.push(label)
                    else bottomRightList.push(label)
                }
            })

            // console.log('avoidOverlap only adjusts topLeftList ');
            // console.log('topLeftList', topLeftList);
            // console.log('topRightList', topRightList);
            // console.log('bottomLeftList', bottomLeftList);
            // console.log('bottomRightList', bottomRightList);

            if (this.adjustQuadrant(topLeftList) && config.recalculateX)
                this.recalculateX(chart, topLeftList)

            if (this.adjustQuadrant(topRightList))
                this.recalculateX(chart, topRightList)

            if (this.adjustQuadrant(bottomLeftList))
                this.recalculateX(chart, bottomLeftList)

            if (this.adjustQuadrant(bottomRightList))
                this.recalculateX(chart, bottomRightList)
        }
    }

    fixLabelPositions(chart: Chart<'doughnut'>, config: any): void {
        console.log('fixLabelPositions')
        const labels = this.get(chart.id)
        if (!labels) {
            return
        }

        const foundIntersections: OutLabel[][] = []
        labels.forEach((item, i) => {
            labels.forEach((cmpitem, j) => {
                if (i === j) {
                    return
                }
                if (this.intersects(item, cmpitem)) {
                    foundIntersections.push([item, cmpitem])
                }
          })
        })
        console.log('foundIntersections', foundIntersections)
        let fixPair: OutLabel[] = []
        foundIntersections.forEach(pair => {
          let highItem = pair[0].y <= pair[1].y ? pair[0] : pair[1]
          let fixHighItem = fixPair.length ? (fixPair[0].y <= fixPair[1].y ? fixPair[0] : fixPair[1]) : undefined
          if (fixPair.length === 0 || (typeof fixHighItem !== 'undefined' && highItem.y < fixHighItem.y)) {
            fixPair = pair
          }
        })
        if (fixPair.length) {
            const cx = (chart.chartArea.left + chart.chartArea.right) / 2
            const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2
            const item = fixPair[0]
            const cmpitem = fixPair[1]
            let highItem = item.y <= cmpitem.y ? item : cmpitem
            let lowItem = item.y <= cmpitem.y ? cmpitem : item
            const rect: any = this.intersectingRect(item, cmpitem)

            const isTopSector = highItem.y < cy
            const isLeftSector = highItem.x < cx
            // labels.forEach(label => {
            //     if (label.x < cx) {
            //         if (label.y < cy) topLeftList.push(label)
            //         else bottomLeftList.push(label)
            //     } else {
            //         if (label.y < cy) topRightList.push(label)
            //         else bottomRightList.push(label)
            //     }
            // })
            let ydiff = rect.h * 0.90
            let xdiff = rect.w * 0.10
            if (isTopSector) {
                highItem.y = highItem.y - ydiff
                if (isLeftSector) {
                    highItem.x = highItem.x - xdiff;
                } else {
                    highItem.x = highItem.x + xdiff;
                }
            } else {
                lowItem.y = lowItem.y + ydiff
                if (isLeftSector) {
                    highItem.x = highItem.x - xdiff;
                } else {
                    highItem.x = highItem.x + xdiff;
                }
            }
        }
        this.fixCnt++
        if (foundIntersections.length && this.fixCnt < this.fixLimitCnt) {
            this.fixLabelPositions(chart, config)
        }
    }

    intersects(a: OutLabel, b: OutLabel): boolean {
        const ax1 = a.x + a.rect.width
        const ay1 = a.y + a.rect.height
        const bx1 = b.x + b.rect.width
        const by1 = b.y + b.rect.height

        return !( ax1 < b.x || ay1 < b.y || a.x > bx1 || a.y > by1 );
    }

    intersectingRect(a: OutLabel, b: OutLabel): object {
        var x = Math.max(a.x, b.x);
        var y = Math.max(a.y, b.y);
        var xx = Math.min(a.x + a.rect.width, b.x + b.rect.width);
        var yy = Math.min(a.y + a.rect.height, b.y + b.rect.height);

        return ({x: x, y: y, w: xx - x, h: yy - y});
    }
}
