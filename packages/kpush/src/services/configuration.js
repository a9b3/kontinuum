import AWS from 'aws-sdk'

import config from 'config'

export default new AWS.Config({
  accessKeyId    : config.accessKeyId,
  region         : config.region,
  secretAccessKey: config.secretAccessKey,
})
