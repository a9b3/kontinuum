import chalk from 'chalk'

import selectCerts from 'bin/utils/selectCertificates'
import * as acm    from 'services/acm'

export default async function delcerts() {
  const certs = await selectCerts()
  await Promise.all(certs.map(c => acm.deleteCert({ arn: c.CertificateArn })))
  console.log(chalk.green('Removed the selected certs'))
}
