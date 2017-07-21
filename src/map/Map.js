import mix from '../utils/mixin'
import {ol, proj4} from '../constants'
import BaseLayers from './baseLayer'
import _Controls from './Controls'
import _Interactions from './Interactions'
import _View from './View'
import Layer from '../layer/Layer'
import Feature from '../feature/feature'
import Style from '../style/Style'
import Overlay from '../overlay/Overlay'
import Observable from '../event/Observable'

class Map extends mix(BaseLayers, _Controls, _Interactions, Style, Layer, _View, Feature, Overlay) {
  constructor () {
    super()
    this.addPointHandlerClick = null
    this.plotDraw = null // 标绘工具
    this.plotEdit = null
    this._lastDrawInteractionGeometry = null
    this.EverntCenter = new Observable()
    proj4.defs('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs')
    ol.proj.setProj4(proj4)
    window.ObservableObj = new ol.Object()

    /**
     * 当前地图线要素
     * @type {Array}
     */
    this.currentMapLines = []
    /**
     * 当前地图点要素
     * @type {Array}
     */
    this.currentMapPoints = []
    /**
     * 当前地图面要素
     * @type {Array}
     */
    this.currentMapPolygon = []
    /**
     * 当前地图线图层
     * @type {Array}
     */
    this.lineLayers = new Set()
    /**
     * 当前地图点图层
     * @type {Array}
     */
    this.pointLayers = new Set()
    /**
     * 当前地图面图层
     * @type {Array}
     */
    this.polygonLayers = new Set()
    /**
     * 周边搜索要素
     * @type {null}
     */
    this.circleSerachFeat = null
    /**
     * 当前地图气泡
     * @type {null}
     */
    this.popupOverlay = null

    /**
     * 当前视图
     * @type {null}
     */
    this.view = null

    /**
     * 定时器
     * @type {null}
     * @private
     */
    this.timer_ = null

    /**
     * map
     * @type {null}
     */
    this.map = null
  }

  /**
   * 初始化当前地图
   * @param mapDiv
   * @param params
   */
  initMap (mapDiv, params) {
    try {
      let options = params || {}
      let options_ = JSON.stringify(options)
      let logo = this._addCopyRight(options['logo'])
      this.view = this._addView(options['view'])
      let layers = this.addBaseLayers(options['baseLayers'], options['view'])
      let interactions = this._addInteractions(options['interactions'])
      let controls = this._addControls(options['controls'])
      /**
       * 当前地图对象
       * @type {ol.Map}
       */
      this.map = new ol.Map({
        target: mapDiv,
        loadTilesWhileAnimating: false,
        loadTilesWhileInteracting: false,
        logo: logo,
        layers: layers,
        view: this.view,
        interactions: interactions,
        controls: controls
      })

      /**
       * 保存当前参数
       */
      this.map.setProperties(options_, false)

      this.map.on('click', event => {
        console.log(event.coordinate)
      })

      /**
       * 加载成功事件
       */
      this.EverntCenter.dispatch('loadMapSuccess', true)
    } catch (error) {
      this.EverntCenter.dispatch('loadMapSuccess', error)
    }
  }

  /**
   * 添加版权信息
   * @returns {boolean}
   * @private
   */
  _addCopyRight (params) {
    let logo = false
    if (params && typeof params !== 'object') {
      logo = {
        href: 'https://aurorafe.github.io',
        src: 'data:image/png;base64,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'
      }
    } else if (typeof params === 'object') {
      logo = params
    } else {
      logo = false
    }
    return logo
  }

  /**
   * 获取当前地图
   * @returns {ol.Map}
   */
  getMap () {
    return this.map
  }

  /**
   * 设置地图实例
   * @param map
   */
  setMap (map) {
    if (map && map instanceof ol.Map) {
      this.map = map
    }
  }

  /**
   * 更新地图
   */
  updateSize () {
    this.map.updateSize()
  }

  /**
   * 地图加载完成事件（超时时间120s）
   * @returns {Promise}
   */
  onMapInit () {
    let that = this
    let start = new Date().getTime()
    return new Promise((resolve) => {
      if (that.map) {
        resolve(true)
      } else {
        let cc = 0
        window.clearInterval(that.timer_)
        that.timer_ = null
        that.timer_ = window.setInterval(() => {
          let end = new Date().getTime()
          cc = ((end - start) / 1000)
          if (that.map && cc <= 120) {
            resolve(true)
            window.clearInterval(that.timer_)
            that.timer_ = null
          }
          if (cc > 120 && !that.map) {
            resolve(false)
            window.clearInterval(that.timer_)
            that.timer_ = null
          }
        }, 50)
      }
    })
  }
}

export default Map
