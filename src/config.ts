/**
 * HA connection + entity ID mapping.
 * All entity IDs sourced live from the HA instance at 192.168.100.50.
 */

/* ---- entity ID registry ---- */
export const HA_ENTITIES = {
  /** 灯光 — 主要照明（排除指示灯） */
  lights: [
    'light.diao_deng',                     // 吊灯
    'light.ke_ting_san_jian_deng_guang',   // 灯带
    'light.ke_ting_san_jian_deng_guang_2', // 筒灯
    'light.wo_shi_ye_deng',               // 卧室夜灯
    'light.men_deng',                     // 门灯
    'light.090615_cn_1004203109_mlig02_s_2', // 射灯冰箱
  ] as string[],

  /** 窗帘 */
  curtains: [
    'cover.dooya_cn_249100562_m1_s_2_curtain',  // 卧室纱帘
    'cover.dooya_cn_249099499_m1_s_2_curtain',  // 客厅窗帘
    'cover.wo_shi_chuang_lian',                 // 卧室窗帘
  ] as string[],

  /** 空调 */
  climate: [
    'climate.xiaomi_cn_696935666_m28',    // 新风Pro
    'climate.xiaomi_cn_584691492_c20',    // 客厅立式空调
  ] as string[],

  /** 新风机（fan domain） */
  fans: [
    'fan.xiaomi_cn_696935666_m28_s_14_air_fresh',   // 新风Pro 新风
    'fan.xiaomi_cn_584691492_c20_s_14_air_fresh',   // 客厅新风
  ] as string[],

  /** 空气净化器 */
  airPurifier: 'switch.zhimi_cn_685334223_rma3_on_p_2_1',

  /** 天气 */
  weather: 'weather.he_feng_tian_qi',

  /** 室内环境传感器 — 精确匹配 */
  env: {
    /** 卧室温度计 */
    indoorTemp: 'sensor.miaomiaoc_cn_blt_3_18f9a6nrs5c00_t1_temperature_p_2_1',
    /** 卧室湿度 */
    indoorHumidity: 'sensor.miaomiaoc_cn_blt_3_18f9a6nrs5c00_t1_relative_humidity_p_2_2',
    /** 净化器 PM2.5 */
    indoorPm25: 'sensor.zhimi_cn_685334223_rma3_pm2_5_density_p_3_4',
    /** 净化器温度 */
    purifierTemp: 'sensor.zhimi_cn_685334223_rma3_temperature_p_3_7',
    /** 净化器湿度 */
    purifierHumidity: 'sensor.zhimi_cn_685334223_rma3_relative_humidity_p_3_1',
    /** 室外温度 */
    outdoorTemp: 'sensor.heweather_heweather_temperature_123_3258_41_7500',
    /** 室外湿度 */
    outdoorHumidity: 'sensor.heweather_heweather_humidity_123_3258_41_7500',
    /** 室外 PM2.5 */
    outdoorPm25: 'sensor.heweather_heweather_pm25_123_3258_41_7500',
  },

  /** 人员 */
  person: 'person.alex',

  /** 门锁 */
  lock: {
    doorState: 'sensor.lumi_wbmcn1_3826_door_state',        // stuck = locked
    armedState: 'binary_sensor.lumi_wbmcn1_3826_armed_state', // off = disarmed
    battery: 'sensor.lumi_wbmcn1_3826_battery_level',
  },

  /** 媒体播放器 */
  mediaPlayers: [
    'media_player.xiaomi_cn_425911845_lx06',                 // 逆子
    'media_player.home_assistant_voice_091502_media_player',  // NABU
    'media_player.samsung_soundbar_q900a',                   // 回音壁
  ] as string[],

  /** 扫地机 */
  vacuum: 'vacuum.dreame_cn_466294907_p2027',
} as const

export type HaState = {
  entity_id: string
  state: string
  attributes: Record<string, any>
}

export type ForecastDay = {
  datetime: string
  condition: string
  text: string
  temperature: number
  templow: number
}

export type ThemeMode = 'warm' | 'charcoal' | 'auto'
export type PanelKey = 'weather' | 'climate' | 'lights' | 'curtains' | 'air' | 'summary' | 'music'

export const SCENE_LABELS = [
  { id: 'home', label: '回家', icon: '🏠' },
  { id: 'away', label: '离家', icon: '🚪' },
  { id: 'cinema', label: '观影', icon: '🎬' },
  { id: 'sleep', label: '睡眠', icon: '🌙' },
  { id: 'dining', label: '用餐', icon: '🍽️' },
  { id: 'all_off', label: '全关', icon: '⭕' },
] as const

export const WEATHER_ICON: Record<string, string> = {
  'clear-night': '🌙', 'cloudy': '☁️', 'fog': '🌫️', 'hail': '🌨️',
  'lightning': '⛈️', 'lightning-rainy': '⛈️', 'partlycloudy': '⛅',
  'pouring': '🌧️', 'rainy': '🌧️', 'snowy': '❄️', 'snowy-rainy': '🌨️',
  'sunny': '☀️', 'windy': '💨', 'windy-variant': '💨', 'exceptional': '⚠️',
}

export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
