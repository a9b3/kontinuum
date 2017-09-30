import fs              from 'fs'
import path            from 'path'
import invariant       from 'invariant'
import chalk           from 'chalk'

import * as acm        from 'services/acm'
import * as s3         from 'services/s3'
import * as cloudfront from 'services/cloudfront'

/**
 * Push will deploy a given directory to the given domain.
 *
 * 1. Determine if domain is a root domain.
 * 2. Check if certs exist for root domain and wildcard root domain.
 *    no
 *      - create rootCert for domain
 *          if root domain
 *            - create rootCert for root domain
 *      - exit application
 *    yes
 *      - continue
 * 3. Check if s3 bucket exists.
 *    no
 *      - create s3 bucket for domain
 *    yes
 *      - continue
 *    - upload source to s3 bucket
 * 4. Check if cloudfront distribution exists.
 *    no
 *      - create distribution for domain
 *          if root domain
 *            - create distribution for root domain
 *    yes
 *      - continue
 * 5. Check if route53 record exists for domain
 *
 * @param {!string} domain - Must be in the format of foo.example.com,
 * meaning no bar.foo.example.com or bar.example.com.au
 * @param {!path} source
 */
export default async function push({
  domain,
  source,
  log = console.log,
} = {}) {
  validateArguments({domain, source})

  const rootDomain = getRootDomain(domain)
  const rootCert = await acm.getCertForRootDomain({rootDomain})
  if (!rootCert) {
    await acm.lazilyCreateRootCert({rootDomain})
    log(chalk.yellow(`${rootDomain} requested a certificate, check your email to confirm.`))
    return false
  }
  if (rootCert.Status !== 'ISSUED') {
    log(chalk.red(`${d}'s certificate status isn't issued you might want to delete and
      try again and make sure to validate the email sent to the email associated with your amazon aws account.`))
    return false
  }

  await s3.lazilyCreateSPABucket({domain, log})
  await s3.sync({domain, source: path.resolve(source), log})

  const distribution = await cloudfront.getDistributionGivenDomain({domain})
  if (!distribution) {
    log(`Creating cloudfront distribution for ${domain}`)
    await cloudfront.createDistribution({
      domain,
      arn  : rootCert.CertificateArn,
      alias: domain,
    })
  } else {

  }
}

function getRootDomain(domain) {
  const tokens = domain.split('.')
  return tokens.length === 3 ? tokens.slice(1).join('.') : domain
}

function isRootDomain(domain) {
  return domain.split('.').length === 2
}

function validateArguments({
  domain,
  source,
}) {
  const domainSplitLength = domain.split('.').length
  invariant(domainSplitLength >= 2 && domainSplitLength <= 3, `'domain' must be in this format foo.example.com or example.com`)
  invariant(fs.existsSync(source), `'source' must be a valid file path.`)
}
