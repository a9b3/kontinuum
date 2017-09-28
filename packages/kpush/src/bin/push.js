import invariant from 'invariant'
import fs        from 'fs'
import chalk     from 'chalk'

import configure from '../services/configure'
import * as acm  from '../services/acm'

/**
 * Push will deploy a given directory to the given domain.
 *
 * 1. Determine if domain is a root domain.
 * 2. Check if certs exist for root domain and wildcard root domain.
 *    no
 *      - create cert for domain
 *          if root domain
 *            - create cert for root domain
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
}) {
  validateArguments({domain, source})

  const rootDomain = getRootDomain(domain)
  const certDomains = [rootDomain, `*.${rootDomain}`]
  const certs = await Promise.all(certDomains.map(async d => {
    const cert = await acm.getCertForDomain({domain: d})
    if (!cert) {
      await acm.lazilyCreateCert({domain: d})
      log(chalk.yellow(`${d} requested a certificate check your email to confirm.`))
    }
    return cert
  }))
  if (certs.some(cert => !cert)) {
    return
  }
}

function getRootDomain(domain) {
  return domain.length === 2 ? domain.split('.').slice(1).join('.') : domain
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
