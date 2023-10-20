import { Chart, Plugin } from 'chart.js'
import { resolve } from 'chart.js/helpers'
import { AnyObject } from 'chart.js/types/basic'
import OutLabel from './OutLabel'
import OutLabelsContext from './OutLabelsContext'
import OutLabelsManager from './OutLabelsManager'
import OutLabelsOptions from './OutLabelsOptions'

declare type OutLabelsPlugin = Plugin<'doughnut', AnyObject>

const outLabelsManager = OutLabelsManager.getInstance()

export default {
    id: 'outlabels',
    beforeInit: function (chart) {
        if (['doughnut', 'pie'].includes(chart.config.type) ) {
            outLabelsManager.set(chart.id)
        }
    },
    beforeDatasetUpdate: function (chart: Chart<'doughnut'>, args, options) {
        if (['doughnut', 'pie'].includes(chart.config.type)) {
            outLabelsManager.clean(chart.id)
        }
    },
    afterDatasetUpdate: function (chart: Chart<'doughnut'>, args, options) {
        if (['doughnut', 'pie'].includes(chart.config.type)) {
            const config = Object.assign(new OutLabelsOptions(), options)
            const labels = chart.config.data.labels
            const dataset = chart.data.datasets[args.index]
            const elements = args.meta.data
            const ctx = chart.ctx

            ctx.save()
            let totalAngles = 0
            for (let i = 0; i < elements.length; ++i) {
                const el = elements[i]
                totalAngles += Math.abs(el.endAngle - el.startAngle)
            }
            for (let i = 0; i < elements.length; ++i) {
                const el = elements[i]
                let newLabel = null

                const percent =
                    dataset.data[i] /
                    dataset.data.reduce((sum, current) => sum + current)

                const context = {
                    chart: chart,
                    dataIndex: i,
                    dataset: dataset,
                    labels: labels,
                    datasetIndex: args.index,
                    value: dataset.data[i],
                    percent: percent,
                } as OutLabelsContext

                const prc = Math.abs(el.endAngle - el.startAngle) / totalAngles * 100
                // console.log('outlabels value = ', context.value, ' el - ', el, 'angles ', el.startAngle, ' ',  el.endAngle, ' prc ', prc.toFixed(2))
                const display = resolve([config.display, false], context, i)
                if (display && el && chart.getDataVisibility(args.index) && (!config.maxPrcToShow || prc > config.maxPrcToShow) ) {
                    try {
                        newLabel = new OutLabel(ctx, i, config, context)
                    } catch (e) {
                        console.warn(e)
                        newLabel = null
                    }
                }

                if (newLabel) outLabelsManager.setLabel(chart.id, i, newLabel)
            }

            ctx.restore()
        }
    },
    afterDatasetDraw: function (chart: Chart<'doughnut'>, args, options) {
        if (['doughnut', 'pie'].includes(chart.config.type)) {
            const config = Object.assign(new OutLabelsOptions(), options)
            const display = resolve([config.display, false])
            if (display) {
                const ctx = chart.ctx
                const elements = args.meta.data
                ctx.save()

                const chartOutlabels = outLabelsManager.get(chart.id)
                if (!chartOutlabels) return

                chartOutlabels.forEach(label => {
                    if (typeof elements[label.index] !== 'undefined') {
                        label.positionCenter(elements[label.index]);
                        label.updateRects();
                    }
                })

                if (config.avoidOverlap)
                    outLabelsManager.avoidOverlap(chart, config)

                if (config.fixLabelPositions)
                    outLabelsManager.fixLabelPositions(chart, config)

                chartOutlabels.forEach(label => {
                    if (typeof elements[label.index] !== 'undefined') {
                        label.updateRects();
                        label.draw(chart);
                        if (config.useLines)
                            label.drawLine();
                        if (config.useMarkers)
                            label.drawMarker(chart);
                    }
                })

                ctx.restore()
            }
        }
    },
} as OutLabelsPlugin
