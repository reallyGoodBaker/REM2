import { app } from 'electron'
import { join } from 'path'
import db from 'nedb'

const rem2 = join(app.getPath('appData'), 'rem2', 'data')

export const systemDb = new db({
    filename: join(rem2, 'system.db'),
    autoload: true
})