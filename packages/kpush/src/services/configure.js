import AWS from 'aws-sdk'

import config from '../config'

export default function configure() {
  const awsConfig = new AWS.Config({
    accessKeyId    : config.accessKeyId,
    region         : config.region,
    secretAccessKey: config.secretAccessKey,
  })
}
