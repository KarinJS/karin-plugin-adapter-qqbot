import './core/index'
import Jimp from 'jimp'
import { logger, common } from 'node-karin'
import { basename, dirPath } from './utils/dir'

const pkg = common.readJson(dirPath + '/package.json')
logger.info(`${logger.violet(`[插件:${pkg.version}]`)} ${logger.green(basename)} 初始化完成~`)

export default Jimp
