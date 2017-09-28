import selectCerts from './utils/selectCertificates.js'
import * as acm    from '../services/acm'

export default async function delcerts() {
  const certs = await selectCerts()
  const results = await Promise.all(certs.map(c => acm.deleteCert({ arn: c.CertificateArn })))
}
