import {spawn}       from 'child_process'
import chalk         from 'chalk'
import AWS           from 'aws-sdk'

import configuration from 'services/configuration'

export async function sync({
  source,
  domain,
  log,
} = {}) {
  return new Promise((resolve, reject) => {
    log(`Syncing ${source} with ${domain} s3 bucket`)
    const awsSyncProcess = spawn('aws', ['s3', 'sync', source, `s3://${domain}`, '--delete'])
    awsSyncProcess.stdout.on('data', d => log(d.toString()))
    awsSyncProcess.stderr.on('data', d => log(chalk.red(d.toString())))
    awsSyncProcess.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject()
      }
    })
  })
}

export async function lazilyCreateSPABucket({
  domain,
  log,
}) {
  const doesDomainExist = await domainExists({domain})
  if (doesDomainExist) {
    log(`${domain} s3 bucket already exists.`)
    return
  }

  log(`creating ${domain} s3 bucket.`)
  await makeBucket({domain})
  await putPolicy({domain})
  await putBucketSPAWebsite({domain})
}

async function makeBucket({
  domain,
} = {}) {
  const params = {
    Bucket: domain,
  }
  return await getServiceObject().createBucket(params).promise()
}

async function putPolicy({
  domain,
}) {
  const policy = {
    "Version"  : "2012-10-17",
    "Statement": [
      {
        "Sid"      : "PublicReadGetObject",
        "Effect"   : "Allow",
        "Principal": "*",
        "Action"   : ["s3:GetObject"],
        "Resource" : [`arn:aws:s3:::${domain}/*`],
      },
    ],
  }
  const params = {
    Bucket: domain,
    Policy: JSON.stringify(policy),
  }
  return await getServiceObject().putBucketPolicy(params).promise()
}

async function putBucketSPAWebsite({
  domain,
}) {
  const params = {
    Bucket              : domain,
    WebsiteConfiguration: {
      ErrorDocument: {
        Key: 'index.html',
      },
      IndexDocument: {
        Suffix: 'index.html',
      },
    },
  }
  return await getServiceObject().putBucketWebsite(params).promise()
}

async function domainExists({
  domain,
} = {}) {
  const { Buckets } = await getServiceObject().listBuckets().promise()
  return Buckets.some(b => b.Name === domain)
}

const getServiceObject = (() => {
  let s3ServiceObject
  /**
   * getServiceObject will lazily create the ACM service object.
   */
  return function() {
    if (s3ServiceObject) {
      return s3ServiceObject
    }

    s3ServiceObject = new AWS.S3({
      ...configuration,
    })
    return s3ServiceObject
  }
})()
