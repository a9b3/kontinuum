import AWS           from 'aws-sdk'

import configuration from 'services/configuration'

/**
 * lazilyCreateCert will request a certificate if one does not already exist.
 */
export async function lazilyCreateRootCert({
  rootDomain,
} = {}) {
  const cert = await getCertForRootDomain({rootDomain})
  if (cert) {
    return cert
  }

  return await createCertForRootDomain({rootDomain})
}

/**
 * createCertForRootDomain will request a certificate for the given domain.
 */
export async function createCertForRootDomain({
  rootDomain,
} = {}) {
  const serviceObject = getServiceObject()

  const params = {
    DomainName             : `*.${rootDomain}`,
    SubjectAlternativeNames: [
      rootDomain,
    ],
  }
  return await serviceObject.requestCertificate(params).promise()
}

/**
 * getCertForRootDomain will get the certificate arn for the given domain.
 *
 * @returns {object}
 * { CertificateArn: string, DomainName: string }
 */
export async function getCertForRootDomain({
  rootDomain = '',
} = {}) {
  const certs = await getAllCerts()
  const certsDetail = await Promise.all(certs.map(cert => describeCertificate({ arn: cert.CertificateArn })))
  return certsDetail.filter(detail => detail.SubjectAlternativeNames.includes(rootDomain))[0]
}

export async function describeCertificate({
  arn,
}) {
  const params = {
    CertificateArn: arn,
  }
  const {
    Certificate,
  } = await getServiceObject().describeCertificate(params).promise()
  return Certificate
}

export async function getAllCerts() {
  const {
    CertificateSummaryList,
  } = await getServiceObject().listCertificates().promise()
  return CertificateSummaryList
}

export async function deleteCert({
  arn,
}) {
  const params = {
    CertificateArn: arn,
  }
  return await getServiceObject().deleteCertificate(params).promise()
}


const getServiceObject = (() => {
  let acmServiceObject
  /**
   * getServiceObject will lazily create the ACM service object.
   */
  return function() {
    if (acmServiceObject) {
      return acmServiceObject
    }

    acmServiceObject = new AWS.ACM({
      ...configuration,
      // Only us-east-1 is supported for acm.
      region: 'us-east-1',
    })
    return acmServiceObject
  }
})()
